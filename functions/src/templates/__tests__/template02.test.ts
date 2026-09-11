import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { template02Content, type Step } from '../content/template02.schema';
import { prepareTemplate02Context } from '../content/template02.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'template-02-longform-numbered-steps');
const CLEAN_FILE = join(
  REPO_ROOT,
  'templates',
  'clean',
  'articles',
  'template-02-longform-numbered-steps.clean.html'
);

/**
 * Same normalization strategy as template-03's golden round-trip: decode
 * the entities our escaper/sanitizer introduce, collapse all whitespace,
 * and blank out the one piece of content that is legitimately expected to
 * differ (see below) before comparing.
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

  // The feature image's src is a real resolved image src at render time,
  // never the original file's leftover placeholder GIF — blanked the same
  // way template-03 blanks computed anchor ids, since it isn't part of
  // what this test is meant to prove. Its alt text is likewise a real,
  // meaningful description here (the caption text) rather than the
  // source's literal "placeholder" string — a deliberate improvement, not
  // drift, so it's blanked too.
  const srcBlanked = decoded
    .replace(/(<img src=")[^"]*(")/g, '$1SRC$2')
    .replace(/(<img src="SRC" alt=")[^"]*(")/g, '$1ALT$2');

  return srcBlanked.replace(/\s+/g, ' ').trim();
}

/**
 * The annotated template deliberately drops <header>/<footer>, the site-nav
 * CSS, and the "Template NN — ..." dev-label tag — the article is meant to
 * be embedded into the real EDT site/CMS, which supplies its own chrome.
 * The original clean file still has all three (it mirrors the untouched
 * source), so they're stripped from the comparison target — a deliberate,
 * known divergence, not drift.
 */
function stripHeaderFooterChrome(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>\n*/, '')
    .replace(/<footer[\s\S]*?<\/footer>\n*/, '')
    .replace(/\/\* =+ SITE HEADER =+ \*\/[\s\S]*?(?=\.btn\{)/, '')
    .replace(/\/\* =+ FOOTER =+ \*\/[\s\S]*?(?=<\/style>)/, '')
    .replace(/\s*<div class="template-tag">[\s\S]*?<\/div>/, '')
    .replace(/\.template-tag\{[^}]*\}\n/, '');
}

describe('template-02 golden round-trip', () => {
  it('renders the example content back to (whitespace-normalized) the original template', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));

    const content = template02Content.parse(exampleJson);
    const context = prepareTemplate02Context({
      content,
      imageSrcById: { 'img-1': 'data:image/jpeg;base64,FAKE' },
      galleryHtml: null,
    });
    const rendered = renderArticle(hbsSource, context);

    const expected = stripHeaderFooterChrome(readFileSync(CLEAN_FILE, 'utf8'))
      // The step-number sticky offset was calibrated to clear the
      // (now-removed) sticky site header — deliberately reduced alongside
      // its removal, same reasoning as the template-03 TOC offset.
      .replace('top:104px', 'top:24px');

    const headerFooterCommentMarker = /\/\* Header\/footer\/template-tag are intentionally[\s\S]*?\*\/\n {2}/;
    // If there's no photo for the feature-image slot, the whole section is
    // omitted (see the {{#if featureImage.src}} guard) rather than shown
    // as an empty frame — it should not normally trigger (the imageId is
    // constrained to actually-uploaded images upstream), but this is what
    // makes that the renderer's behavior rather than a broken empty <img>.
    const renderedStripped = rendered
      .replace(headerFooterCommentMarker, '')
      // The source's eyebrow line ("Inside the build") is bespoke prose
      // written for this one demo article, not a reusable template-level
      // label — like template-01's eyebrow, it's replaced with a label
      // generic to the template kind, and normalized out of this
      // comparison for the same reason as the other deliberate deviations.
      .replace('EDT Blog — Long read', 'EDT Blog — ANY');
    expect(renderedStripped).not.toBe(rendered); // fails loudly if either marker regex stops matching

    // The source's byline "Category" is the project's own free-text category
    // ("VR Training") — the schema's `category` field is the article-level
    // 4-value taxonomy (Guides/Case Studies/Products/Insights) shared across
    // every template, which is a different, incompatible value. Blanked out
    // on both sides for the same reason as the eyebrow line above.
    const expectedNormalized = expected
      .replace('EDT Blog — Inside the build', 'EDT Blog — ANY')
      .replace('<div class="k">Category</div><div class="v">VR Training</div>', '<div class="k">Category</div><div class="v">ANY</div>');
    const renderedNormalized = renderedStripped.replace(
      '<div class="k">Category</div><div class="v">Case Studies</div>',
      '<div class="k">Category</div><div class="v">ANY</div>'
    );

    expect(normalize(renderedNormalized)).toBe(normalize(expectedNormalized));
  });

  it('renders validly at the minimum step count (3) with no highlight, no feature image, no client, no cta', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const minimal = template02Content.parse({
      title: 'A Minimal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the minimum step count.',
      category: 'Guides',
      readTimeMinutes: 3,
      client: null,
      featureImage: null,
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      steps: [
        { sectionLabel: 'First step', paragraphs: ['Body copy that is long enough to pass validation easily.'], highlight: null },
        { sectionLabel: 'Second step', paragraphs: ['Body copy that is long enough to pass validation easily.'], highlight: null },
        { sectionLabel: 'Third step', paragraphs: ['Body copy that is long enough to pass validation easily.'], highlight: null },
      ],
      closing: null,
      cta: null,
      galleryPlacement: null,
    });

    const context = prepareTemplate02Context({ content: minimal, imageSrcById: {}, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect((rendered.match(/class="step" data-step/g) ?? []).length).toBe(3);
    expect(rendered).toContain('<span class="step-num">01</span>');
    expect(rendered).toContain('<span class="step-num">03</span>');
    expect(rendered).not.toContain('Client');
    expect(rendered).not.toContain('class="feature-media"');
    expect(rendered).not.toContain('class="cta"');
    expect(rendered).not.toContain('class="closing"');
  });

  it('renders validly at the maximum step count (8) with every highlight type, a feature image, and a gallery placement', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const steps: Step[] = Array.from({ length: 8 }, (_, i) => ({
      sectionLabel: `Step number ${i + 1}`,
      paragraphs: [`Body copy for step ${i + 1}, long enough to pass validation.`],
      highlight: null,
    }));
    steps[2].highlight = { type: 'pullQuote', quote: 'A quote long enough to pass validation.', attribution: '— A Source' };
    steps[4].highlight = {
      type: 'statCard',
      windowLabel: 'STATS.EXE',
      cells: [{ number: '100%', label: 'A stat label long enough to pass validation.' }],
    };
    steps[6].highlight = { type: 'tagList', tags: ['Tag One', 'Tag Two'] };

    const maximal = template02Content.parse({
      title: 'A Maximal Article For Bound Testing',
      dek: 'This exists only to prove the renderer produces valid, well-formed output at the maximum step count.',
      category: 'Products',
      readTimeMinutes: 15,
      client: 'A Test Client',
      featureImage: { windowLabel: 'FEATURE.EXE', caption: 'A caption long enough to pass validation.', imageId: 'img-1' },
      lede: 'This lede exists purely to satisfy the schema minimum length for bound testing purposes.',
      steps,
      closing: 'A closing paragraph long enough to pass the schema minimum length.',
      cta: { heading: 'A CTA heading', body: 'A CTA body sentence that is long enough to pass validation.' },
      galleryPlacement: 'before-cta',
    });

    const context = prepareTemplate02Context({
      content: maximal,
      imageSrcById: { 'img-1': 'data:image/jpeg;base64,FAKE' },
      galleryHtml: '<div class="gallery-wrap"><!-- gallery --></div>',
    });
    const rendered = renderArticle(hbsSource, context);

    expect((rendered.match(/class="step" data-step/g) ?? []).length).toBe(8);
    expect(rendered).toContain('<span class="step-num">08</span>');
    expect(rendered).toContain('class="pull-quote"');
    expect(rendered).toContain('class="stat-card"');
    expect(rendered).toContain('class="inline-tags"');
    expect(rendered).toContain('class="feature-media"');
    expect(rendered).toContain('class="cta"');
    expect(rendered).toContain('gallery-wrap');
    expect(rendered).toContain('Client — A Test Client'.split(' — ')[1]); // client value present
  });

  it('has no <header>/<footer>/template-tag chrome, and the breadcrumb + progress bar + CTA are kept', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));
    const content = template02Content.parse(exampleJson);
    const context = prepareTemplate02Context({ content, imageSrcById: {}, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect(rendered).not.toContain('<header');
    expect(rendered).not.toContain('</header>');
    expect(rendered).not.toContain('<footer');
    expect(rendered).not.toContain('site-header');
    expect(rendered).not.toContain('primary-nav');
    expect(rendered).not.toContain('weareedt.com');
    // Not a bare substring check: see the note in template-01's test — the
    // .hbs file's own explanatory comment legitimately mentions the phrase.
    expect(rendered).not.toContain('class="template-tag"');
    expect(rendered).not.toContain('Template 02 — Long-form');

    expect(rendered).toContain('class="crumb-bar"');
    expect(rendered).toContain('class="progress-track"');
    expect(rendered).toContain('class="cta"');
  });
});
