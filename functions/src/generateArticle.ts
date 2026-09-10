import './admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { templateRegistry, galleryRegistry } from './templates/generated/registry';
import { buildPrompt } from './prompt/buildPrompt';
import { buildImageContentBlocks } from './prompt/visionBlocks';
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
import { prepareTemplate03Context } from './templates/content/template03.prepareContext';
import type { Template03Content } from './templates/content/template03.schema';
import { prepareGalleryAccordionContext } from './templates/content/galleryAccordion.prepareContext';
import type { GalleryAccordionContent } from './templates/content/galleryAccordion.schema';
import type { ArticleDoc, ArticleErrorCode } from './templates/article';
import type { GalleryPlacement } from './templates/types';

const PROMPT_VERSION = 'p1';
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

    // v1 supports only template-03 — the other 3 templates land in Phase 4.
    if (article.templateId !== 'template-03-standard-article-toc') {
      return fail('UNKNOWN', `Template "${article.templateId}" is not yet supported.`);
    }
    const templateEntry = templateRegistry['template-03-standard-article-toc'];

    const galleryEntry =
      article.galleryId === 'gallery-accordion' ? galleryRegistry['gallery-accordion'] : null;
    if (article.galleryId && !galleryEntry) {
      return fail('UNKNOWN', `Gallery "${article.galleryId}" is not yet supported.`);
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

    try {
      // ---- 1. Content generation (or fixture, for zero-cost dev) ----
      let templateContent: Template03Content;
      let galleryContent: GalleryAccordionContent | null = null;
      let usage: UsageTotals = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

      if (USE_FIXTURE_CONTENT) {
        templateContent = templateEntry.schema.parse(templateEntry.exampleContent);
        if (galleryEntry) {
          galleryContent = galleryEntry.schema.parse(galleryEntry.exampleContent);
          // Fixture content ships with fixed imageId's (img-1..img-6) that
          // won't generally match whatever was actually seeded for a local
          // test — remap by position rather than requiring an exact match,
          // since fixture mode's whole point is not depending on that.
          galleryContent = {
            items: galleryContent.items
              .slice(0, article.images.length)
              .map((item, i) => ({ ...item, imageId: article.images[i].id })),
          };
        }
      } else {
        const imageBlocks = await buildImageContentBlocks(article.images);
        const { system, stableContent, briefContent } = buildPrompt({
          brief: article.brief,
          category: article.category,
          angle: article.angle,
          keyPoints: article.keyPoints,
          templateStructureNotes: templateEntry.meta.structureNotes,
          templateExampleContent: templateEntry.exampleContent,
          galleryStructureNotes: galleryEntry?.meta.structureNotes ?? null,
          galleryExampleContent: galleryEntry?.exampleContent ?? null,
          requestedGalleryPlacement: requestedPlacement,
          supportedGalleryPlacements: templateEntry.meta.supportedGalleryPlacements,
          imageCount: article.images.length,
        });

        const userContent = [...stableContent, ...imageBlocks, ...briefContent];

        const articleResult = await generateStructuredContent({
          system,
          userContent,
          schema: templateEntry.schema,
          toolName: 'submit_article_content',
        });
        templateContent = articleResult.content;
        usage = mergeUsage(usage, articleResult.usage);

        if (galleryEntry) {
          // Constrain imageId to the images actually uploaded for THIS
          // request — a hallucinated or mistyped id then fails Zod
          // validation and goes through generateStructuredContent's
          // existing one-retry corrective loop, rather than silently
          // resolving to an empty <img src> at render time.
          const uploadedImageIds = new Set(article.images.map((img) => img.id));
          const strictGallerySchema = galleryEntry.schema.refine(
            (content) => content.items.every((item) => uploadedImageIds.has(item.imageId)),
            { message: `Every imageId must be one of the uploaded images: ${[...uploadedImageIds].join(', ')}` }
          );

          const galleryResult = await generateStructuredContent({
            system,
            userContent,
            schema: strictGallerySchema,
            toolName: 'submit_gallery_content',
          });
          galleryContent = galleryResult.content;
          usage = mergeUsage(usage, galleryResult.usage);
        }
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
      let galleryHtml: string | null = null;
      let resolvedGalleryPlacement: GalleryPlacement | null = null;

      if (galleryEntry && galleryContent) {
        const galleryImageSrcById = await inlineImages(article.images);
        const galleryContext = prepareGalleryAccordionContext({
          content: galleryContent,
          imageSrcById: galleryImageSrcById,
        });
        galleryHtml = renderArticle(galleryEntry.hbsSource, galleryContext);
        resolvedGalleryPlacement = requestedPlacement ?? templateContent.galleryPlacement;
      }

      const templateContext = prepareTemplate03Context({
        // Safe: resolvedGalleryPlacement is only ever set to a value drawn
        // from requestedPlacement (already checked against this template's
        // supportedGalleryPlacements above) or the model's own — Zod-
        // validated against this same narrower enum — galleryPlacement.
        content: {
          ...templateContent,
          galleryPlacement: resolvedGalleryPlacement as Template03Content['galleryPlacement'],
        },
        galleryHtml,
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
      const message = err instanceof Error ? err.message : 'Unknown error.';
      return fail('UNKNOWN', message);
    }
  }
);
