import type { GalleryStaticMeta } from '../types';

export const galleryFlipcardsAlternatingMeta: GalleryStaticMeta = {
  id: 'gallery-flipcards-alternating',
  label: 'Flip-card gallery',
  blurb: 'A grid of cards that flip on click/hover to reveal a project blurb behind the photo.',
  itemMin: 3,
  itemMax: 8,
  structureNotes: `A grid of cards — one per photo — that flip in place on click or hover to
reveal a short description on the back. Use as many cards as the brief
and available images support, typically 5 to 6, never fewer than 3 or
more than 8. Each card needs a short front-facing label (e.g. "VR
Training"), a one- to two-sentence back-of-card description of what was
built, and a project line naming the real project (see the known
projects list) and its client, if the brief names a real client — a
project name alone is fine when there is no client to credit.`,
};
