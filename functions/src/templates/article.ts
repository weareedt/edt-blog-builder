import type { CategoryId, GalleryId, GalleryPlacement, TemplateId } from './types';

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
  userNote: string | null;
}

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
  requestedGalleryPlacement: GalleryPlacement | null;
  resolvedGalleryPlacement: GalleryPlacement | null;
  images: ArticleImage[];

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
