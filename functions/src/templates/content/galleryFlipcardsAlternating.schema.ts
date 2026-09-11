import { z } from 'zod';

// See the file-layout note in template03.schema.ts — this is real logic and
// lives under functions/src, while the .hbs + example-content.json for this
// gallery live under templates/annotated/gallery-flipcards-alternating/.

const flipCardItem = z.object({
  imageId: z.string().min(1), // a gallery item is always a photo
  label: z.string().min(2).max(40), // short front-facing label, e.g. "VR Training"
  body: z.string().min(20).max(220), // back-of-card description
  projectLine: z.string().min(2).max(80), // e.g. "MetaHRise — MCMC", or just a project name with no client
});

export const galleryFlipcardsAlternatingContent = z.object({
  items: z.array(flipCardItem).min(3).max(8),
});

export type GalleryFlipcardsAlternatingContent = z.infer<typeof galleryFlipcardsAlternatingContent>;
export type FlipCardItem = z.infer<typeof flipCardItem>;
