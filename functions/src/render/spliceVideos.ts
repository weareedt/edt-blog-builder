/** A rendered video block and where it goes, resolved from ArticleVideo.placement. */
export interface PlacedVideo {
  html: string;
  /**
   * Insert after this many sections: 0 is before the first one, and any
   * number at or past the section count means after the last one.
   */
  afterSection: number;
}

export interface VideoBodyItem {
  type: 'video';
  videoHtml: string;
}

/**
 * Splices video blocks into a template's body item list, keyed by section
 * position rather than raw index — so "after section 2" means after the
 * second *section*, however many callouts or highlights sit around it.
 *
 * Every non-video item is given `videoHtml: null`. The templates are
 * compiled in Handlebars strict mode, where `{{#if this.videoHtml}}` on an
 * object with no such key is a hard error rather than a falsy check.
 */
export function spliceVideos<T extends object>(
  items: T[],
  isSection: (item: T) => boolean,
  videos: PlacedVideo[]
): Array<(T & { videoHtml: null }) | VideoBodyItem> {
  const out: Array<(T & { videoHtml: null }) | VideoBodyItem> = [];
  const pending = [...videos].sort((a, b) => a.afterSection - b.afterSection);

  const flushThrough = (sectionsSoFar: number) => {
    while (pending.length > 0 && pending[0].afterSection <= sectionsSoFar) {
      out.push({ type: 'video', videoHtml: pending.shift()!.html });
    }
  };

  let sections = 0;
  flushThrough(0);
  for (const item of items) {
    out.push({ ...item, videoHtml: null });
    if (isSection(item)) {
      sections += 1;
      flushThrough(sections);
    }
  }
  // Anything placed past the last section — including 'before-closing'.
  for (const video of pending) out.push({ type: 'video', videoHtml: video.html });

  return out;
}
