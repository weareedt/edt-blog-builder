#!/usr/bin/env node
// Reads the hand-authored design DATA under templates/annotated/ (each
// template's .hbs source and example-content.json) and embeds it as string/
// JSON literals into a generated, COMMITTED TypeScript module. Real logic
// (Zod schemas, TemplateDefinition metadata, context-prep functions) lives
// directly under functions/src/templates/content/ as ordinary TypeScript —
// this script only re-exports/combines those with the embedded .hbs/JSON
// data, since Cloud Functions only packages the functions/ directory and a
// committed module needs no filesystem access at runtime.
//
// Run manually: `npm run templates:build`, whenever a template.hbs or
// example-content.json under templates/annotated/ changes.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ANNOTATED_DIR = join(ROOT, 'templates', 'annotated');
const OUT_FILE = join(ROOT, 'functions', 'src', 'templates', 'generated', 'registry.ts');

// Explicit, hardcoded list — mirrors scripts/clean-templates.mjs — so
// registering a new annotated template is a deliberate one-line change.
const TEMPLATES = [
  {
    kind: 'template',
    id: 'template-03-standard-article-toc',
    dir: 'template-03-standard-article-toc',
    metaImport: { name: 'template03Meta', from: '../content/template03.meta' },
    schemaImport: { name: 'template03Content', from: '../content/template03.schema' },
  },
  {
    kind: 'template',
    id: 'template-01-case-study-roundup',
    dir: 'template-01-case-study-roundup',
    metaImport: { name: 'template01Meta', from: '../content/template01.meta' },
    schemaImport: { name: 'template01Content', from: '../content/template01.schema' },
  },
  {
    kind: 'template',
    id: 'template-02-longform-numbered-steps',
    dir: 'template-02-longform-numbered-steps',
    metaImport: { name: 'template02Meta', from: '../content/template02.meta' },
    schemaImport: { name: 'template02Content', from: '../content/template02.schema' },
  },
  {
    kind: 'template',
    id: 'template-04-basic-scroll',
    dir: 'template-04-basic-scroll',
    metaImport: { name: 'template04Meta', from: '../content/template04.meta' },
    schemaImport: { name: 'template04Content', from: '../content/template04.schema' },
  },
];

const GALLERIES = [
  {
    kind: 'gallery',
    id: 'gallery-accordion',
    dir: 'gallery-accordion',
    metaImport: { name: 'galleryAccordionMeta', from: '../content/galleryAccordion.meta' },
    schemaImport: { name: 'galleryAccordionContent', from: '../content/galleryAccordion.schema' },
  },
  {
    kind: 'gallery',
    id: 'gallery-flipcards-alternating',
    dir: 'gallery-flipcards-alternating',
    metaImport: { name: 'galleryFlipcardsAlternatingMeta', from: '../content/galleryFlipcardsAlternating.meta' },
    schemaImport: { name: 'galleryFlipcardsAlternatingContent', from: '../content/galleryFlipcardsAlternating.schema' },
  },
];

function readAnnotated(dir) {
  const base = join(ANNOTATED_DIR, dir);
  const hbsSource = readFileSync(join(base, 'template.hbs'), 'utf8');
  const exampleContentRaw = readFileSync(join(base, 'example-content.json'), 'utf8');
  // Round-trip parse to fail loudly here (build time) rather than at
  // runtime if the JSON is malformed.
  JSON.parse(exampleContentRaw);
  // Optional separate worked example for the prompt. example-content.json has
  // to reproduce the design team's original file for the golden tests, so it
  // can't also model the editorial rules (it has attributed quotes, no alt
  // text...). prompt-example.json can; it falls back to the golden example.
  const promptPath = join(base, 'prompt-example.json');
  const promptExampleRaw = existsSync(promptPath) ? readFileSync(promptPath, 'utf8') : exampleContentRaw;
  JSON.parse(promptExampleRaw);
  return { hbsSource, exampleContentRaw, promptExampleRaw };
}

function main() {
  const entries = [...TEMPLATES, ...GALLERIES].map((entry) => ({
    ...entry,
    ...readAnnotated(entry.dir),
  }));

  const imports = new Set([
    "import { computeTemplateVersion } from '../../render/templateVersion';",
  ]);
  for (const entry of entries) {
    imports.add(`import { ${entry.metaImport.name} } from '${entry.metaImport.from}';`);
    imports.add(`import { ${entry.schemaImport.name} } from '${entry.schemaImport.from}';`);
  }

  const templateEntries = entries.filter((e) => e.kind === 'template');
  const galleryEntries = entries.filter((e) => e.kind === 'gallery');

  const templateRegistryBody = templateEntries
    .map((entry) => {
      const hbsConst = `${entry.metaImport.name}_hbs`;
      return `  '${entry.id}': {
    meta: { ...${entry.metaImport.name}, templateVersion: computeTemplateVersion(${hbsConst}) },
    hbsSource: ${hbsConst},
    exampleContent: JSON.parse(${hbsConst.replace('_hbs', '')}_exampleJson) as unknown,
    promptExampleContent: JSON.parse(${hbsConst.replace('_hbs', '')}_promptExampleJson) as unknown,
    schema: ${entry.schemaImport.name},
  },`;
    })
    .join('\n');

  const galleryRegistryBody = galleryEntries
    .map((entry) => {
      const hbsConst = `${entry.metaImport.name}_hbs`;
      return `  '${entry.id}': {
    meta: { ...${entry.metaImport.name}, templateVersion: computeTemplateVersion(${hbsConst}) },
    hbsSource: ${hbsConst},
    exampleContent: JSON.parse(${hbsConst.replace('_hbs', '')}_exampleJson) as unknown,
    promptExampleContent: JSON.parse(${hbsConst.replace('_hbs', '')}_promptExampleJson) as unknown,
    schema: ${entry.schemaImport.name},
  },`;
    })
    .join('\n');

  const dataConsts = entries
    .map((entry) => {
      const base = entry.metaImport.name;
      return [
        `const ${base}_hbs = ${JSON.stringify(entry.hbsSource)};`,
        `const ${base}_exampleJson = ${JSON.stringify(entry.exampleContentRaw)};`,
        `const ${base}_promptExampleJson = ${JSON.stringify(entry.promptExampleRaw)};`,
      ].join('\n');
    })
    .join('\n\n');

  const out = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/build-template-registry.mjs from templates/annotated/.
// Re-run \`npm run templates:build\` after changing a .hbs or
// example-content.json under templates/annotated/, and commit the result.

${[...imports].sort().join('\n')}

${dataConsts}

export const templateRegistry = {
${templateRegistryBody}
} as const;

export const galleryRegistry = {
${galleryRegistryBody}
} as const;
`;

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, out, 'utf8');
  console.log(`wrote ${OUT_FILE.replace(ROOT + '/', '')}`);
  console.log(`  templates: ${templateEntries.map((e) => e.id).join(', ')}`);
  console.log(`  galleries: ${galleryEntries.map((e) => e.id).join(', ')}`);
}

main();
