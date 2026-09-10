const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = /\.(heic|heif)$/i;

export class UnsupportedImageError extends Error {}

export interface DownscaledImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Downscales an image entirely client-side (canvas resize) before upload —
 * chosen over server-side `sharp` because `sharp` ships a platform-specific
 * native binary that is a poor thing to fight on day one of a greenfield
 * build, uploads end up ~10x smaller so the Storage emulator round-trip
 * stays fast, and the Cloud Function stays pure TypeScript with no native
 * dependencies. The Storage rule's 12MB ceiling is the backstop for a
 * client that skips this.
 *
 * Long edge capped at 1600px, re-encoded as JPEG at quality 0.8. EXIF
 * orientation is applied via createImageBitmap's own `imageOrientation`
 * option, so a portrait phone photo doesn't come out sideways.
 */
export async function downscaleImage(file: File): Promise<DownscaledImage> {
  if (HEIC_TYPES.has(file.type) || HEIC_EXTENSIONS.test(file.name)) {
    throw new UnsupportedImageError(
      `${file.name} is a HEIC/HEIF photo, which this browser can't process directly. ` +
        'Please convert it to JPEG or PNG first, or take/export the photo in JPEG format.'
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnsupportedImageError(`${file.name} couldn't be read as an image.`);
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return { blob, width, height };
}
