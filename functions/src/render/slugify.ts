export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'section';
}

/**
 * Assigns a unique, deterministic slug to each item, based on `getText`.
 * The model never supplies anchors directly — this is always computed by
 * the renderer so TOC links and section ids can never drift apart.
 */
export function uniqueSlugs<T>(items: T[], getText: (item: T) => string): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = slugify(getText(item));
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}
