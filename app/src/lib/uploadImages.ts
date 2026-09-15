import { ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { downscaleImage } from './downscaleImage';
import type { ArticleImage } from '../types/article';

export interface PendingImage {
  id: string;
  file: File;
  userNote: string | null;
  /** Rendered caption text, used when the gallery's caption mode is 'manual'. */
  caption: string | null;
  captionDetail: string | null;
}

/**
 * Downscales and uploads one pending image to
 * `users/{uid}/uploads/{articleId}/{imageId}.jpg` — this path shape is what
 * lets storage.rules check ownership directly from the path (no Firestore
 * lookup needed in the rule).
 */
export async function uploadPendingImage(
  uid: string,
  articleId: string,
  pending: PendingImage
): Promise<ArticleImage> {
  const { blob, width, height } = await downscaleImage(pending.file);
  const storagePath = `users/${uid}/uploads/${articleId}/${pending.id}.jpg`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });

  return {
    id: pending.id,
    kind: 'image',
    storagePath,
    contentType: 'image/jpeg',
    width,
    height,
    bytes: blob.size,
    userNote: pending.userNote,
    caption: pending.caption,
    captionDetail: pending.captionDetail,
  };
}

export async function uploadPendingImages(
  uid: string,
  articleId: string,
  pending: PendingImage[]
): Promise<ArticleImage[]> {
  const results: ArticleImage[] = [];
  for (const item of pending) {
    results.push(await uploadPendingImage(uid, articleId, item));
  }
  return results;
}
