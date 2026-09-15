import type Anthropic from '@anthropic-ai/sdk';
import { fetchImageBytes } from '../storage/fetchImageBytes';
import type { ArticleImage } from '../templates/article';

/**
 * Sends each uploaded image as an actual vision content block (not just a
 * text manifest), each preceded by a text block naming its imageId and any
 * user-supplied note — this is what lets Claude write captions describing
 * the real photo and place images where they support the narrative, rather
 * than working from filenames alone.
 */
export async function buildImageContentBlocks(
  images: ArticleImage[],
  heroImageId: string | null = null
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  if (images.length === 0) return blocks;

  blocks.push({
    type: 'text',
    text: `Available images (${images.length}). Each is shown below, preceded by its imageId — use these exact ids when assigning an image to a slot:`,
  });

  for (const image of images) {
    const { buffer, contentType } = await fetchImageBytes(image.storagePath);
    const mediaType = contentType as 'image/jpeg' | 'image/png' | 'image/webp';
    blocks.push({
      type: 'text',
      text: `imageId: ${image.id}${image.id === heroImageId ? ' — HERO PHOTO (use as featureImage only)' : ''}${image.userNote ? ` — note: ${image.userNote}` : ''}`,
    });
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') },
    });
  }

  return blocks;
}
