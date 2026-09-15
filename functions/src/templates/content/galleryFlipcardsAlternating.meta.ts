import type { GalleryStaticMeta } from '../types';

export const galleryFlipcardsAlternatingMeta: GalleryStaticMeta = {
  id: 'gallery-flipcards-alternating',
  label: 'Flip-card gallery',
  blurb: 'Cards that flip on click or hover — the photo and project on the front, the insight behind it on the back.',
  itemMin: 3,
  itemMax: 8,
  // No 'none': the back of the card IS the caption, so a card with no text
  // flips over to a blank face. See the note on supportedCaptionModes.
  supportedCaptionModes: ['manual', 'auto'],
  defaultCaptionMode: 'auto',
  structureNotes: `A grid of cards — one per photo — that flip in place on click or hover.
Use every gallery photo you're given, in the order given, up to 8. (The
layout composes itself for the count, including a wide feature card when
the count is odd — don't try to control it.)

intro (optional): a short editorial heading so the gallery doesn't arrive
unannounced — an eyebrow of 2 to 5 words (e.g. "The work, up close") and
optionally one line on what the reader is about to explore. Set it to null
if the surrounding text already sets the gallery up.

alt, per photo: an objective description of what's visible. This is where
description goes — and only here.

Front (label): the project or theme, in a few words.

Back (body): the reward for flipping the card. Never describe the photo
again. Give the insight — why this project or moment mattered, the design
decision that made it work, what it changed for the people in it. One or
two sentences. If you can't say anything beyond what's visible, keep it
short and specific rather than descriptive.

projectLine: names the real project (and client, if the brief names one).
Only when the brief or the photo itself ties this photo to that project —
otherwise null. Attaching a real project name to an unrelated photo is a
factual error.`,
};
