import type { GalleryAccordionContent } from './galleryAccordion.schema';

export interface GalleryAccordionRenderInput {
  content: GalleryAccordionContent;
  /** imageId -> resolved image src (a data URI or download URL). */
  imageSrcById: Record<string, string>;
}

/**
 * Turns validated gallery content into the plain object the gallery's
 * Handlebars template renders against — resolving each item's imageId to
 * an actual `src` and marking the first item `isDefault` (the accordion's
 * CSS opens on whichever panel carries `data-default="true"`), so the .hbs
 * stays a thin, declarative presentation layer, same as template03's.
 */
export function prepareGalleryAccordionContext(
  input: GalleryAccordionRenderInput
): Record<string, unknown> {
  const { content, imageSrcById } = input;

  const items = content.items.map((item, index) => ({
    ...item,
    src: imageSrcById[item.imageId] ?? '',
    isDefault: index === 0,
    // Every caption field is independently nullable, so the .hbs needs to
    // know whether to emit the `.cap` overlay at all — an empty one still
    // paints its gradient scrim and reserves space over the photo.
    hasCaption: Boolean(item.tag || item.title || item.metric),
    alt: item.alt ?? '',
  }));

  return { items, intro: content.intro ?? null };
}
