// Mirrors functions/src/templates/types.ts and article.ts. There's no
// shared workspace between app/ and functions/ in this build, so these are
// kept in sync by hand — a small, explicit duplication rather than a build
// config for a two-package repo. If they drift, generateArticle's own Zod
// validation is the backstop (a malformed doc simply fails to generate).

export type CategoryId = 'Guides' | 'Case Studies' | 'Products' | 'Insights';

export const CATEGORY_IDS: CategoryId[] = ['Guides', 'Case Studies', 'Products', 'Insights'];

export type TemplateId =
  | 'template-01-case-study-roundup'
  | 'template-02-longform-numbered-steps'
  | 'template-03-standard-article-toc'
  | 'template-04-basic-scroll';

export type GalleryId = 'gallery-accordion' | 'gallery-flipcards-alternating';

export type GalleryPlacement = 'after-intro' | 'mid-article' | 'before-cta' | 'end-of-article';

/** Where a gallery's per-photo caption text comes from. See functions/src/templates/types.ts. */
export type GalleryCaptionMode = 'none' | 'manual' | 'auto';

export type ArticleStatus = 'draft' | 'generating' | 'ready' | 'failed';

export type ArticleErrorCode =
  | 'SCHEMA_VALIDATION_FAILED'
  | 'MODEL_ERROR'
  | 'TIMEOUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RENDER_FAILED'
  | 'UNKNOWN';

export interface ArticleImage {
  id: string;
  kind: 'image';
  storagePath: string;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  /** A hint to Claude about this photo. Never rendered. */
  userNote: string | null;
  /** Literal caption text, rendered verbatim when galleryCaptionMode is 'manual'. */
  caption: string | null;
  /** The second caption line — the accordion's detail, the flip-card's back. */
  captionDetail: string | null;
}

export type VideoPlacement = 'auto' | 'after-intro' | 'before-closing';

/** An editorial heading above a gallery, e.g. "The work, up close" + one line. */
export interface GalleryIntro {
  eyebrow: string;
  line: string | null;
}

/** Mirrors ArticleVideo in functions/src/templates/article.ts. */
export type ArticleVideo = {
  id: string;
  caption: string | null;
  placement: VideoPlacement;
} & (
  | { kind: 'embed'; url: string }
  | { kind: 'upload'; storagePath: string; downloadUrl: string; contentType: string; bytes: number }
);

export interface ArticleDoc {
  id: string;
  createdBy: string;

  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateId: TemplateId;
  galleryId: GalleryId | null;
  /** Null (or absent, on older docs) means the gallery's own default. */
  galleryCaptionMode: GalleryCaptionMode | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  resolvedGalleryPlacement: GalleryPlacement | null;
  images: ArticleImage[];
  /** Absent on docs predating video support. */
  videos?: ArticleVideo[];
  /** The photo uploaded as the hero, for templates with a hero slot. Never reused in the gallery. */
  heroImageId?: string | null;
  /** Editorial heading above the gallery, typed by the user. */
  galleryIntro?: GalleryIntro | null;

  title: string | null;
  dek: string | null;
  slug: string | null;
  coverImageId: string | null;
  templateLabel: string;
  categoryLabel: CategoryId;

  status: ArticleStatus;
  errorCode: ArticleErrorCode | null;
  errorMessage: string | null;
  // The rendered article lives in Cloud Storage, not inline here — base64
  // -inlined images can push a rendered article past Firestore's 1MiB
  // per-document limit. This doc only holds a pointer.
  outputHtmlStoragePath: string | null; // users/{uid}/articles/{articleId}/output.html
  outputSizeBytes: number | null;
  promptVersion: string | null;
  templateVersion: string | null;

  rootArticleId: string;
  regeneratedFromArticleId: string | null;

  createdAt: unknown; // Firestore Timestamp — typed loosely to avoid an SDK-type import here
  updatedAt: unknown;
}

export interface TemplateCatalogEntry {
  id: TemplateId;
  label: string;
  blurb: string;
  /** e.g. "3 to 12 project entries" — shown in the picker per §9.2 (range-based, never an exact count). */
  structureRangeLabel: string;
  minImages: number;
  maxImages: number;
  imagesNote: string;
  supportsGallery: boolean;
  /** Has a dedicated hero photo slot near the top (the feature image). */
  hasHeroImage: boolean;
  supportedGalleryPlacements: GalleryPlacement[];
}

export interface GalleryCatalogEntry {
  id: GalleryId;
  label: string;
  blurb: string;
  itemMin: number;
  itemMax: number;
  /** Caption modes this gallery can render — the flip-cards can't do 'none'. */
  supportedCaptionModes: GalleryCaptionMode[];
  defaultCaptionMode: GalleryCaptionMode;
}

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = [
  {
    id: 'template-01-case-study-roundup',
    label: 'Project Roundup',
    blurb: 'A roundup of project entries, each with a media panel framed as an OS window, tags, a blurb, and a stat line.',
    structureRangeLabel: '3 to 12 project entries',
    minImages: 0,
    maxImages: 12,
    imagesNote: 'Each entry can carry one photo. An entry without one simply skips the photo panel — that is normal for this template.',
    supportsGallery: true,
    hasHeroImage: false,
    supportedGalleryPlacements: ['after-intro', 'mid-article', 'end-of-article'],
  },
  {
    id: 'template-02-longform-numbered-steps',
    label: 'Step-by-Step Deep Dive',
    blurb: 'One idea told as a numbered sequence — steps, lessons, principles, examples or projects — with an optional hero photo and occasional highlights.',
    structureRangeLabel: '3 to 8 numbered steps',
    minImages: 0,
    maxImages: 1,
    imagesNote: 'At most one hero photo, shown near the top. Upload it with the hero photo field; it is kept separate from gallery photos.',
    supportsGallery: true,
    hasHeroImage: true,
    supportedGalleryPlacements: ['after-intro', 'mid-article', 'before-cta'],
  },
  {
    id: 'template-03-standard-article-toc',
    label: 'In-Depth Guide',
    blurb: 'A sticky TOC with scrollspy, prose sections, an optional comparison table and callout.',
    structureRangeLabel: '3 to 9 sections',
    minImages: 0,
    maxImages: 0,
    imagesNote: 'This template shows photos through an inserted gallery component, not inline images.',
    supportsGallery: true,
    hasHeroImage: false,
    supportedGalleryPlacements: ['mid-article', 'before-cta'],
  },
  {
    id: 'template-04-basic-scroll',
    label: 'Flowing Deep Dive',
    blurb: 'A single deep-dive story told as a flat scroll of labelled sections — the same story format as long-form numbered steps, without the step numbering.',
    structureRangeLabel: '3 to 8 sections',
    minImages: 0,
    maxImages: 1,
    imagesNote: 'At most one hero photo, shown near the top. Upload it with the hero photo field; it is kept separate from gallery photos.',
    supportsGallery: true,
    hasHeroImage: true,
    supportedGalleryPlacements: ['after-intro', 'mid-article', 'before-cta'],
  },
];

export const GALLERY_CATALOG: GalleryCatalogEntry[] = [
  {
    id: 'gallery-accordion',
    label: 'Accordion gallery',
    blurb: 'Horizontal panels that expand on hover, each optionally captioned.',
    itemMin: 3,
    itemMax: 8,
    supportedCaptionModes: ['none', 'manual', 'auto'],
    defaultCaptionMode: 'none',
  },
  {
    id: 'gallery-flipcards-alternating',
    label: 'Flip-card gallery',
    blurb: 'Cards that flip on click or hover: the photo and project on the front, the insight behind it on the back.',
    itemMin: 3,
    itemMax: 8,
    // No 'none': the back of the card is the caption, so a card with no
    // text flips over to a blank face.
    supportedCaptionModes: ['manual', 'auto'],
    defaultCaptionMode: 'auto',
  },
];
