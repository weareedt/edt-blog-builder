/** A rendered block (a video, or a gallery placed between sections) and where it goes. */
export interface PlacedInsert {
  html: string;
  /**
   * Insert after this many sections: 0 is before the first one, and any
   * number at or past the section count means after the last one.
   */
  afterSection: number;
}

export interface InsertBodyItem {
  type: 'insert';
  insertHtml: string;
}

/**
 * Splices inserts into a template's body item list, keyed by section
 * position rather than raw index.
 *
 * "After section 2" lands just before section 3 — so after section 2's own
 * trailing callout or highlight, not between a section and its highlight.
 * An insert is a break between sections, not part of the one above it.
 *
 * Every real item is given `insertHtml: null`. The templates are compiled in
 * Handlebars strict mode, where `{{#if this.insertHtml}}` on an object with
 * no such key is a hard error rather than a falsy check.
 */
export function spliceInserts<T extends object>(
  items: T[],
  isSection: (item: T) => boolean,
  inserts: PlacedInsert[]
): Array<(T & { insertHtml: null }) | InsertBodyItem> {
  const out: Array<(T & { insertHtml: null }) | InsertBodyItem> = [];
  const pending = [...inserts].sort((a, b) => a.afterSection - b.afterSection);

  const flushThrough = (sectionsSoFar: number) => {
    while (pending.length > 0 && pending[0].afterSection <= sectionsSoFar) {
      out.push({ type: 'insert', insertHtml: pending.shift()!.html });
    }
  };

  let sections = 0;
  for (const item of items) {
    if (isSection(item)) {
      flushThrough(sections);
      sections += 1;
    }
    out.push({ ...item, insertHtml: null });
  }
  // Anything placed after the last section — including 'before-closing'.
  for (const insert of pending) out.push({ type: 'insert', insertHtml: insert.html });

  return out;
}
