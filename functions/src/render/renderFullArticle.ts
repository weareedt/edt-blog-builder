import { templateRegistry, galleryRegistry } from '../templates/generated/registry';
import { countSections } from '../prompt/editorialReview';
import { prepareTemplate01Context } from '../templates/content/template01.prepareContext';
import { prepareTemplate02Context } from '../templates/content/template02.prepareContext';
import { prepareTemplate03Context } from '../templates/content/template03.prepareContext';
import { prepareTemplate04Context } from '../templates/content/template04.prepareContext';
import { prepareGalleryAccordionContext } from '../templates/content/galleryAccordion.prepareContext';
import { prepareGalleryFlipcardsAlternatingContext } from '../templates/content/galleryFlipcardsAlternating.prepareContext';
import { renderArticle } from './renderArticle';
import { renderVideoBlock, renderVideoStyles } from './videoBlock';
import { placeInterlude, type PlacedInsert } from './spliceInserts';
import type { ArticleVideo } from '../templates/article';
import type { GalleryId, GalleryPlacement, TemplateId } from '../templates/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// One entry per templateRegistry key, normalizing each template's own
// prepareContext signature (they differ — template-03 takes no images,
// the rest do) to a single shape this module can call generically.
// `content` is typed `any` deliberately: each function already knows, from
// its own schema import, exactly which shape it expects — callers only ever
// supply content that already parsed against that same template's schema.
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

export interface RenderFullArticleInput {
  templateId: TemplateId;
  galleryId: GalleryId | null;
  /** Validated, repaired template content (see editorialReview). */
  templateContent: any;
  /** Validated gallery content, or null when no gallery was selected. */
  galleryContent: any | null;
  /** imageId -> src. Data URIs for the download, Storage URLs for the site. */
  imageSrcById: Record<string, string>;
  videos: ArticleVideo[];
  requestedGalleryPlacement: GalleryPlacement | null;
}

export interface RenderFullArticleResult {
  /** The rendered template fragment: its own <title>, <style>, markup and scripts. */
  fragment: string;
  resolvedGalleryPlacement: GalleryPlacement | null;
}

/**
 * Renders a complete article fragment from validated content.
 *
 * Shared by generation and publishing so the two can't drift: the same
 * gallery placement, the same video interlude positions, the same rhythm
 * rules. The only difference between the downloadable file and the published
 * page is what `imageSrcById` holds — base64 data URIs for a self-contained
 * download, Storage URLs for a page on the site.
 */
export function renderFullArticle(input: RenderFullArticleInput): RenderFullArticleResult {
  const { templateId, galleryId, templateContent, galleryContent, imageSrcById, videos } = input;
  const templateEntry = templateRegistry[templateId];
  const galleryEntry = galleryId ? galleryRegistry[galleryId] : null;

  const requestedPlacement =
    input.requestedGalleryPlacement &&
    templateEntry.meta.supportedGalleryPlacements.includes(input.requestedGalleryPlacement)
      ? input.requestedGalleryPlacement
      : null;

  let galleryHtml: string | null = null;
  let resolvedGalleryPlacement: GalleryPlacement | null = null;

  if (galleryEntry && galleryContent) {
    const galleryContext = prepareGalleryContextByGalleryId[galleryId as GalleryId]({
      content: galleryContent,
      imageSrcById,
    });
    galleryHtml = renderArticle(galleryEntry.hbsSource, galleryContext);
    // A selected gallery must render somewhere: if neither the user nor the
    // model placed it, it goes mid-article rather than vanishing.
    resolvedGalleryPlacement =
      requestedPlacement ??
      templateContent.galleryPlacement ??
      (templateEntry.meta.supportedGalleryPlacements.includes('mid-article')
        ? 'mid-article'
        : templateEntry.meta.supportedGalleryPlacements[0]);
  }

  // A fixed video placement is resolved here; 'auto' takes the section Claude
  // chose, adjusted by placeInterlude so it reads as a break between groups of
  // sections. The video stylesheet rides along with the first video only.
  const sectionCount = countSections(templateId, templateContent);
  const inserts: PlacedInsert[] = [];
  for (const video of videos) {
    const source =
      video.kind === 'embed'
        ? { kind: 'embed' as const, url: video.url }
        : { kind: 'upload' as const, downloadUrl: video.downloadUrl, contentType: video.contentType };
    const block = renderVideoBlock({
      id: video.id,
      source,
      caption: video.caption,
      eyebrow: templateContent.videoIntro?.eyebrow ?? null,
      // A caption already explains the video; a line above it would only repeat it.
      intro: video.caption ? null : (templateContent.videoIntro?.line ?? null),
    });
    if (!block) continue;
    const afterSection =
      video.placement === 'after-intro'
        ? 0
        : video.placement === 'before-closing'
          ? Number.MAX_SAFE_INTEGER
          : placeInterlude(templateContent.videoAfterSection, sectionCount);
    inserts.push({ html: inserts.length === 0 ? `${renderVideoStyles()}\n${block}` : block, afterSection });
  }

  let templateGalleryHtml = galleryHtml;
  if (galleryHtml && resolvedGalleryPlacement === 'mid-article') {
    let afterSection = placeInterlude(templateContent.galleryAfterSection, sectionCount);
    // Don't stack the gallery directly against a video.
    if (inserts.some((insert) => insert.afterSection === afterSection)) {
      afterSection = afterSection < sectionCount ? afterSection + 1 : Math.max(0, afterSection - 1);
    }
    inserts.push({ html: galleryHtml, afterSection });
    templateGalleryHtml = null;
  }

  const templateContext = prepareContextByTemplateId[templateId]({
    // Safe: resolvedGalleryPlacement only ever holds a value drawn from
    // requestedPlacement (already checked against this template's
    // supportedGalleryPlacements), the model's own Zod-validated
    // galleryPlacement, or supportedGalleryPlacements itself.
    content: { ...templateContent, galleryPlacement: resolvedGalleryPlacement },
    imageSrcById,
    galleryHtml: templateGalleryHtml,
    inserts,
  });

  return {
    fragment: renderArticle(templateEntry.hbsSource, templateContext),
    resolvedGalleryPlacement,
  };
}
