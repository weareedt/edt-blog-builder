import './admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { templateRegistry } from './templates/generated/registry';
import { renderFullArticle } from './render/renderFullArticle';
import { buildPublishedArticle } from './render/buildPublishedArticle';
import { deletePublishedAssets, publishArticleImages } from './storage/publishAssets';
import { slugify } from './render/slugify';
import type { ArticleDoc, PublishedArticleDoc } from './templates/article';

const PUBLISHED_COLLECTION = 'publishedArticles';

async function loadOwnArticle(articleId: string, uid: string): Promise<ArticleDoc> {
  const snap = await getFirestore().collection('articles').doc(articleId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Article not found.');
  const article = snap.data() as ArticleDoc;
  if (article.createdBy !== uid) throw new HttpsError('permission-denied', 'Not your article.');
  return article;
}

/**
 * Finds a free slug, keeping the one this article already publishes under.
 * Two articles titled the same way would otherwise fight over one URL.
 */
async function reserveSlug(desired: string, articleId: string): Promise<string> {
  const db = getFirestore();
  const base = slugify(desired) || 'article';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.collection(PUBLISHED_COLLECTION).doc(candidate).get();
    if (!existing.exists || (existing.data() as PublishedArticleDoc).articleId === articleId) {
      return candidate;
    }
  }
  throw new HttpsError('resource-exhausted', 'Could not find a free URL for this title.');
}

/**
 * Publishes a ready article to the EDT site.
 *
 * The site reads `publishedArticles` and renders what's in it, so this
 * function produces everything a page needs and nothing it doesn't:
 *
 * - The article is re-rendered from its stored content with photos as
 *   Storage URLs instead of the base64 the download uses. A published page is
 *   then tens of KB rather than well over a megabyte, its photos are cacheable
 *   and indexable, and the feed has a real thumbnail to show.
 * - Its CSS is scoped and its (inert once embedded) scripts dropped — see
 *   buildPublishedArticle.
 * - Feed metadata is denormalised onto the same document, so the index page
 *   is one query with no joins.
 *
 * Republishing overwrites in place, keeping the URL. Nothing here touches the
 * downloadable .html, which stays self-contained.
 */
export const publishArticle = onCall({ timeoutSeconds: 120, memory: '1GiB' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
  const { articleId, slug: requestedSlug } = (request.data ?? {}) as {
    articleId?: string;
    slug?: string;
  };
  if (!articleId || typeof articleId !== 'string') {
    throw new HttpsError('invalid-argument', 'articleId is required.');
  }

  const uid = request.auth.uid;
  const article = await loadOwnArticle(articleId, uid);

  if (article.status !== 'ready') {
    throw new HttpsError('failed-precondition', 'Only a ready article can be published.');
  }
  if (!article.structuredContent) {
    throw new HttpsError('failed-precondition', 'This article has no stored content to publish.');
  }
  const templateEntry = templateRegistry[article.templateId];
  if (!templateEntry) {
    throw new HttpsError('failed-precondition', `Template "${article.templateId}" is not supported.`);
  }

  const { template: templateContent, gallery: galleryContent } = JSON.parse(article.structuredContent);
  const slug = await reserveSlug(requestedSlug || article.slug || templateContent.title, articleId);

  // Photos first: the render needs their URLs.
  const imageSrcById = article.images.length > 0 ? await publishArticleImages(article.images, slug) : {};

  const { fragment } = renderFullArticle({
    templateId: article.templateId,
    galleryId: article.galleryId,
    templateContent,
    galleryContent,
    imageSrcById,
    videos: article.videos ?? [],
    requestedGalleryPlacement: article.resolvedGalleryPlacement ?? article.requestedGalleryPlacement,
  });
  const { styleCss, bodyHtml } = buildPublishedArticle(fragment);

  const coverImageId = article.heroImageId ?? article.coverImageId ?? article.images[0]?.id ?? null;
  const published: PublishedArticleDoc = {
    slug,
    articleId,
    title: templateContent.title,
    dek: templateContent.dek,
    category: templateContent.category,
    readTimeMinutes: templateContent.readTimeMinutes ?? null,
    coverImageUrl: coverImageId ? (imageSrcById[coverImageId] ?? null) : null,
    coverImageAlt: templateContent.featureImage?.alt ?? null,
    templateId: article.templateId,
    styleCss,
    bodyHtml,
    publishedBy: uid,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getFirestore();
  // A previous publish under a different slug leaves a stale URL behind.
  if (article.publishedSlug && article.publishedSlug !== slug) {
    await db.collection(PUBLISHED_COLLECTION).doc(article.publishedSlug).delete();
    await deletePublishedAssets(article.publishedSlug);
  }

  await db.collection(PUBLISHED_COLLECTION).doc(slug).set(published, { merge: true });
  await db.collection('articles').doc(articleId).update({
    published: true,
    publishedSlug: slug,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { slug, path: `/blog/${slug}` };
});

/** Takes an article off the site: removes its page record and its public photos. */
export const unpublishArticle = onCall({ timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
  const { articleId } = (request.data ?? {}) as { articleId?: string };
  if (!articleId || typeof articleId !== 'string') {
    throw new HttpsError('invalid-argument', 'articleId is required.');
  }

  const article = await loadOwnArticle(articleId, request.auth.uid);
  const db = getFirestore();

  if (article.publishedSlug) {
    await db.collection(PUBLISHED_COLLECTION).doc(article.publishedSlug).delete();
    await deletePublishedAssets(article.publishedSlug);
  }

  await db.collection('articles').doc(articleId).update({
    published: false,
    publishedSlug: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true as const };
});
