import { fetchImageBytes } from '../storage/fetchImageBytes';
import type { ArticleImage } from '../templates/article';

export class PayloadTooLargeError extends Error {}

const TOTAL_PAYLOAD_CEILING_BYTES = 10 * 1024 * 1024; // 10MB, after base64 expansion

/**
 * Downloads every article image and returns imageId -> base64 data URI,
 * for the renderer to inline directly into the output HTML (D6: the
 * deliverable must be a genuinely self-contained, portable file — matching
 * what every source template already does).
 */
export async function inlineImages(images: ArticleImage[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    images.map(async (image) => {
      const { buffer, contentType } = await fetchImageBytes(image.storagePath);
      const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
      return [image.id, dataUri] as const;
    })
  );

  const totalBytes = entries.reduce((sum, [, uri]) => sum + uri.length, 0);
  if (totalBytes > TOTAL_PAYLOAD_CEILING_BYTES) {
    throw new PayloadTooLargeError(
      `Inlined images total ${(totalBytes / 1024 / 1024).toFixed(1)}MB, over the ${TOTAL_PAYLOAD_CEILING_BYTES / 1024 / 1024}MB ceiling. Remove some images and try again.`
    );
  }

  return Object.fromEntries(entries);
}
