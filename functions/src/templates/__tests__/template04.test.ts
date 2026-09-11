import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { template04Content, type BodyItem } from '../content/template04.schema';
import { prepareTemplate04Context } from '../content/template04.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'template-04-basic-scroll');
const CLEAN_FILE = join(REPO_ROOT, 'templates', 'clean', 'articles', 'template-04-basic-scroll.clean.html');

// Same normalization strategy as template-02's golden round-trip — see the
// comments there for why each piece is normalized rather than compared
// literally.
function normalize(html: string): string {
  const decoded = html
    .replace(/&#x27;/gi, "'")
    .replace(/&#x3D;/gi, '=')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

  const srcBlanked = decoded
    .replace(/(<img src=")[^"]*(")/g, '$1SRC$2')
    .replace(/(<img src="SRC" alt=")[^"]*(")/g, '$1ALT$2');

  return srcBlanked.replace(/\s+/g, ' ').trim();
}

function stripHeaderFooterChrome(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>\n*/, '')
    .replace(/<footer[\s\S]*?<\/footer>\n*/, '')
    .replace(/\/\* =+ SITE HEADER =+ \*\/[\s\S]*?(?=\.btn\{)/, '')
    .replace(/\/\* =+ FOOTER =+ \*\/[\s\S]*?(?=<\/style>)/, '')
    .replace(/\s*<div class="template-tag">[\s\S]*?<\/div>/, '')
    .replace(/\.template-tag\{[^}]*\}\n/, '');
}

describe('template-04 golden round-trip', () => {
  it('renders the example content back to (whitespace-normalized) the original template', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));

    const content = template04Content.parse(exampleJson);
    const context = prepareTemplate04Context({
      content,
      imageSrcById: { 'img-1': 'data:image/jpeg;base64,FAKE' },
      galleryHtml: null,
    });
    const rendered = renderArticle(hbsSource, context);

    const expected = stripHeaderFooterChrome(readFileSync(CLEAN_FILE, 'utf8'));

    const headerFooterCommentMarker = /\/\* Header\/footer\/template-tag are intentionally[\s\S]*?\*\/\n {2}/;
    // Same defensive fallback as template-02's feature image — see the
    // comment there.
    const fallbackCssMarker = /\s*\.feature-stage \.media-slot-label\{[\s\S]*?\}\n/;
    const renderedStripped = rendered
      .replace(headerFooterCommentMarker, '')
      .replace(fallbackCssMarker, '')
      // Same bespoke-demo-copy divergence as template-02's eyebrow line.
      .replace('EDT Blog — Long read', 'EDT Blog — ANY');
    expect(renderedStripped).not.toBe(rendered); // fails loudly if either marker regex stops matching

    // Same article-level-taxonomy-vs-project-category divergence as
    // template-02's byline Category field.
    const expectedNormalized = expected
      .replace('EDT Blog — Inside the build', 'EDT Blog — ANY')
      .replace('<div class="k">Category</div><div class="v">VR Training</div>', '<div class="k">Category</div><div class="v">ANY</div>');
    const renderedNormalized = renderedStripped.replace(
      '<div class="k">Category</div><div class="v">Case Studies</div>',
      '<div class="k">Category</div><div class="v">ANY</div>'
    );

    expect(normalize(renderedNormalized)).toBe(normalize(expectedNormalized));
  });

  it('renders validly at the minimum section count (3) with no highlights, no feature image, no client, no cta', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const minimal = template04Content.parse({
      title: 'A Minimal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the minimum section count.',
      category: 'Guides',
      readTimeMinutes: 3,
      client: null,
      featureImage: null,
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      bodyItems: [
        { type: 'section', sectionLabel: 'First section', paragraphs: ['Body copy that is long enough to pass validation easily.'] },
        { type: 'section', sectionLabel: 'Second section', paragraphs: ['Body copy that is long enough to pass validation easily.'] },
        { type: 'section', sectionLabel: 'Third section', paragraphs: ['Body copy that is long enough to pass validation easily.'] },
      ],
      closing: null,
      cta: null,
      galleryPlacement: null,
    });

    const context = prepareTemplate04Context({ content: minimal, imageSrcById: {}, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect((rendered.match(/class="section-label"/g) ?? []).length).toBe(3);
    expect(rendered).toContain('class="body-copy drop"');
    expect(rendered).not.toContain('class="pull-quote"');
    expect(rendered).not.toContain('Client');
    expect(rendered).not.toContain('class="feature-media"');
    expect(rendered).not.toContain('class="cta"');
    expect(rendered).not.toContain('class="closing"');
  });

  it('rejects fewer than 3 sections even when total bodyItems is 3+ via highlights', () => {
    expect(() =>
      template04Content.parse({
        title: 'A Title For Testing Purposes Only',
        dek: 'A dek that exists purely to satisfy the schema minimum length for testing.',
        category: 'Guides',
        readTimeMinutes: 3,
        client: null,
        featureImage: null,
        lede: 'This lede exists purely to satisfy the schema minimum length for testing.',
        bodyItems: [
          { type: 'section', sectionLabel: 'Only section', paragraphs: ['Body copy that is long enough to pass validation.'] },
          { type: 'highlight', highlight: { type: 'tagList', tags: ['Tag One'] } },
          { type: 'highlight', highlight: { type: 'tagList', tags: ['Tag Two'] } },
        ],
        closing: null,
        cta: null,
        galleryPlacement: null,
      })
    ).toThrow();
  });

  it('renders validly at the maximum section count (8) with every highlight type, a feature image, and a gallery placement', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const bodyItems: BodyItem[] = Array.from({ length: 8 }, (_, i) => ({
      type: 'section' as const,
      sectionLabel: `Section number ${i + 1}`,
      paragraphs: [`Body copy for section ${i + 1}, long enough to pass validation.`],
    }));
    bodyItems.splice(2, 0, { type: 'highlight', highlight: { type: 'pullQuote', quote: 'A quote long enough to pass validation.', attribution: '— A Source' } });
    bodyItems.splice(5, 0, {
      type: 'highlight',
      highlight: { type: 'statCard', windowLabel: 'STATS.EXE', cells: [{ number: '100%', label: 'A stat label long enough to pass validation.' }] },
    });
    bodyItems.push({ type: 'highlight', highlight: { type: 'tagList', tags: ['Tag One', 'Tag Two'] } });

    const maximal = template04Content.parse({
      title: 'A Maximal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the maximum section count.',
      category: 'Products',
      readTimeMinutes: 15,
      client: 'A Test Client',
      featureImage: { windowLabel: 'FEATURE.EXE', caption: 'A caption long enough to pass validation.', imageId: 'img-1' },
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      bodyItems,
      closing: 'A closing paragraph long enough to pass the schema minimum length.',
      cta: { heading: 'A CTA heading', body: 'A CTA body sentence that is long enough to pass validation.' },
      galleryPlacement: 'before-cta',
    });

    const context = prepareTemplate04Context({
      content: maximal,
      imageSrcById: { 'img-1': 'data:image/jpeg;base64,FAKE' },
      galleryHtml: '<div class="gallery-wrap"><!-- gallery --></div>',
    });
    const rendered = renderArticle(hbsSource, context);

    expect((rendered.match(/class="section-label"/g) ?? []).length).toBe(8);
    expect(rendered).toContain('class="pull-quote"');
    expect(rendered).toContain('class="stat-card"');
    expect(rendered).toContain('class="inline-tags"');
    expect(rendered).toContain('class="feature-media"');
    expect(rendered).toContain('class="cta"');
    expect(rendered).toContain('gallery-wrap');
    expect(rendered).toContain('Client — A Test Client'.split(' — ')[1]);
    // Only the very first section gets the drop-cap.
    expect((rendered.match(/class="body-copy drop"/g) ?? []).length).toBe(1);
  });

  it('has no <header>/<footer>/template-tag chrome, and the breadcrumb + progress bar + CTA are kept', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));
    const content = template04Content.parse(exampleJson);
    const context = prepareTemplate04Context({ content, imageSrcById: {}, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect(rendered).not.toContain('<header');
    expect(rendered).not.toContain('</header>');
    expect(rendered).not.toContain('<footer');
    expect(rendered).not.toContain('site-header');
    expect(rendered).not.toContain('primary-nav');
    expect(rendered).not.toContain('weareedt.com');
    expect(rendered).not.toContain('class="template-tag"');
    expect(rendered).not.toContain('Template 04 — Basic scroll');

    expect(rendered).toContain('class="crumb-bar"');
    expect(rendered).toContain('class="progress-track"');
    expect(rendered).toContain('class="cta"');
  });
});
