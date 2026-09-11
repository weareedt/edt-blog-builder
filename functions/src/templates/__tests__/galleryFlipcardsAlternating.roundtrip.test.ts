import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { galleryFlipcardsAlternatingContent } from '../content/galleryFlipcardsAlternating.schema';
import { prepareGalleryFlipcardsAlternatingContext } from '../content/galleryFlipcardsAlternating.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'gallery-flipcards-alternating');
const CLEAN_FILE = join(REPO_ROOT, 'templates', 'clean', 'galleries', 'gallery-flipcards-alternating.clean.html');

const PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

// Same normalization as gallery-accordion's round-trip test — see the
// matching note there.
function normalize(html: string): string {
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
 * Same reasoning as gallery-accordion's scopedTail: the annotated template
 * omits the duplicated global reset CSS (@import/:root/*\/html,body/body/img)
 * that the original file carries, since it's identical to the host article
 * template's own globals. The comparison starts at the first
 * component-scoped rule.
 */
function scopedTail(html: string): string {
  const marker = '.gallery-wrap{';
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`marker "${marker}" not found`);
  return html.slice(index);
}

describe('gallery-flipcards-alternating golden round-trip', () => {
  it('renders the example content back to (whitespace-normalized) the original scoped CSS + markup', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));

    const content = galleryFlipcardsAlternatingContent.parse(exampleJson);
    const imageSrcById = Object.fromEntries(content.items.map((item) => [item.imageId, PLACEHOLDER_SRC]));
    const context = prepareGalleryFlipcardsAlternatingContext({ content, imageSrcById });
    const rendered = renderArticle(hbsSource, context);

    // The source's 6th card is internally inconsistent — its front label
    // reads "VR Simulation Training" but its own back-of-card tag
    // abbreviates to "06 — VR Simulation". This template computes the back
    // tag from the front label (matching gallery-accordion's computed
    // index), so the example content uses the shorter, consistent form
    // instead of reproducing the source's own mismatch.
    const expected = readFileSync(CLEAN_FILE, 'utf8').replace(
      '<div class="label">VR Simulation Training</div>',
      '<div class="label">VR Simulation</div>'
    );

    expect(normalize(scopedTail(rendered))).toBe(normalize(scopedTail(expected)));
  });

  it('renders validly at the minimum (3) and maximum (8) item counts', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');

    for (const count of [3, 8]) {
      const content = galleryFlipcardsAlternatingContent.parse({
        items: Array.from({ length: count }, (_, i) => ({
          imageId: `img-${i + 1}`,
          label: `Label ${i + 1}`,
          body: 'A back-of-card description long enough to pass validation.',
          projectLine: `Project ${i + 1}`,
        })),
      });
      const imageSrcById = Object.fromEntries(content.items.map((item) => [item.imageId, PLACEHOLDER_SRC]));
      const context = prepareGalleryFlipcardsAlternatingContext({ content, imageSrcById });
      const rendered = renderArticle(hbsSource, context);
      const markup = rendered.slice(rendered.indexOf('<div class="gallery-wrap">'));

      expect((markup.match(/class="flip-card"/g) ?? []).length).toBe(count);
      expect(markup).toContain(`<span class="tag">${String(count).padStart(2, '0')} — Label ${count}</span>`);
    }
  });
});
