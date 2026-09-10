import { getStorage } from 'firebase-admin/storage';

export interface FetchedImage {
  buffer: Buffer;
  contentType: string;
}

/** Downloads one Storage object via the Admin SDK (bypasses Storage rules — this only ever runs server-side). */
export async function fetchImageBytes(storagePath: string): Promise<FetchedImage> {
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  return { buffer, contentType: metadata.contentType ?? 'image/jpeg' };
}
