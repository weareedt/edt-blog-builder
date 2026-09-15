import type { ArticleImage } from '../article';
import type { GalleryCaptionMode, GalleryId } from '../types';
import type { GalleryAccordionContent } from './galleryAccordion.schema';
import type { GalleryFlipcardsAlternatingContent } from './galleryFlipcardsAlternating.schema';

export class NotEnoughGalleryImagesError extends Error {
  constructor(
    public readonly uploaded: number,
    public readonly required: number
  ) {
    super(
      `This gallery needs at least ${required} photos, but ${uploaded} ${
        uploaded === 1 ? 'was' : 'were'
      } uploaded.`
    );
  }
}

export interface BuildGalleryFromImagesInput {
  galleryId: GalleryId;
  /** Must be 'none' or 'manual' — 'auto' is the model's job, not this one's. */
  mode: Exclude<GalleryCaptionMode, 'auto'>;
  images: ArticleImage[];
  itemMin: number;
  itemMax: number;
}

/**
 * Builds a gallery's content object directly from the uploaded photos, with
 * no Anthropic call at all.
 *
 * This is the whole point of the 'none' and 'manual' caption modes: a
 * gallery is a fixed sequence of photos, and the only genuinely generative
 * part of it was ever the caption text. When the user doesn't want captions
 * written for them, there's nothing left to generate — so we skip the
 * second `generateStructuredContent` call entirely. That removes a per-
 * article API cost, removes a schema-validation failure mode, and removes
 * any possibility of a photo being captioned with a real project name it
 * has nothing to do with.
 *
 * Photo order is upload order, which is also the order shown in the brief
 * form — so what the user arranged is what renders.
 */
export function buildGalleryContentFromImages(
  input: BuildGalleryFromImagesInput
): GalleryAccordionContent | GalleryFlipcardsAlternatingContent {
  const { galleryId, mode, images, itemMin, itemMax } = input;

  if (images.length < itemMin) {
    throw new NotEnoughGalleryImagesError(images.length, itemMin);
  }

  // Trailing photos beyond the gallery's ceiling still reach the article
  // body as inline images — they're just not panels.
  const used = images.slice(0, itemMax);

  // `caption`/`captionDetail` only mean anything in 'manual' mode; in
  // 'none' every field is null regardless of what was typed, so switching
  // a gallery to image-only hides the captions without discarding them.
  const captionOf = (image: ArticleImage) =>
    mode === 'manual'
      ? { caption: nonEmpty(image.caption), detail: nonEmpty(image.captionDetail) }
      : { caption: null, detail: null };

  switch (galleryId) {
    case 'gallery-accordion':
      return {
        items: used.map((image) => {
          const { caption, detail } = captionOf(image);
          // `tag` has no manual equivalent — it's a categorising pill, and
          // asking for a third field per photo isn't worth the form noise.
          return { imageId: image.id, tag: null, title: caption, metric: detail };
        }),
      };
    case 'gallery-flipcards-alternating':
      return {
        items: used.map((image) => {
          const { caption, detail } = captionOf(image);
          // Likewise `projectLine`: it exists to credit a real project, and
          // a user who wants that can simply type it into the detail field.
          return { imageId: image.id, label: caption, body: detail, projectLine: null };
        }),
      };
  }
}

/** Treats whitespace-only user input as absent, so it renders image-only rather than as a blank line. */
function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
