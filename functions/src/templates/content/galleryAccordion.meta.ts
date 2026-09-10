import type { GalleryStaticMeta } from '../types';

export const galleryAccordionMeta: GalleryStaticMeta = {
  id: 'gallery-accordion',
  label: 'Accordion gallery',
  blurb: 'Horizontal panels that expand on hover, each with a tag, title, and a real metric.',
  itemMin: 3,
  itemMax: 8,
  structureNotes: `A row of horizontal panels — one per photo — that expand on hover to reveal
a caption. Use as many panels as the brief and available images support,
typically 5 to 6, never fewer than 3 or more than 8. Each panel needs a
short tag (e.g. "AR Event"), a title (a real project name — see the known
projects list — or a name supplied in the brief), and a one-line metric
that states a concrete, real result (a number, a percentage, a count) —
never a vague claim like "great results." If no real metric is available
for a panel, write a short factual description instead of inventing a
number.`,
};
