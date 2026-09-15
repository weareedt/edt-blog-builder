import { ARTICLE_AUTHOR, ARTICLE_PUBLISHED_LABEL } from '../../render/constants';
import { uniqueSlugs } from '../../render/slugify';
import { spliceVideos, type PlacedVideo } from '../../render/spliceVideos';
import type { Template03Content } from './template03.schema';

export interface Template03RenderInput {
  content: Template03Content;
  /** Raw, already-rendered gallery HTML, or null if no gallery was selected. */
  galleryHtml: string | null;
  /** Rendered video blocks to splice between sections. */
  videos?: PlacedVideo[];
}

/**
 * Turns validated model content into the plain object the Handlebars
 * template renders against. All derived/computed values (anchors, the
 * eyebrow string, the byline labels) are computed here — never in the
 * .hbs source and never by the model — so the template stays a thin,
 * declarative presentation layer.
 */
export function prepareTemplate03Context(input: Template03RenderInput): Record<string, unknown> {
  const { content, galleryHtml, videos = [] } = input;

  const sectionItems = content.bodyItems.filter((item) => item.type === 'section');
  const anchors = uniqueSlugs(sectionItems, (s) => s.heading);

  let sectionIndex = 0;
  const bodyItems = content.bodyItems.map((item) => {
    if (item.type === 'section') {
      const anchor = anchors[sectionIndex];
      sectionIndex += 1;
      return { ...item, anchor };
    }
    return item;
  });

  const tocSections = bodyItems
    .filter((item): item is (typeof bodyItems)[number] & { type: 'section'; anchor: string } =>
      item.type === 'section'
    )
    .map((item) => ({ heading: item.navLabel ?? item.heading, anchor: item.anchor }));

  return {
    category: content.category,
    eyebrowText: `EDT Blog — ${content.category}`,
    title: content.title,
    dek: content.dek,
    authorLabel: ARTICLE_AUTHOR,
    readTimeLabel: `${content.readTimeMinutes} min`,
    publishedLabel: ARTICLE_PUBLISHED_LABEL,
    lede: content.lede,
    tocSections,
    // Spliced after the TOC is built from the real sections, so a video
    // never gets a TOC entry or a scrollspy target.
    bodyItems: spliceVideos(bodyItems, (item) => item.type === 'section', videos),
    cta: content.cta,
    galleryPlacement: content.galleryPlacement,
    galleryHtml: galleryHtml ?? '',
  };
}
