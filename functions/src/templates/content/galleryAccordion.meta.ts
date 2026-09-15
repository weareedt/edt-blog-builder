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
reveal a caption. Use as many panels as the brief and available images
support, typically 5 to 6, never fewer than 3 or more than 8.

Captions describe THE PHOTO IN FRONT OF YOU. Each image is shown to you
directly — look at it and write about what it actually depicts. Do not
reach for the known-projects list to name a panel: name a project only
when the brief says this photo is from that project, or the photo itself
plainly shows it (a recognisable logo, an on-screen title). A generic
photo of someone wearing a headset is "VR headset session", not the name
of a real EDT project that happens to involve headsets — attaching a real
project name to an unrelated stock photo is a factual error, not a
stylistic one.

Each panel takes three optional fields: a short tag (e.g. "AR Event"), a
title, and a one-line detail. Every one of them may be null. Prefer null
over filler: if you cannot tell what a photo shows, set all three to null
and let the photo stand on its own. If a concrete, real result is
available for a panel (a number, a percentage, a count), the detail line
is the place for it — but never invent one, and never write a vague claim
like "great results" to fill the slot.`,
};
