import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { galleryAccordionContent } from '../content/galleryAccordion.schema';
import { prepareGalleryAccordionContext } from '../content/galleryAccordion.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'gallery-accordion');
const CLEAN_FILE = join(REPO_ROOT, 'templates', 'clean', 'galleries', 'gallery-accordion.clean.html');

const PLACEHOLDER_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function normalize(html: string): string {
  // Handlebars' default escaper uses hex entities (&#x27; for ', &#x3D; for
  // =), so those are decoded alongside the standard XML ones — see the
  // matching note in template03's roundtrip test.
  const decoded = html
    .replace(/&#x27;/gi, "'")
    .replace(/&#x3D;/gi, '=')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

  return decoded
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * The annotated template deliberately omits the duplicated global reset CSS
 * (@import/:root/*\/html,body/body/img) that the original file carries —
 * see F7: those rules are identical to the host article template's own
 * globals, so splicing them in a second time would be redundant, not
 * incorrect. The comparison therefore starts at the first component-scoped
 * rule (".gallery-wrap{"), which both the original and the render share.
 */
function scopedTail(html: string): string {
  const marker = '.gallery-wrap{';
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`marker "${marker}" not found`);
  return html.slice(index);
}

describe('gallery-accordion golden round-trip', () => {
  it('renders the example content back to (whitespace-normalized) the original scoped CSS + markup', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));

    const content = galleryAccordionContent.parse(exampleJson);
    const imageSrcById = Object.fromEntries(content.items.map((item) => [item.imageId, PLACEHOLDER_SRC]));
    const context = prepareGalleryAccordionContext({ content, imageSrcById });
    const rendered = renderArticle(hbsSource, context);

    const expected = readFileSync(CLEAN_FILE, 'utf8');

    expect(normalize(scopedTail(rendered))).toBe(normalize(scopedTail(expected)));
  });

  it('renders validly at the minimum (3) and maximum (8) item counts', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');

    for (const count of [3, 8]) {
      const content = galleryAccordionContent.parse({
        items: Array.from({ length: count }, (_, i) => ({
          imageId: `img-${i + 1}`,
          tag: 'A tag',
          title: `Project ${i + 1}`,
          metric: 'A real metric goes here',
        })),
      });
      const imageSrcById = Object.fromEntries(content.items.map((item) => [item.imageId, PLACEHOLDER_SRC]));
      const context = prepareGalleryAccordionContext({ content, imageSrcById });
      const rendered = renderArticle(hbsSource, context);
      // Scope the assertions to the markup, not the <style> block — the CSS
      // itself contains the literal string data-default="true" in its
      // selectors (.panel[data-default="true"]), which would otherwise
      // inflate the count.
      const markup = rendered.slice(rendered.indexOf('<div class="gallery-wrap">'));

      expect((markup.match(/class="panel"/g) ?? []).length).toBe(count);
      expect((markup.match(/data-default="true"/g) ?? []).length).toBe(1);
    }
  });
});
