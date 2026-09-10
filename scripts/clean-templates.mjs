#!/usr/bin/env node
// Strips embedded base64 image data out of the design-team's original blog
// templates and writes small, reviewable "clean" copies under templates/clean/.
//
// Run manually whenever a source file under `Blog Templates/` is added or
// revised: `npm run templates:clean`. Never run at request-time. The
// originals under `Blog Templates/` are read-only inputs and are never
// written to by this script.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Explicit, hardcoded list — not a directory glob — so adding a template to
// scope is a deliberate one-line change, not implicit directory-walking that
// could pick up blog-index-mockup.html or something under the out-of-scope
// `photo article templates/` folder by accident.
const SOURCES = [
  {
    id: 'template-01-case-study-roundup',
    category: 'articles',
    sourcePath: 'Blog Templates/template-01-case-study-roundup.html',
  },
  {
    id: 'template-02-longform-numbered-steps',
    category: 'articles',
    sourcePath: 'Blog Templates/template-02-longform-numbered-steps.html',
  },
  {
    id: 'template-03-standard-article-toc',
    category: 'articles',
    sourcePath: 'Blog Templates/template-03-standard-article-toc.html',
  },
  {
    id: 'template-04-basic-scroll',
    category: 'articles',
    sourcePath: 'Blog Templates/template-04-basic-scroll.html',
  },
  {
    id: 'gallery-accordion',
    category: 'galleries',
    sourcePath: 'Blog Templates/photo gallery components/gallery-accordion.html',
  },
  {
    id: 'gallery-flipcards-alternating',
    category: 'galleries',
    sourcePath: 'Blog Templates/photo gallery components/gallery-flipcards-alternating.html',
  },
];

// 1x1 transparent GIF. Keeps stripped <img> tags structurally/visually valid
// (openable in a browser for a sanity check) while being a handful of bytes.
const PLACEHOLDER_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const BASE64_IMG_SRC_RE = /src="data:image\/[^;]+;base64,[^"]+"/g;
// Defensive: no CSS `url(data:image...)` occurrences were found in any
// sampled file, but strip them too if a future template revision adds one.
const BASE64_CSS_URL_RE = /url\(["']?data:image\/[^;]+;base64,[^"')]+["']?\)/g;
const ALT_TEXT_RE = /alt="[^"]*"/g;

function stripBase64(html) {
  let imageCount = 0;

  let out = html.replace(BASE64_IMG_SRC_RE, () => {
    imageCount += 1;
    return `src="${PLACEHOLDER_DATA_URI}"`;
  });

  out = out.replace(BASE64_CSS_URL_RE, () => {
    imageCount += 1;
    return `url("${PLACEHOLDER_DATA_URI}")`;
  });

  // Generify alt text on images so the LLM doesn't imitate sample captions.
  // Operates on the whole <img ...> tag in place (no attribute reordering),
  // so original attribute order/spacing is preserved and only touches
  // images we just stripped, leaving unrelated <img> tags untouched.
  out = out.replace(/<img\b[^>]*>/g, (imgTag) => {
    if (!imgTag.includes(PLACEHOLDER_DATA_URI)) return imgTag;
    return imgTag.replace(ALT_TEXT_RE, 'alt="placeholder"');
  });

  return { html: out, imageCount };
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function main() {
  const manifest = {};
  const rows = [];

  for (const { id, category, sourcePath } of SOURCES) {
    const absSourcePath = join(ROOT, sourcePath);
    const original = readFileSync(absSourcePath, 'utf8');
    const { html: cleaned, imageCount } = stripBase64(original);

    const outDir = join(ROOT, 'templates', 'clean', category);
    mkdirSync(outDir, { recursive: true });
    const cleanFileName = `${id}.clean.html`;
    const outPath = join(outDir, cleanFileName);
    writeFileSync(outPath, cleaned, 'utf8');

    const beforeBytes = Buffer.byteLength(original, 'utf8');
    const afterBytes = Buffer.byteLength(cleaned, 'utf8');

    manifest[id] = {
      id,
      category,
      sourcePath,
      cleanPath: `templates/clean/${category}/${cleanFileName}`,
      sourceSha256: sha256(original),
      imageCount,
      beforeBytes,
      afterBytes,
      cleanedAt: new Date().toISOString(),
    };

    rows.push({
      id,
      before: formatBytes(beforeBytes),
      after: formatBytes(afterBytes),
      images: imageCount,
    });
  }

  const manifestPath = join(ROOT, 'templates', 'clean', 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  printTable(rows);
  console.log(`\nWrote ${rows.length} cleaned templates + manifest.json`);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function printTable(rows) {
  const idWidth = Math.max(...rows.map((r) => r.id.length), 'template'.length);
  const header = `${'template'.padEnd(idWidth)}  before      after       images`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(idWidth)}  ${r.before.padStart(9)} -> ${r.after.padStart(9)}   ${String(r.images).padStart(3)}`
    );
  }
}

main();
