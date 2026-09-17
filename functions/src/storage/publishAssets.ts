import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import type { ArticleImage } from '../templates/article';

/** Where a published article's public copies live. Mirrors the output path shape. */
export function publicAssetPath(slug: string, fileName: string): string {
  return `public/articles/${slug}/${fileName}`;
}

/**
 * Builds the durable download URL for a Storage object.
 *
 * Firebase's tokenised download URL is used rather than a signed URL: signed
 * URLs expire (7 days max from the Admin SDK), and a published blog post has
 * to keep working. The token lives in the object's metadata and is only
 * invalidated if someone clears it in the console.
 *
 * In the emulator, FIREBASE_STORAGE_EMULATOR_HOST is set for us, so published
 * URLs point at the local emulator and the flow is testable end to end.
 */
function downloadUrl(bucket: string, path: string, token: string): string {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = emulatorHost ? `http://${emulatorHost}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Copies an article's photos to a public path and returns imageId -> URL.
 *
 * The originals stay where they are (uid-scoped uploads, readable only by
 * their owner). Publishing takes a copy, so unpublishing can delete the
 * public copy without touching the source the article was built from.
 */
export async function publishArticleImages(
  images: ArticleImage[],
  slug: string
): Promise<Record<string, string>> {
  const bucket = getStorage().bucket();
  const entries = await Promise.all(
    images.map(async (image) => {
      const extension = image.storagePath.split('.').pop() || 'jpg';
      const destination = publicAssetPath(slug, `${image.id}.${extension}`);
      const token = randomUUID();

      await bucket.file(image.storagePath).copy(bucket.file(destination));
      await bucket.file(destination).setMetadata({
        contentType: image.contentType,
        // Long cache: a published article's photo never changes in place —
        // republishing writes a fresh token.
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token },
      });

      return [image.id, downloadUrl(bucket.name, destination, token)] as const;
    })
  );
  return Object.fromEntries(entries);
}

/** Removes a published article's public photo copies. Safe to call twice. */
export async function deletePublishedAssets(slug: string): Promise<void> {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `public/articles/${slug}/`, force: true });
}
