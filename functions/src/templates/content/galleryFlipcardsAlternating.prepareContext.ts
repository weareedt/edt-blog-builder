import type { GalleryFlipcardsAlternatingContent } from './galleryFlipcardsAlternating.schema';

export interface GalleryFlipcardsAlternatingRenderInput {
  content: GalleryFlipcardsAlternatingContent;
  /** imageId -> resolved image src (a data URI or download URL). */
  imageSrcById: Record<string, string>;
}

/**
 * Turns validated gallery content into the plain object the gallery's
 * Handlebars template renders against — resolving each item's imageId to
 * an actual `src` and computing the back-of-card index tag ("01 — Label")
 * from the item's position, so the .hbs stays a thin, declarative
 * presentation layer, same as gallery-accordion's.
 */
export function prepareGalleryFlipcardsAlternatingContext(
  input: GalleryFlipcardsAlternatingRenderInput
): Record<string, unknown> {
  const { content, imageSrcById } = input;

  const items = content.items.map((item, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      ...item,
      src: imageSrcById[item.imageId] ?? '',
      // The index tag reads "01 — VR Training", but the label is nullable,
      // so fall back to the bare number rather than rendering "01 — ".
      indexTag: item.label ? `${number} — ${item.label}` : number,
    };
  });

  return { items };
}
