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
  structureNotes: `A standard article with a sticky, scroll-spied table of contents down the
side. The body is a sequence of sections, each with a heading and one to
five content blocks. Use as many sections as the argument genuinely needs —
typically 5 to 7, never fewer than 3 or more than 9. The TOC makes the
structure visible, so make sure the headings read as one coherent sequence;
if one section is a different kind of thing from the rest, frame it as such
in its heading. Never put a number in a heading.

Each section may set a short navLabel for the TOC when its heading runs long
(most don't need one — leave it null).

A section's blocks may mix: a paragraph, a short bullet list (2-6 items), a
comparison table (2-5 columns, 2-6 rows) only where the brief gives real
things to compare, or — in the final section only — a short closing note
that resolves the argument. Between sections, a callout (label + one line)
can pull out a single claim worth stopping on; one or two per article at
most, and none is fine.`,
};
