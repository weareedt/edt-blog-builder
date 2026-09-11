// Pre-renders each annotated template and gallery's own example content to
// a static, self-contained HTML file under app/public/template-previews/,
// for the New Article page's picker to show as a live thumbnail (see
// TemplatePreviewFrame.tsx) — real rendered output, not a screenshot, so
// it never drifts from what the renderer actually produces.
//
// Run manually: `npm run previews:build` (from functions/), whenever an
// annotated template/gallery's .hbs or example-content.json changes.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderArticle } from '../src/render/renderArticle';
import { wrapDocument } from '../src/render/wrapDocument';
import { template01Content } from '../src/templates/content/template01.schema';
import { prepareTemplate01Context } from '../src/templates/content/template01.prepareContext';
import { template02Content } from '../src/templates/content/template02.schema';
import { prepareTemplate02Context } from '../src/templates/content/template02.prepareContext';
import { template03Content } from '../src/templates/content/template03.schema';
import { prepareTemplate03Context } from '../src/templates/content/template03.prepareContext';
import { template04Content } from '../src/templates/content/template04.schema';
import { prepareTemplate04Context } from '../src/templates/content/template04.prepareContext';
import { galleryAccordionContent } from '../src/templates/content/galleryAccordion.schema';
import { prepareGalleryAccordionContext } from '../src/templates/content/galleryAccordion.prepareContext';
import { galleryFlipcardsAlternatingContent } from '../src/templates/content/galleryFlipcardsAlternating.schema';
import { prepareGalleryFlipcardsAlternatingContext } from '../src/templates/content/galleryFlipcardsAlternating.prepareContext';

const REPO_ROOT = join(__dirname, '..', '..');
const ANNOTATED_DIR = join(REPO_ROOT, 'templates', 'annotated');
const OUT_DIR = join(REPO_ROOT, 'app', 'public', 'template-previews');

// A flat EDT-blue plug-icon watermark on the surface colour, standing in
// for every imageId referenced by the example content — these are picker
// thumbnails, not real uploads, so a branded placeholder reads as
// intentional rather than a broken image.
const PLACEHOLDER_SRC = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#111111"/>
    <path d="M0 0h400M0 32h400M0 64h400M0 96h400M0 128h400M0 160h400M0 192h400M0 224h400M0 256h400M0 288h400" stroke="#ffffff" stroke-opacity="0.05"/>
    <path d="M32 0v300M64 0v300M96 0v300M128 0v300M160 0v300M192 0v300M224 0v300M256 0v300M288 0v300M320 0v300M352 0v300" stroke="#ffffff" stroke-opacity="0.05"/>
    <g transform="translate(146,103) scale(0.28)">
      <path d="M141.39,0h-35.3v44.36H.18v35.3h105.9v34.39l-106.09.44.15,35.3,105.94-.44v44.8h35.3c53.61,0,97.08-43.46,97.08-97.08S195,0,141.39,0Z" fill="#2D2DFF" fill-opacity="0.55"/>
      <polygon points="327.48 71.79 327.48 44.36 283.11 44.36 283.11 71.79 283.11 116.15 283.11 143.58 327.48 143.58 327.48 116.15 389.02 116.15 389.02 71.79 327.48 71.79" fill="#2D2DFF" fill-opacity="0.55"/>
    </g>
  </svg>`
).toString('base64')}`;

/** Builds an imageId -> PLACEHOLDER_SRC map covering every imageId found anywhere in a parsed content object. */
function placeholderMapFor(content: unknown): Record<string, string> {
  const ids = new Set<string>();
  (function walk(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'imageId' && typeof value === 'string') ids.add(value);
        else walk(value);
      }
    }
  })(content);
  return Object.fromEntries([...ids].map((id) => [id, PLACEHOLDER_SRC]));
}

function readAnnotated(dir: string) {
  const base = join(ANNOTATED_DIR, dir);
  const hbsSource = readFileSync(join(base, 'template.hbs'), 'utf8');
  const exampleContent = JSON.parse(readFileSync(join(base, 'example-content.json'), 'utf8'));
  return { hbsSource, exampleContent };
}

/**
 * Galleries are fragments meant to be spliced into a host template's own
 * <style> block, which defines the CSS custom properties (--blue,
 * --hairline, etc.) they render against — see the note in
 * galleryAccordion.roundtrip.test.ts. A standalone gallery preview needs
 * those variables (plus the font import and dark background) supplied
 * itself.
 */
function wrapGalleryDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  :root{
    --blue:#2D2DFF; --blue-hover:#0000CC; --black:#0A0A0A; --surface:#111111;
    --grey:#8C8C8C; --white:#FFFFFF; --border:#FFFFFF; --hairline:rgba(255,255,255,0.14);
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{background:var(--black);color:var(--white);font-family:'Space Grotesk',sans-serif;}
  img,svg{display:block;max-width:100%;}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const templates = [
    { id: 'template-01-case-study-roundup', dir: 'template-01-case-study-roundup', schema: template01Content, prepareContext: prepareTemplate01Context },
    { id: 'template-02-longform-numbered-steps', dir: 'template-02-longform-numbered-steps', schema: template02Content, prepareContext: prepareTemplate02Context },
    { id: 'template-03-standard-article-toc', dir: 'template-03-standard-article-toc', schema: template03Content, prepareContext: prepareTemplate03Context },
    { id: 'template-04-basic-scroll', dir: 'template-04-basic-scroll', schema: template04Content, prepareContext: prepareTemplate04Context },
  ] as const;

  for (const t of templates) {
    const { hbsSource, exampleContent } = readAnnotated(t.dir);
    const content = t.schema.parse(exampleContent);
    const imageSrcById = placeholderMapFor(content);
    // The picker thumbnail should read as "here's this template's layout",
    // not "here's an article about MetaHRise" — the example content's
    // headline/dek is specific to one case study, so it's blanked for the
    // preview render only (the same example content still powers fixture
    // generation and the roundtrip tests, untouched).
    const previewContent = { ...content, title: '', dek: '' };
    // prepareTemplate03Context takes no imageSrcById — every other one does.
    const context = (t.prepareContext as (input: Record<string, unknown>) => Record<string, unknown>)({
      content: previewContent,
      imageSrcById,
      galleryHtml: null,
    });
    const fragment = renderArticle(hbsSource, context);
    const doc = wrapDocument({ title: (content as { title: string }).title, description: '', bodyHtml: fragment });
    writeFileSync(join(OUT_DIR, `${t.id}.html`), doc, 'utf8');
    console.log(`wrote template-previews/${t.id}.html`);
  }

  const galleries = [
    { id: 'gallery-accordion', dir: 'gallery-accordion', schema: galleryAccordionContent, prepareContext: prepareGalleryAccordionContext },
    { id: 'gallery-flipcards-alternating', dir: 'gallery-flipcards-alternating', schema: galleryFlipcardsAlternatingContent, prepareContext: prepareGalleryFlipcardsAlternatingContext },
  ] as const;

  for (const g of galleries) {
    const { hbsSource, exampleContent } = readAnnotated(g.dir);
    const content = g.schema.parse(exampleContent);
    const imageSrcById = placeholderMapFor(content);
    const context = g.prepareContext({ content, imageSrcById } as never);
    const fragment = renderArticle(hbsSource, context);
    const doc = wrapGalleryDocument(fragment);
    writeFileSync(join(OUT_DIR, `${g.id}.html`), doc, 'utf8');
    console.log(`wrote template-previews/${g.id}.html`);
  }
}

main();
