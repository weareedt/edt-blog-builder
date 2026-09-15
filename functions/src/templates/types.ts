export type CategoryId = 'Guides' | 'Case Studies' | 'Products' | 'Insights';

export const CATEGORY_IDS: CategoryId[] = ['Guides', 'Case Studies', 'Products', 'Insights'];

export type TemplateId =
  | 'template-01-case-study-roundup'
  | 'template-02-longform-numbered-steps'
  | 'template-03-standard-article-toc'
  | 'template-04-basic-scroll';

export type GalleryId = 'gallery-accordion' | 'gallery-flipcards-alternating';

/**
 * Where a gallery's per-photo caption text comes from.
 *
 * `auto` is the only mode that costs an Anthropic call. It was also the
 * only mode that existed originally, and it is what produced captions
 * naming real EDT projects over unrelated stock photos — the model had a
 * known-projects list, a schema demanding a title per panel, and no way to
 * say "this photo isn't one of those." `manual` and `none` remove the
 * model from the loop entirely rather than trying to prompt around that.
 */
export type GalleryCaptionMode =
  /** No caption text at all — the photo carries the panel on its own. */
  | 'none'
  /** Caption text comes from what the user typed against each photo. */
  | 'manual'
  /** Claude writes the captions from the photo it can actually see. */
  | 'auto';

export const GALLERY_CAPTION_MODES: GalleryCaptionMode[] = ['none', 'manual', 'auto'];

/** Where a gallery may be spliced into a given template's body. */
export type GalleryPlacement = 'after-intro' | 'mid-article' | 'before-cta' | 'end-of-article';

export interface ImageBudget {
  /** Inline images the template body can accommodate, excluding gallery images. */
  minInline: number;
  maxInline: number;
  /** Images consumed by a gallery component, if one is inserted. */
  galleryMin: number;
  galleryMax: number;
  /** Prose hint fed to Claude and shown in the picker UI. */
  note: string;
}

/**
 * The hand-authored, static half of a template's definition — everything
 * except `templateVersion`, which is derived from the .hbs source content
 * at load time (by the generated registry) rather than hand-maintained,
 * so it can never silently go stale when the annotated template changes.
 */
export interface TemplateStaticMeta {
  id: TemplateId;
  label: string;
  blurb: string;
  supportedGalleryPlacements: GalleryPlacement[];
  images: ImageBudget;
  /**
   * Prose describing the structural vocabulary and its ranges. Fed verbatim
   * into the prompt. Written in terms of ranges and judgement, never counts.
   */
  structureNotes: string;
}

export interface TemplateDefinition extends TemplateStaticMeta {
  templateVersion: string;
}

export interface GalleryStaticMeta {
  id: GalleryId;
  label: string;
  blurb: string;
  itemMin: number;
  itemMax: number;
  /**
   * Caption modes this gallery can actually render. Not every gallery can
   * do without text: the flip-cards' whole mechanic is that the back of
   * the card holds the caption, so a card with nothing on the back flips
   * to a blank face — 'none' is therefore not offered for that one.
   */
  supportedCaptionModes: GalleryCaptionMode[];
  /** Used when the article doesn't specify one. Must appear in supportedCaptionModes. */
  defaultCaptionMode: GalleryCaptionMode;
  structureNotes: string;
}

export interface GalleryDefinition extends GalleryStaticMeta {
  templateVersion: string;
}
