import { spliceVideos, type PlacedVideo } from '../../render/spliceVideos';
import type { Template01Content } from './template01.schema';

export interface Template01RenderInput {
  content: Template01Content;
  /** imageId -> resolved image src (a data URI or download URL). */
  imageSrcById: Record<string, string>;
  /** Raw, already-rendered gallery HTML, or null if no gallery was selected. */
  galleryHtml: string | null;
  /** Rendered video blocks to splice between entries. */
  videos?: PlacedVideo[];
}

/**
 * Turns validated model content into the plain object the Handlebars
 * template renders against. Alternation (entry / entry.flip), the index
 * label ("01 / 12"), and the per-entry image src are all computed here —
 * never in the .hbs source and never by the model.
 */
export function prepareTemplate01Context(input: Template01RenderInput): Record<string, unknown> {
  const { content, imageSrcById, galleryHtml, videos = [] } = input;

  const total = content.entries.length;
  // Alternation and numbering are computed over the real entries first, so a
  // video spliced in afterwards doesn't shift "03 / 12" or flip the layout.
  const realEntries = content.entries.map((entry, i) => ({
    ...entry,
    isFlip: i % 2 === 1,
    indexLabel: `${String(i + 1).padStart(2, '0')} / ${total}`,
    src: entry.imageId ? (imageSrcById[entry.imageId] ?? null) : null,
  }));
  const entries = spliceVideos(realEntries, () => true, videos);

  return {
    title: content.title,
    dek: content.dek,
    category: content.category,
    readTimeLabel: `${content.readTimeMinutes} min`,
    formatLabel: `Roundup — ${total} ${total === 1 ? 'entry' : 'entries'}`,
    intro: content.intro,
    entries,
    cta: content.cta,
    galleryPlacement: content.galleryPlacement,
    galleryHtml: galleryHtml ?? '',
  };
}
