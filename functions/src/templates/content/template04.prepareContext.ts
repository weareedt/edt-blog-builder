import { spliceVideos, type PlacedVideo } from '../../render/spliceVideos';
import type { Template04Content } from './template04.schema';

export interface Template04RenderInput {
  content: Template04Content;
  /** imageId -> resolved image src (a data URI or download URL), for the one optional feature image. */
  imageSrcById: Record<string, string>;
  /** Raw, already-rendered gallery HTML, or null if no gallery was selected. */
  galleryHtml: string | null;
  /** Rendered video blocks to splice between sections. */
  videos?: PlacedVideo[];
}

/**
 * Turns validated model content into the plain object the Handlebars
 * template renders against. The drop-cap flag on the first section is
 * computed here — never in the .hbs source and never by the model.
 */
export function prepareTemplate04Context(input: Template04RenderInput): Record<string, unknown> {
  const { content, imageSrcById, galleryHtml, videos = [] } = input;

  let sawFirstSection = false;
  const bodyItems = content.bodyItems.map((item) => {
    if (item.type === 'section') {
      const isFirstSection = !sawFirstSection;
      sawFirstSection = true;
      return { ...item, isFirstSection };
    }
    return item;
  });

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
    bodyItems: spliceVideos(bodyItems, (item) => item.type === 'section', videos),
    closing: content.closing,
    cta: content.cta,
    galleryPlacement: content.galleryPlacement,
    galleryHtml: galleryHtml ?? '',
  };
}
