import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { template03Content, type BodyItem } from '../content/template03.schema';
import { prepareTemplate03Context } from '../content/template03.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'template-03-standard-article-toc');
const CLEAN_FILE = join(
  REPO_ROOT,
  'templates',
  'clean',
  'articles',
  'template-03-standard-article-toc.clean.html'
);

/**
 * Normalizes HTML for the round-trip comparison:
 *  - decodes the entities our own escaper/sanitizer produce, since the
 *    original source contains raw '"'/"'"/'&' characters that Handlebars'
 *    default auto-escaping and sanitize-html (correctly, for safety) turn
 *    into entities — Handlebars uses &#39;, sanitize-html uses &#x27;, so
 *    both are decoded
 *  - collapses ALL runs of whitespace (including newlines) to a single
 *    space, since exact indentation/line-breaking is not part of what this
 *    test is meant to prove — deliberately more aggressive than a per-line
 *    trim, so that e.g. stripping a CSS block does not itself change
 *    whether two remaining lines end up merged vs separate
 *  - blanks out section/TOC anchor ids, since those are computed by the
 *    renderer via slugify(heading) and were never meant to reproduce the
 *    original file's hand-picked short ids (e.g. "outcome") — the test
 *    still verifies anchor *consistency* separately (see the third test)
 */
function normalize(html: string): string {
  const decoded = html
    .replace(/&#x27;/gi, "'")
    .replace(/&#x3D;/gi, '=')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

  const anchorsBlanked = decoded
    .replace(/(class="article-section" id=")[^"]*(")/g, '$1ANCHOR$2')
    .replace(/(<a href="#)[^"]*(")/g, '$1ANCHOR$2');

  return anchorsBlanked.replace(/\s+/g, ' ').trim();
}

/**
 * The annotated template deliberately drops <header>/<footer> and the CSS
 * that only they used — the article is meant to be embedded into the real
 * EDT site/CMS, which supplies its own chrome, so duplicating it here would
 * be wrong output, not faithful output. The original clean file still has
 * both (it mirrors the untouched source), so they're stripped from the
 * comparison target the same way anchor ids are normalized above: this is
 * a deliberate, known divergence from the source, not something the
 * round-trip test should flag as drift.
 */
function stripHeaderFooterChrome(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>\n*/, '')
    .replace(/<footer[\s\S]*?<\/footer>\n*/, '')
    .replace(/\/\* =+ SITE HEADER =+ \*\/[\s\S]*?(?=\.btn\{)/, '')
    .replace(/\/\* =+ FOOTER =+ \*\/[\s\S]*?(?=<\/style>)/, '');
}

describe('template-03 golden round-trip', () => {
  it('renders the example content back to (whitespace-normalized) the original template', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));

    const content = template03Content.parse(exampleJson);
    const context = prepareTemplate03Context({ content, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    const expected = stripHeaderFooterChrome(readFileSync(CLEAN_FILE, 'utf8'))
      // The TOC sticky offset and section scroll-margin were calibrated to
      // clear the (now-removed) sticky site header — deliberately reduced
      // alongside its removal, same reasoning as stripHeaderFooterChrome.
      .replace('top:88px', 'top:24px')
      .replace('scroll-margin-top:96px', 'scroll-margin-top:24px');

    // The click handler that drives TOC navigation via scrollIntoView is a
    // deliberate addition over the original script (see the "TOC links
    // don't scroll reliably in a sandboxed preview" fix, verified by the
    // dedicated test below) — stripped from the comparison for the same
    // reason as the other deliberate deviations above.
    const scrollFixMarker = /\/\/ Scroll via scrollIntoView[\s\S]*?\n {2}\}\);\n\n {2}/;
    const headerFooterCommentMarker = /\/\* Header\/footer are intentionally[\s\S]*?\*\/\n {2}/;
    const renderedStripped = rendered
      .replace(scrollFixMarker, '')
      .replace(headerFooterCommentMarker, '');
    expect(renderedStripped).not.toBe(rendered); // fails loudly if either marker regex stops matching

    expect(normalize(renderedStripped)).toBe(normalize(expected));
  });

  it('renders validly at the minimum section count (3) with no callout, no cta, no gallery', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const minimal = template03Content.parse({
      title: 'A Minimal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the minimum section count.',
      category: 'Guides',
      readTimeMinutes: 3,
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      bodyItems: [
        { type: 'section', heading: 'First section', navLabel: null, blocks: [{ kind: 'paragraph', richText: 'Body copy.' }] },
        { type: 'section', heading: 'Second section', navLabel: null, blocks: [{ kind: 'paragraph', richText: 'Body copy.' }] },
        { type: 'section', heading: 'Third section', navLabel: null, blocks: [{ kind: 'paragraph', richText: 'Body copy.' }] },
      ],
      cta: null,
      galleryPlacement: null,
    });

    const context = prepareTemplate03Context({ content: minimal, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect(rendered).toContain('id="first-section"');
    expect(rendered).toContain('id="second-section"');
    expect(rendered).toContain('id="third-section"');
    expect((rendered.match(/class="article-section"/g) ?? []).length).toBe(3);
    // No CTA content field was provided, so the whole CTA section is omitted.
    expect(rendered).not.toContain('class="cta"');
  });

  it('renders validly at the maximum section count (9) with a callout, a cta, and a gallery placement', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const bodyItems: BodyItem[] = Array.from({ length: 9 }, (_, i) => ({
      type: 'section' as const,
      heading: `Section number ${i + 1}`,
      navLabel: null,
      blocks: [{ kind: 'paragraph' as const, richText: `Body copy for section ${i + 1}.` }],
    }));
    bodyItems.splice(4, 0, {
      type: 'callout',
      label: 'A callout',
      body: 'Callout body copy.',
    });

    const maximal = template03Content.parse({
      title: 'A Maximal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the maximum section count.',
      category: 'Products',
      readTimeMinutes: 12,
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      bodyItems,
      cta: { heading: 'A CTA heading', body: 'A CTA body sentence that is long enough to pass validation.' },
      galleryPlacement: 'before-cta',
    });

    const context = prepareTemplate03Context({
      content: maximal,
      galleryHtml: '<div class="gallery-wrap"><!-- gallery --></div>',
    });
    const rendered = renderArticle(hbsSource, context);

    expect((rendered.match(/class="article-section"/g) ?? []).length).toBe(9);
    expect(rendered).toContain('class="callout"');
    expect(rendered).toContain('class="cta"');
    expect(rendered).toContain('gallery-wrap');

    // Every TOC anchor must resolve to a section id that actually exists.
    const tocHrefs = [...rendered.matchAll(/toc-list[\s\S]*?<\/ul>/g)][0][0].match(/href="#([^"]+)"/g) ?? [];
    const sectionIds = new Set([...rendered.matchAll(/class="article-section" id="([^"]+)"/g)].map((m) => m[1]));
    expect(tocHrefs.length).toBe(9);
    for (const href of tocHrefs) {
      const id = href.replace('href="#', '').replace('"', '');
      expect(sectionIds.has(id)).toBe(true);
    }
  });

  it('has no <header>/<footer> chrome, and TOC links scroll via JS rather than native anchor navigation', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));
    const content = template03Content.parse(exampleJson);
    const context = prepareTemplate03Context({ content, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect(rendered).not.toContain('<header');
    expect(rendered).not.toContain('</header>');
    expect(rendered).not.toContain('<footer');
    expect(rendered).not.toContain('site-header');
    expect(rendered).not.toContain('primary-nav');
    expect(rendered).not.toContain('weareedt.com');

    // The dynamic CTA at the bottom is explicitly kept.
    expect(rendered).toContain('class="cta"');

    // TOC navigation is JS-driven (scrollIntoView + preventDefault), not
    // native anchor navigation — see the comment in template.hbs for why:
    // native fragment navigation is unreliable inside a sandboxed preview
    // iframe with allow-scripts but no allow-same-origin.
    expect(rendered).toContain('scrollIntoView');
    expect(rendered).toContain('preventDefault');
  });
});
