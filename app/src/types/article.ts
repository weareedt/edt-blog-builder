// Mirrors functions/src/templates/types.ts and article.ts. There's no
// shared workspace between app/ and functions/ in this build, so these are
// kept in sync by hand — a small, explicit duplication rather than a build
// config for a two-package repo. If they drift, generateArticle's own Zod
// validation is the backstop (a malformed doc simply fails to generate).

export type CategoryId = 'Guides' | 'Case Studies' | 'Products' | 'Insights';

export const CATEGORY_IDS: CategoryId[] = ['Guides', 'Case Studies', 'Products', 'Insights'];

export type TemplateId = 'template-03-standard-article-toc';

export type GalleryId = 'gallery-accordion';

export type GalleryPlacement = 'after-intro' | 'mid-article' | 'before-cta' | 'end-of-article';

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
  userNote: string | null;
}

export interface ArticleDoc {
  id: string;
  createdBy: string;

  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateId: TemplateId;
  galleryId: GalleryId | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  resolvedGalleryPlacement: GalleryPlacement | null;
  images: ArticleImage[];

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
  minImages: number;
  maxImages: number;
  imagesNote: string;
  supportsGallery: boolean;
}

export interface GalleryCatalogEntry {
  id: GalleryId;
  label: string;
  blurb: string;
  itemMin: number;
  itemMax: number;
}

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = [
  {
    id: 'template-03-standard-article-toc',
    label: 'Standard article with table of contents',
    blurb: 'A sticky TOC with scrollspy, prose sections, an optional comparison table and callout.',
    minImages: 0,
    maxImages: 0,
    imagesNote: 'This template shows photos through an inserted gallery component, not inline images.',
    supportsGallery: true,
  },
];

export const GALLERY_CATALOG: GalleryCatalogEntry[] = [
  {
    id: 'gallery-accordion',
    label: 'Accordion gallery',
    blurb: 'Horizontal panels that expand on hover, each with a tag, title, and a real metric.',
    itemMin: 3,
    itemMax: 8,
  },
];
