import type { TemplateStaticMeta } from '../types';

export const template03Meta: TemplateStaticMeta = {
  id: 'template-03-standard-article-toc',
  label: 'Standard article with table of contents',
  blurb: 'A sticky TOC with scrollspy, prose sections, an optional comparison table and callout.',
  supportedGalleryPlacements: ['mid-article', 'before-cta'],
  images: {
    // This template ships with no inline-image markup/CSS at all (the
    // original has zero <img> tags) — see the "one honest gap" note in the
    // plan. Photos are shown only via an inserted gallery component.
    minInline: 0,
    maxInline: 0,
    galleryMin: 3,
    galleryMax: 8,
    note: 'This template shows photos through an inserted gallery component, not inline images.',
  },
  structureNotes: `This template is a standard article with a sticky, scroll-spied
table of contents down the side. The body is a sequence of sections, each with
a heading and one to five content blocks. Use as many sections as the brief
genuinely supports — typically 6 to 7, never fewer than 3 or more than 9.

Each section may optionally set a short navLabel distinct from its heading,
for when the heading runs long and a shorter phrase reads better in the
table-of-contents sidebar (most sections don't need this — leave it null).

Each section's blocks may mix: a paragraph, a short bullet list (2-6 items),
a side-by-side comparison table (2-5 columns, 2-6 rows), a callout — a single
punchy claim worth pulling out of the body copy — or, only in the article's
final section, a short closing note. Not every section needs more than one
paragraph; use the comparison table and callout sparingly, where the brief
actually gives you something to compare or assert. A gallery component may be
inserted mid-article or right before the closing CTA if one was selected —
never invent a gallery if the user chose none.`,
};
