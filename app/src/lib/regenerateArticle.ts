import { doc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ArticleDoc } from '../types/article';

/**
 * Creates a new draft article doc from an existing one (D8: regenerate
 * never mutates the source — it produces a new linked document). Reuses
 * the source's uploaded images as-is (same Storage paths, uid-scoped
 * rather than articleId-scoped, so they're readable from the new doc
 * without re-uploading) and carries `rootArticleId` forward so the whole
 * chain shares one lineage root.
 */
export async function regenerateArticle(source: ArticleDoc): Promise<string> {
  const newArticleId = doc(collection(db, 'articles')).id;

  await setDoc(doc(db, 'articles', newArticleId), {
    id: newArticleId,
    createdBy: source.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    brief: source.brief,
    category: source.category,
    angle: source.angle,
    keyPoints: source.keyPoints,
    templateId: source.templateId,
    galleryId: source.galleryId,
    requestedGalleryPlacement: source.requestedGalleryPlacement,
    resolvedGalleryPlacement: null,
    images: source.images,

    title: null,
    dek: null,
    slug: null,
    coverImageId: source.coverImageId,
    templateLabel: source.templateLabel,
    categoryLabel: source.categoryLabel,

    status: 'draft',
    errorCode: null,
    errorMessage: null,
    outputHtmlStoragePath: null,
    outputSizeBytes: null,
    promptVersion: null,
    templateVersion: null,

    rootArticleId: source.rootArticleId,
    regeneratedFromArticleId: source.id,
  });

  return newArticleId;
}
