import './admin';
import type { z } from 'zod';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { templateRegistry, galleryRegistry } from './templates/generated/registry';
import { buildPrompt } from './prompt/buildPrompt';
import { buildImageContentBlocks } from './prompt/visionBlocks';
import {
  countSections,
  repairArticleContent,
  reviewArticleContent,
  reviewGalleryContent,
} from './prompt/editorialReview';
import {
  generateStructuredContent,
  SchemaValidationError,
  ModelRefusalError,
} from './anthropic/generateContent';
import { ANTHROPIC_MODEL } from './anthropic/client';
import { renderArticle } from './render/renderArticle';
import { wrapDocument } from './render/wrapDocument';
import { inlineImages, PayloadTooLargeError } from './render/inlineImages';
import { slugify } from './render/slugify';
import { renderVideoBlock, renderVideoStyles } from './render/videoBlock';
import type { PlacedInsert } from './render/spliceInserts';
import { prepareTemplate01Context } from './templates/content/template01.prepareContext';
import { prepareTemplate02Context } from './templates/content/template02.prepareContext';
import { prepareTemplate03Context } from './templates/content/template03.prepareContext';
import { prepareTemplate04Context } from './templates/content/template04.prepareContext';
import { prepareGalleryAccordionContext } from './templates/content/galleryAccordion.prepareContext';
import { prepareGalleryFlipcardsAlternatingContext } from './templates/content/galleryFlipcardsAlternating.prepareContext';
import {
  buildGalleryContentFromImages,
  NotEnoughGalleryImagesError,
} from './templates/content/galleryFromImages';
import type { ArticleDoc, ArticleErrorCode } from './templates/article';
import type {
  GalleryCaptionMode,
  GalleryPlacement,
  TemplateId,
  GalleryId,
} from './templates/types';

// One entry per templateRegistry key, normalizing each template's own
// prepareContext signature (they differ — template-03 takes no images,
// the rest do) to a single shape generateArticle can call generically.
// `content` is typed `any` here deliberately: each function already knows,
// from its own schema import, exactly which shape it expects — the
// generateArticle caller only ever supplies content that already parsed
// against that same template's schema.
const prepareContextByTemplateId: Record<
  TemplateId,
  (input: {
    content: any;
    imageSrcById: Record<string, string>;
    galleryHtml: string | null;
    inserts: PlacedInsert[];
  }) => Record<string, unknown>
> = {
  'template-01-case-study-roundup': ({ content, imageSrcById, galleryHtml, inserts }) =>
    prepareTemplate01Context({ content, imageSrcById, galleryHtml, inserts }),
  'template-02-longform-numbered-steps': ({ content, imageSrcById, galleryHtml, inserts }) =>
    prepareTemplate02Context({ content, imageSrcById, galleryHtml, inserts }),
  'template-03-standard-article-toc': ({ content, galleryHtml, inserts }) =>
    prepareTemplate03Context({ content, galleryHtml, inserts }),
  'template-04-basic-scroll': ({ content, imageSrcById, galleryHtml, inserts }) =>
    prepareTemplate04Context({ content, imageSrcById, galleryHtml, inserts }),
};

const prepareGalleryContextByGalleryId: Record<
  GalleryId,
  (input: { content: any; imageSrcById: Record<string, string> }) => Record<string, unknown>
> = {
  'gallery-accordion': ({ content, imageSrcById }) => prepareGalleryAccordionContext({ content, imageSrcById }),
  'gallery-flipcards-alternating': ({ content, imageSrcById }) =>
    prepareGalleryFlipcardsAlternatingContext({ content, imageSrcById }),
};

/** Templates with a dedicated hero photo slot (featureImage). */
const TEMPLATES_WITH_HERO: TemplateId[] = ['template-02-longform-numbered-steps', 'template-04-basic-scroll'];

// p2: story-first editorial rules, the review/repair pass, hero photos,
// gallery intros and placement between sections, video interludes.
const PROMPT_VERSION = 'p2';
const USE_FIXTURE_CONTENT =
  process.env.USE_FIXTURE_CONTENT === '1' || process.env.USE_FIXTURE_CONTENT === 'true';

type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

function mergeUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

export const generateArticle = onCall(
  { timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const { articleId } = (request.data ?? {}) as { articleId?: string };
    if (!articleId || typeof articleId !== 'string') {
      throw new HttpsError('invalid-argument', 'articleId is required.');
    }

    const db = getFirestore();
    const docRef = db.collection('articles').doc(articleId);
    const uid = request.auth.uid;

    // Transactional status claim — the double-generate guard. Rejects a
    // second concurrent call (e.g. a double-clicked Generate button) rather
    // than racing two generations against the same document.
    const article = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Article not found.');
      const data = snap.data() as ArticleDoc;
      if (data.createdBy !== uid) {
        throw new HttpsError('permission-denied', 'Not your article.');
      }
      if (data.status !== 'draft' && data.status !== 'failed') {
        throw new HttpsError('failed-precondition', `Article is already ${data.status}.`);
      }
      tx.update(docRef, { status: 'generating', updatedAt: FieldValue.serverTimestamp() });
      return data;
    });

    const startedAt = Date.now();

    async function fail(errorCode: ArticleErrorCode, errorMessage: string): Promise<never> {
      await docRef.update({
        status: 'failed',
        errorCode,
        errorMessage,
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError('internal', errorMessage);
    }

    const templateEntry = templateRegistry[article.templateId];
    if (!templateEntry) {
      return fail('UNKNOWN', `Template "${article.templateId}" is not supported.`);
    }

    const galleryEntry = article.galleryId ? galleryRegistry[article.galleryId] : null;
    if (article.galleryId && !galleryEntry) {
      return fail('UNKNOWN', `Gallery "${article.galleryId}" is not supported.`);
    }

    // A placement the user requested only counts if this template actually
    // supports it — otherwise silently fall through to the model's own
    // choice rather than injecting a value the .hbs template's placement
    // check can't match (which would make the gallery silently not render).
    const requestedPlacement: GalleryPlacement | null =
      article.requestedGalleryPlacement &&
      templateEntry.meta.supportedGalleryPlacements.includes(article.requestedGalleryPlacement)
        ? article.requestedGalleryPlacement
        : null;

    // Same defensive shape as requestedPlacement: a mode this gallery can't
    // render (or an absent one, on docs predating the field) falls back to
    // the gallery's own default rather than rendering something broken.
    const captionMode: GalleryCaptionMode | null = galleryEntry
      ? article.galleryCaptionMode &&
        galleryEntry.meta.supportedCaptionModes.includes(article.galleryCaptionMode)
        ? article.galleryCaptionMode
        : galleryEntry.meta.defaultCaptionMode
      : null;

    // The hero photo is only honoured on a template that has a hero slot, and
    // only if it's really one of this article's images. It never also
    // appears in the gallery.
    const heroImageId =
      article.heroImageId &&
      TEMPLATES_WITH_HERO.includes(article.templateId) &&
      article.images.some((img) => img.id === article.heroImageId)
        ? article.heroImageId
        : null;
    const galleryImages = article.images.filter((img) => img.id !== heroImageId);
    const reviewContext = { brief: article.brief, angle: article.angle, keyPoints: article.keyPoints };

    try {
      // ---- 1. Content generation (or fixture, for zero-cost dev) ----
      // Untyped here deliberately: the concrete shape differs per
      // templateId/galleryId, and every consumer below (persistence,
      // prepareContextByTemplateId/prepareGalleryContextByGalleryId) either
      // treats it opaquely or already knows, from its own schema import,
      // exactly which shape to expect.
      let templateContent: any;
      let galleryContent: any = null;
      let usage: UsageTotals = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

      if (galleryEntry && captionMode !== 'auto') {
        // 'none' / 'manual' — no Anthropic call for the gallery, in fixture
        // mode or not. See buildGalleryContentFromImages.
        galleryContent = buildGalleryContentFromImages({
          galleryId: article.galleryId as GalleryId,
          mode: captionMode as Exclude<GalleryCaptionMode, 'auto'>,
          images: galleryImages,
          itemMin: galleryEntry.meta.itemMin,
          itemMax: galleryEntry.meta.itemMax,
          intro: article.galleryIntro ?? null,
        });
      }

      if (USE_FIXTURE_CONTENT) {
        templateContent = templateEntry.schema.parse(templateEntry.exampleContent);
        if (heroImageId && templateContent.featureImage) {
          templateContent = { ...templateContent, featureImage: { ...templateContent.featureImage, imageId: heroImageId } };
        }
        if (galleryEntry && captionMode === 'auto') {
          galleryContent = galleryEntry.schema.parse(galleryEntry.exampleContent);
          // Fixture content ships with fixed imageId's (img-1..img-6) that
          // won't generally match whatever was actually seeded for a local
          // test — remap by position rather than requiring an exact match,
          // since fixture mode's whole point is not depending on that.
          galleryContent = {
            ...galleryContent,
            items: (galleryContent.items as Array<Record<string, unknown>>)
              .slice(0, galleryImages.length)
              .map((item, i) => ({ ...item, imageId: galleryImages[i].id })),
          };
        }
      } else {
        const galleryNeedsModel = Boolean(galleryEntry) && captionMode === 'auto';

        const imageBlocks = await buildImageContentBlocks(article.images, heroImageId);
        const { system, stableContent, briefContent } = buildPrompt({
          brief: article.brief,
          category: article.category,
          angle: article.angle,
          keyPoints: article.keyPoints,
          templateStructureNotes: templateEntry.meta.structureNotes,
          templateExampleContent: templateEntry.promptExampleContent,
          galleryStructureNotes: galleryNeedsModel ? galleryEntry!.meta.structureNotes : null,
          galleryExampleContent: galleryNeedsModel ? galleryEntry!.promptExampleContent : null,
          gallerySelected: Boolean(galleryEntry),
          requestedGalleryPlacement: requestedPlacement,
          supportedGalleryPlacements: templateEntry.meta.supportedGalleryPlacements,
          imageCount: article.images.length,
          heroImageId,
          galleryImageIds: galleryImages.map((img) => img.id),
          galleryIntroProvided: Boolean(article.galleryIntro),
          videos: (article.videos ?? []).map((v) => ({ caption: v.caption, placement: v.placement })),
        });

        const userContent = [...stableContent, ...imageBlocks, ...briefContent];

        // With a chosen hero, a featureImage that isn't that photo fails
        // validation and goes through the corrective retry.
        const templateSchema = (
          heroImageId
            ? (templateEntry.schema as unknown as z.ZodType<{ featureImage: { imageId: string } | null }>).refine(
                (content) => content.featureImage?.imageId === heroImageId,
                { message: `featureImage must be set, with imageId ${heroImageId} (the hero photo the user chose).` }
              )
            : templateEntry.schema
        ) as z.ZodTypeAny;

        const articleResult = await generateStructuredContent({
          system,
          userContent,
          schema: templateSchema,
          toolName: 'submit_article_content',
          review: (content) => reviewArticleContent(article.templateId, content, reviewContext),
        });
        templateContent = articleResult.content;
        usage = mergeUsage(usage, articleResult.usage);
        if (articleResult.reviewIssues.length > 0) {
          logger.info('generateArticle editorial issues remained after retry', {
            articleId,
            issues: articleResult.reviewIssues,
          });
        }

        if (galleryNeedsModel) {
          // Constrain imageId to the gallery's own photos — a hallucinated
          // id, or the hero photo, then fails Zod validation and goes
          // through generateStructuredContent's one-retry corrective loop,
          // rather than silently resolving to an empty <img src> at render.
          const allowedImageIds = new Set(galleryImages.map((img) => img.id));
          // Both gallery schemas share this shape; widened to a single
          // concrete ZodType so `.refine` resolves to one signature instead
          // of a union of incompatible overloads.
          const gallerySchema = galleryEntry!.schema as unknown as z.ZodType<{
            items: Array<{ imageId: string }>;
          }>;
          const strictGallerySchema = gallerySchema.refine(
            (content) => content.items.every((item) => allowedImageIds.has(item.imageId)),
            { message: `Every imageId must be one of the gallery photos: ${[...allowedImageIds].join(', ')}` }
          );

          const galleryResult = await generateStructuredContent({
            system,
            userContent,
            schema: strictGallerySchema,
            toolName: 'submit_gallery_content',
            review: (content) => reviewGalleryContent(article.galleryId as GalleryId, content),
          });
          galleryContent = galleryResult.content;
          usage = mergeUsage(usage, galleryResult.usage);
        }
      }

      // Deterministic fixes, whatever the model returned — see editorialReview.ts.
      templateContent = repairArticleContent(article.templateId, templateContent, reviewContext);
      if (galleryContent && article.galleryIntro) {
        galleryContent = { ...galleryContent, intro: article.galleryIntro };
      }

      // Persist BEFORE rendering — a render bug is then fixable (or
      // re-renderable after a template fix) without re-billing generation.
      // Stored as a JSON string, not a native nested object: Firestore
      // rejects an array directly containing another array (which
      // comparisonTable's `rows: string[][]` is), and structuredContent is
      // only ever read back whole for re-rendering/debugging — nothing
      // queries into its fields, so there's no cost to opaque-ing it.
      await docRef.update({
        structuredContent: JSON.stringify({ template: templateContent, gallery: galleryContent }),
        model: ANTHROPIC_MODEL,
        promptVersion: PROMPT_VERSION,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // ---- 2. Render ----
      // Computed once and shared between the gallery and the main template
      // body — both draw imageIds from the same uploaded article.images.
      const imageSrcById = article.images.length > 0 ? await inlineImages(article.images) : {};

      let galleryHtml: string | null = null;
      let resolvedGalleryPlacement: GalleryPlacement | null = null;

      if (galleryEntry && galleryContent) {
        const galleryContext = prepareGalleryContextByGalleryId[article.galleryId as GalleryId]({
          content: galleryContent,
          imageSrcById,
        });
        galleryHtml = renderArticle(galleryEntry.hbsSource, galleryContext);
        // A selected gallery must render somewhere: if neither the user nor
        // the model placed it, it goes mid-article rather than vanishing.
        resolvedGalleryPlacement =
          requestedPlacement ??
          templateContent.galleryPlacement ??
          (templateEntry.meta.supportedGalleryPlacements.includes('mid-article')
            ? 'mid-article'
            : templateEntry.meta.supportedGalleryPlacements[0]);
      }

      // ---- Inserts: videos and a between-sections gallery ----
      // A fixed video placement is resolved here; 'auto' takes the section
      // Claude chose, falling back to after the first section (e.g. fixture
      // mode, whose example content never sets it). The video stylesheet
      // rides along with the first video only — see renderVideoStyles.
      const sectionCount = countSections(article.templateId, templateContent);
      const inserts: PlacedInsert[] = [];
      (article.videos ?? []).forEach((video) => {
        const source =
          video.kind === 'embed'
            ? { kind: 'embed' as const, url: video.url }
            : { kind: 'upload' as const, downloadUrl: video.downloadUrl, contentType: video.contentType };
        const block = renderVideoBlock({
          id: video.id,
          source,
          caption: video.caption,
          eyebrow: templateContent.videoIntro?.eyebrow ?? null,
          intro: templateContent.videoIntro?.line ?? null,
        });
        if (!block) return;
        const afterSection =
          video.placement === 'after-intro'
            ? 0
            : video.placement === 'before-closing'
              ? Number.MAX_SAFE_INTEGER
              : (templateContent.videoAfterSection ?? 1);
        inserts.push({ html: inserts.length === 0 ? `${renderVideoStyles()}\n${block}` : block, afterSection });
      });

      let templateGalleryHtml = galleryHtml;
      if (galleryHtml && resolvedGalleryPlacement === 'mid-article') {
        let afterSection = templateContent.galleryAfterSection ?? Math.ceil(sectionCount / 2);
        // Don't stack the gallery directly against a video.
        if (inserts.some((insert) => insert.afterSection === afterSection)) {
          afterSection = afterSection < sectionCount ? afterSection + 1 : Math.max(0, afterSection - 1);
        }
        inserts.push({ html: galleryHtml, afterSection });
        templateGalleryHtml = null;
      }

      const templateContext = prepareContextByTemplateId[article.templateId]({
        // Safe: resolvedGalleryPlacement is only ever set to a value drawn
        // from requestedPlacement (already checked against this template's
        // supportedGalleryPlacements above), the model's own — Zod-validated
        // against this same narrower enum — galleryPlacement, or a value
        // taken from supportedGalleryPlacements itself.
        content: { ...templateContent, galleryPlacement: resolvedGalleryPlacement },
        imageSrcById,
        galleryHtml: templateGalleryHtml,
        inserts,
      });
      const fragment = renderArticle(templateEntry.hbsSource, templateContext);

      const { title, dek } = templateContent;
      const doc = wrapDocument({ title, description: dek, bodyHtml: fragment });
      const slug = slugify(title);

      // ---- 3. Upload output (never inlined into Firestore — see D6/1MiB note) ----
      const outputPath = `users/${uid}/articles/${articleId}/output.html`;
      const bucket = getStorage().bucket();
      await bucket.file(outputPath).save(Buffer.from(doc, 'utf8'), { contentType: 'text/html' });

      await docRef.update({
        status: 'ready',
        title,
        dek,
        slug,
        coverImageId: heroImageId ?? article.coverImageId ?? null,
        outputHtmlStoragePath: outputPath,
        outputSizeBytes: Buffer.byteLength(doc, 'utf8'),
        resolvedGalleryPlacement,
        promptVersion: PROMPT_VERSION,
        templateVersion: templateEntry.meta.templateVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        status: 'ready' as const,
        storagePath: outputPath,
        generationDurationMs: Date.now() - startedAt,
        usage,
      };
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        // The user-facing message can't usefully say *what* was wrong —
        // but that detail matters a lot for diagnosing a real prompt/schema
        // mismatch, so it goes to the function's own logs instead.
        logger.error('generateArticle schema validation failed', {
          articleId,
          templateId: article.templateId,
          issues: err.issues,
          stopReason: err.stopReason,
          outputTokens: err.outputTokens,
        });
        return fail(
          'SCHEMA_VALIDATION_FAILED',
          "The model's output did not match the required structure after one retry."
        );
      }
      if (err instanceof ModelRefusalError) {
        return fail('MODEL_ERROR', err.message);
      }
      if (err instanceof PayloadTooLargeError) {
        return fail('PAYLOAD_TOO_LARGE', err.message);
      }
      if (err instanceof NotEnoughGalleryImagesError) {
        // The brief form already enforces this before submit, so reaching
        // here means photos were removed after the draft was created.
        return fail('UNKNOWN', err.message);
      }
      const message = err instanceof Error ? err.message : 'Unknown error.';
      return fail('UNKNOWN', message);
    }
  }
);
