import type { GalleryStaticMeta } from '../types';

export const galleryAccordionMeta: GalleryStaticMeta = {
  id: 'gallery-accordion',
  label: 'Accordion gallery',
  blurb: 'Horizontal panels that expand on hover, each optionally captioned.',
  itemMin: 3,
  itemMax: 8,
  supportedCaptionModes: ['none', 'manual', 'auto'],
  // The panels read fine as pure photography — the expand-on-hover is the
  // point, and an uncaptioned panel loses nothing structurally. So this one
  // defaults to letting the photos speak for themselves.
  defaultCaptionMode: 'none',
  structureNotes: `A row of horizontal panels — one per photo — that expand on hover to
reveal a caption. Use every gallery photo you're given, in the order given,
up to 8.

intro (optional): a short editorial heading so the gallery doesn't arrive
unannounced — an eyebrow of 2 to 5 words (e.g. "The work, up close") and
optionally one line on what the reader is about to look at. Set it to null
if the surrounding text already sets the gallery up.

alt, per photo: an objective description of what's visible.

Captions describe the moment in THE PHOTO IN FRONT OF YOU, not a guess at a
project. Name a project only when the brief says this photo is from it, or
the photo plainly shows it (a recognisable logo, an on-screen title) —
attaching a real project name to an unrelated photo is a factual error.
Each panel takes an optional tag, title and one-line detail; any may be
null, and null is better than filler. Use the detail line for a real result
only if the brief gives one — never invent one.`,
};
