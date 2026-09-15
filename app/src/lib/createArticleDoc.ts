import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type {
  ArticleImage,
  ArticleVideo,
  GalleryIntro,
  CategoryId,
  GalleryCaptionMode,
  GalleryId,
  GalleryPlacement,
  TemplateId,
} from '../types/article';
import { TEMPLATE_CATALOG } from '../types/article';

export interface NewArticleInput {
  articleId: string;
  uid: string;
  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateId: TemplateId;
  galleryId: GalleryId | null;
  galleryCaptionMode: GalleryCaptionMode | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  images: ArticleImage[];
  videos: ArticleVideo[];
  heroImageId: string | null;
  galleryIntro: GalleryIntro | null;
}

/**
 * Writes the Firestore doc that generateArticle (Phase 3) will read
 * everything from. Creating this with status "draft" first, before
 * invoking the callable, keeps validation in one place and makes
 * "regenerate" trivial (a new doc of the same shape).
 */
export async function createArticleDoc(input: NewArticleInput): Promise<void> {
  const templateMeta = TEMPLATE_CATALOG.find((t) => t.id === input.templateId);
  if (!templateMeta) throw new Error(`Unknown templateId: ${input.templateId}`);

  await setDoc(doc(db, 'articles', input.articleId), {
    id: input.articleId,
    createdBy: input.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    brief: input.brief,
    category: input.category,
    angle: input.angle,
    keyPoints: input.keyPoints,
    templateId: input.templateId,
    galleryId: input.galleryId,
    galleryCaptionMode: input.galleryCaptionMode,
    requestedGalleryPlacement: input.requestedGalleryPlacement,
    resolvedGalleryPlacement: null,
    images: input.images,
    videos: input.videos,
    heroImageId: input.heroImageId,
    galleryIntro: input.galleryIntro,

    title: null,
    dek: null,
    slug: null,
    coverImageId: input.heroImageId ?? input.images[0]?.id ?? null,
    templateLabel: templateMeta.label,
    categoryLabel: input.category,

    status: 'draft',
    errorCode: null,
    errorMessage: null,
    outputHtmlStoragePath: null,
    outputSizeBytes: null,
    promptVersion: null,
    templateVersion: null,

    rootArticleId: input.articleId,
    regeneratedFromArticleId: null,
  });
}
