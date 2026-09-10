import type { TemplateStaticMeta } from '../types';

export const template01Meta: TemplateStaticMeta = {
  id: 'template-01-case-study-roundup',
  label: 'Case study roundup',
  blurb: 'A roundup of project entries, each with a media panel framed as an OS window, tags, a blurb, and a stat line.',
  supportedGalleryPlacements: ['after-intro', 'end-of-article'],
  images: {
    minInline: 0,
    maxInline: 12,
    galleryMin: 3,
    galleryMax: 8,
    note: 'Each entry can carry one photo. An entry without one shows a labelled placeholder panel — that is normal for this template.',
  },
  structureNotes: `This template is a roundup of case-study entries, alternating media-left
and media-right (the renderer handles the alternation — never ask for it).
Each entry is one project: a media panel framed as an "OS window" with a
short all-caps label (e.g. "IKAT.EXE" — a punchy abbreviation of the
project, not necessarily the literal project name), a category tag (e.g.
"VR Training"), an optional client tag, a blurb of roughly 200-500
characters, and a one-line stat that states something concrete and real
(a number, a percentage, an award) — never a vague claim. Use as many
entries as the brief and the available images actually support —
typically 5 to 8, never fewer than 3 or more than 12. An entry does not
require an image; entries without one render a labelled placeholder
panel, which is normal in this design — do not pad the blurb to
compensate. An optional intro paragraph sets up the roundup; an optional
gallery component may be inserted after the intro or at the end of the
article, if one was selected.`,
};
