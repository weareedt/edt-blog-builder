import type {
  CategoryId,
  GalleryCaptionMode,
  GalleryId,
  GalleryPlacement,
  TemplateId,
} from './types';

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
  kind: 'image'; // sole future accommodation for video
  storagePath: string; // users/{uid}/uploads/{articleId}/{imageId}.{ext}
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  /**
   * A hint to Claude about this photo ("shot at the KLIA pilot"). Never
   * rendered — it only ever reaches the model, as part of the vision block.
   */
  userNote: string | null;
  /**
   * Literal caption text, rendered verbatim, used when the article's
   * galleryCaptionMode is 'manual'. Distinct from userNote: this one is
   * copy, not a prompt. Null/absent means that panel renders image-only.
   */
  caption: string | null;
  /** The second caption line — the accordion's detail, the flip-card's back. */
  captionDetail: string | null;
}

/**
 * A video attached to an article. Never inlined like photos are — a video
 * is far too large to base64 into a portable .html — so the output either
 * embeds a YouTube/Vimeo player or links to the uploaded file by its
 * tokenised Storage download URL.
 */
export type ArticleVideo = {
  id: string;
  caption: string | null;
  /**
   * Where it goes. 'auto' lets Claude choose the section it best supports;
   * the others are fixed. It can be moved afterwards in edit mode either way.
   */
  placement: VideoPlacement;
} & (
  | { kind: 'embed'; url: string }
  | {
      kind: 'upload';
      storagePath: string; // users/{uid}/uploads/{articleId}/videos/{videoId}.{ext}
      downloadUrl: string;
      contentType: string;
      bytes: number;
    }
);

export type VideoPlacement = 'auto' | 'after-intro' | 'before-closing';

export interface ArticleDoc {
  id: string;
  createdBy: string; // uid

  // Brief
  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateId: TemplateId;
  galleryId: GalleryId | null;
  /** Null (or absent, on docs predating this field) means the gallery's own default. */
  galleryCaptionMode: GalleryCaptionMode | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  resolvedGalleryPlacement: GalleryPlacement | null;
  images: ArticleImage[];
  /** Absent on docs predating video support — read as `article.videos ?? []`. */
  videos?: ArticleVideo[];
  /**
   * The photo uploaded specifically as the hero (feature image), for the
   * templates that have one. Always used as the hero and never in the
   * gallery. Absent/null: Claude picks a feature photo, if any.
   */
  heroImageId?: string | null;
  /** An editorial heading above the gallery, typed by the user. Overrides one Claude writes. */
  galleryIntro?: { eyebrow: string; line: string | null } | null;

  // Denormalised for the dashboard
  title: string | null;
  dek: string | null;
  slug: string | null;
  coverImageId: string | null;
  templateLabel: string;
  categoryLabel: CategoryId;

  // Generation
  status: ArticleStatus;
  errorCode: ArticleErrorCode | null;
  errorMessage: string | null;
  structuredContent: string | null; // JSON string, persisted BEFORE rendering — see generateArticle.ts
  // The rendered article is stored in Cloud Storage, not inline here —
  // base64-inlined images (see D6) can easily push a rendered article past
  // Firestore's 1MiB per-document limit. This doc only holds a pointer.
  outputHtmlStoragePath: string | null; // users/{uid}/articles/{articleId}/output.html
  outputSizeBytes: number | null;
  promptVersion: string;
  templateVersion: string;

  // Lineage
  rootArticleId: string;
  regeneratedFromArticleId: string | null;
}
