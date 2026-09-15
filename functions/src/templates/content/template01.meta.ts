import type { TemplateStaticMeta } from '../types';

export const template01Meta: TemplateStaticMeta = {
  id: 'template-01-case-study-roundup',
  label: 'Case study roundup',
  blurb: 'A roundup of project entries, each with a media panel framed as an OS window, tags, a blurb, and an optional result line.',
  supportedGalleryPlacements: ['after-intro', 'mid-article', 'end-of-article'],
  images: {
    minInline: 0,
    maxInline: 12,
    galleryMin: 3,
    galleryMax: 8,
    note: 'Each entry can carry one photo. An entry without one simply skips the photo panel — that is normal for this template.',
  },
  structureNotes: `A roundup of case-study entries, alternating media-left and media-right
(the renderer handles the alternation — never ask for it). A roundup still
needs a point of view: the intro says what these projects have in common or
what they show together, rather than announcing that a list follows.

Each entry is one project: a media panel framed as an "OS window" with a
short all-caps label (e.g. "IKAT.EXE" — a punchy abbreviation, not
necessarily the literal name), a category tag (e.g. "VR Training"), an
optional client tag, and a blurb of roughly 200-500 characters that says
what the project proved or why it was built the way it was — not just what
it is. statLine is a one-line real result (a number, a percentage, an
award) from the brief or the known projects; if there isn't one, set it to
null rather than writing a vague claim.

imageAlt, when an entry has a photo, objectively describes what's visible.
Use as many entries as the brief and the photos actually support — typically
5 to 8, never fewer than 3 or more than 12. An entry doesn't need a photo.`,
};
