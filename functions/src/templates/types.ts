export type CategoryId = 'Guides' | 'Case Studies' | 'Products' | 'Insights';

export const CATEGORY_IDS: CategoryId[] = ['Guides', 'Case Studies', 'Products', 'Insights'];

export type TemplateId =
  | 'template-01-case-study-roundup'
  | 'template-02-longform-numbered-steps'
  | 'template-03-standard-article-toc'
  | 'template-04-basic-scroll';

export type GalleryId = 'gallery-accordion' | 'gallery-flipcards-alternating';

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
  structureNotes: string;
}

export interface GalleryDefinition extends GalleryStaticMeta {
  templateVersion: string;
}
