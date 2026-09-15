import { spliceVideos, type PlacedVideo } from '../../render/spliceVideos';
import type { Template02Content } from './template02.schema';

export interface Template02RenderInput {
  content: Template02Content;
  /** imageId -> resolved image src (a data URI or download URL), for the one optional feature image. */
  imageSrcById: Record<string, string>;
  /** Raw, already-rendered gallery HTML, or null if no gallery was selected. */
  galleryHtml: string | null;
  /** Rendered video blocks to splice between steps. */
  videos?: PlacedVideo[];
}

/**
 * Turns validated model content into the plain object the Handlebars
 * template renders against. Step numbering and the drop-cap flag on the
 * first step are computed here — never in the .hbs source and never by
 * the model.
 */
export function prepareTemplate02Context(input: Template02RenderInput): Record<string, unknown> {
  const { content, imageSrcById, galleryHtml, videos = [] } = input;

  // Numbered before splicing, so a video between steps doesn't take a number.
  const numberedSteps = content.steps.map((step, i) => ({
    ...step,
    stepNumberLabel: String(i + 1).padStart(2, '0'),
    isFirst: i === 0,
  }));
  const steps = spliceVideos(numberedSteps, () => true, videos);

  const featureImage = content.featureImage
    ? {
        ...content.featureImage,
        src: imageSrcById[content.featureImage.imageId] ?? null,
      }
    : null;

  return {
    title: content.title,
    dek: content.dek,
    category: content.category,
    readTimeLabel: `${content.readTimeMinutes} min`,
    client: content.client,
    featureImage,
    lede: content.lede,
    steps,
    closing: content.closing,
    cta: content.cta,
    galleryPlacement: content.galleryPlacement,
    galleryHtml: galleryHtml ?? '',
  };
}
