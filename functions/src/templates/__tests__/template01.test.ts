import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { template01Content } from '../content/template01.schema';
import { prepareTemplate01Context } from '../content/template01.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated', 'template-01-case-study-roundup');

// Unlike template-03, this is not a byte-level golden round-trip against the
// original clean file: the original's sample images are ALL still-unswapped
// placeholders, so every entry (image or not) carries a "swap this" label
// that only makes sense for unfinished sample content — never for a real
// uploaded photo. The annotation deliberately renders that label only for
// entries with no photo at all (see the note in template.hbs), which is a
// real, intentional divergence from the source's literal markup, not
// something a whitespace/anchor normalization pass can paper over. This
// test instead proves structural fidelity directly: every field from the
// original entries' real content renders correctly, alternation is
// computed by the renderer, and images resolve (or correctly fall back)
// per entry.
describe('template-01 structural fidelity', () => {
  function renderExample(imageIds: string[]) {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const exampleJson = JSON.parse(readFileSync(join(ANNOTATED_DIR, 'example-content.json'), 'utf8'));
    const content = template01Content.parse(exampleJson);
    const imageSrcById = Object.fromEntries(imageIds.map((id) => [id, `data:image/jpeg;base64,FAKE_${id}`]));
    const context = prepareTemplate01Context({ content, imageSrcById, galleryHtml: null });
    return renderArticle(hbsSource, context);
  }

  it('renders all 12 entries with correct alternation, tags, and index labels', () => {
    const rendered = renderExample(['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6', 'img-7', 'img-8', 'img-9', 'img-10', 'img-11']);

    expect((rendered.match(/class="entry(?: flip)?" data-entry/g) ?? []).length).toBe(12);
    // Odd 1-based positions (index 0, 2, 4...) are plain; even (index 1, 3, 5...) are flipped.
    expect((rendered.match(/class="entry flip" data-entry/g) ?? []).length).toBe(6);

    expect(rendered).toContain('<span class="name">METAHRISE.EXE</span>');
    expect(rendered).toContain('<h2>MetaHRise</h2>');
    expect(rendered).toContain('<span class="index">01 / 12</span>');
    expect(rendered).toContain('<span class="tag blue">VR Training</span>');
    expect(rendered).toContain('<span class="tag">Client — MCMC</span>');
    expect(rendered).toContain('93% satisfaction · Malaysia Book of Records 2024');

    expect(rendered).toContain('<span class="index">12 / 12</span>');
    expect(rendered).toContain('<h2>VR Earthquake Simulation</h2>');
  });

  it('renders a real image for entries with one, and the placeholder label for the one entry without', () => {
    const rendered = renderExample(['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6', 'img-7', 'img-8', 'img-9', 'img-10', 'img-11']);

    expect((rendered.match(/<img class="thumb"/g) ?? []).length).toBe(11);
    expect((rendered.match(/No photo provided for this entry/g) ?? []).length).toBe(1);
    // "Say Hello, Tiger" is the entry with no imageId in the example content.
    const tigerBlock = rendered.slice(rendered.indexOf('TIGER.EXE'), rendered.indexOf('TIGER.EXE') + 800);
    expect(tigerBlock).toContain('No photo provided for this entry');
    expect(tigerBlock).not.toContain('<img class="thumb"');
  });

  it('omits the client tag when client is null', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    const content = template01Content.parse({
      title: 'A Title For Testing Purposes Only',
      dek: 'A dek that exists purely to satisfy the schema minimum length for testing.',
      category: 'Guides',
      readTimeMinutes: 4,
      intro: null,
      entries: [
        { windowLabel: 'A.EXE', projectName: 'Project A', category: 'Cat', client: null, blurb: 'A'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
        { windowLabel: 'B.EXE', projectName: 'Project B', category: 'Cat', client: null, blurb: 'B'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
        { windowLabel: 'C.EXE', projectName: 'Project C', category: 'Cat', client: null, blurb: 'C'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
      ],
      cta: null,
      galleryPlacement: null,
    });
    const context = prepareTemplate01Context({ content, imageSrcById: {}, galleryHtml: null });
    const rendered = renderArticle(hbsSource, context);

    expect(rendered).not.toContain('Client — ');
    // No CTA content field was provided, so the whole CTA section is omitted.
    expect(rendered).not.toContain('class="cta"');

    const withClient = template01Content.parse({
      title: 'A Title For Testing Purposes Only',
      dek: 'A dek that exists purely to satisfy the schema minimum length for testing.',
      category: 'Guides',
      readTimeMinutes: 4,
      intro: null,
      entries: [
        { windowLabel: 'A.EXE', projectName: 'Project A', category: 'Cat', client: 'Real Client', blurb: 'A'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
        { windowLabel: 'B.EXE', projectName: 'Project B', category: 'Cat', client: null, blurb: 'B'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
        { windowLabel: 'C.EXE', projectName: 'Project C', category: 'Cat', client: null, blurb: 'C'.repeat(200), statLine: 'A stat', imageId: null, imageAlt: null },
      ],
      cta: null,
      galleryPlacement: null,
    });
    const rendered2 = renderArticle(hbsSource, prepareTemplate01Context({ content: withClient, imageSrcById: {}, galleryHtml: null }));
    expect(rendered2).toContain('Client — Real Client');
  });

  it('renders validly at the minimum (3) and maximum (12) entry counts', () => {
    const hbsSource = readFileSync(join(ANNOTATED_DIR, 'template.hbs'), 'utf8');
    for (const count of [3, 12]) {
      const content = template01Content.parse({
        title: 'A Bound-Testing Title That Is Long Enough',
        dek: 'A dek that exists purely to satisfy the schema minimum length for testing purposes.',
        category: 'Products',
        readTimeMinutes: 5,
        intro: null,
        entries: Array.from({ length: count }, (_, i) => ({
          windowLabel: `E${i}.EXE`,
          projectName: `Entry ${i + 1}`,
          category: 'Test category',
          client: null,
          blurb: 'x'.repeat(200),
          statLine: 'A stat line',
          imageId: null,
          imageAlt: null,
        })),
        cta: { heading: 'A CTA heading', body: 'A CTA body sentence that is long enough to pass validation.' },
        galleryPlacement: 'end-of-article',
      });
      const rendered = renderArticle(
        hbsSource,
        prepareTemplate01Context({
          content,
          imageSrcById: {},
          galleryHtml: '<div class="gallery-wrap"><!-- gallery --></div>',
        })
      );
      expect((rendered.match(/class="entry(?: flip)?" data-entry/g) ?? []).length).toBe(count);
      expect(rendered).toContain('class="cta"');
      expect(rendered).toContain('gallery-wrap');
    }
  });

  it('has no <header>/<footer>/template-tag chrome, and the breadcrumb is kept', () => {
    const rendered = renderExample([]);
    expect(rendered).not.toContain('<header');
    expect(rendered).not.toContain('<footer');
    expect(rendered).not.toContain('site-header');
    // Not a bare substring check: the .hbs file's own explanatory comment
    // about *why* the tag was removed legitimately contains the word
    // "template-tag" — what must be absent is the actual element/class.
    expect(rendered).not.toContain('class="template-tag"');
    expect(rendered).not.toContain('Template 01 — Roundup');
    expect(rendered).not.toContain('weareedt.com');
    expect(rendered).toContain('class="crumb-bar"');
  });
});
