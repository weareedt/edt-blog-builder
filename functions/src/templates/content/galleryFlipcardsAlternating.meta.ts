import type { GalleryStaticMeta } from '../types';

export const galleryFlipcardsAlternatingMeta: GalleryStaticMeta = {
  id: 'gallery-flipcards-alternating',
  label: 'Flip-card gallery',
  blurb: 'A grid of cards that flip on click/hover to reveal a blurb behind the photo.',
  itemMin: 3,
  itemMax: 8,
  // No 'none': the back of the card IS the caption, so a card with no text
  // flips over to a blank face. See the note on supportedCaptionModes.
  supportedCaptionModes: ['manual', 'auto'],
  defaultCaptionMode: 'auto',
  structureNotes: `A grid of cards — one per photo — that flip in place on click or hover to
reveal a short description on the back. Use as many cards as the brief
and available images support, typically 5 to 6, never fewer than 3 or
more than 8.

Card text describes THE PHOTO IN FRONT OF YOU. Each image is shown to you
directly — look at it and write about what it actually depicts. Do not
reach for the known-projects list to name a card: name a project only
when the brief says this photo is from that project, or the photo itself
plainly shows it (a recognisable logo, an on-screen title). A generic
photo of someone wearing a headset is "VR headset session", not the name
of a real EDT project that happens to involve headsets — attaching a real
project name to an unrelated stock photo is a factual error, not a
stylistic one.

Each card takes a short front-facing label (e.g. "VR Training"), a one-
to two-sentence back-of-card description, and an optional project line.
Because the card flips to reveal the description, the label and the
description should both be filled in wherever you can tell what the photo
shows. The project line is for naming a real project and its client, and
is the field most likely to be wrong — leave it null unless the brief
names one for this specific photo.`,
};
