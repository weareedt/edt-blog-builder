import { z } from 'zod';

// See the file-layout note in template03.schema.ts — this is real logic and
// lives under functions/src, while the .hbs + example-content.json for this
// gallery live under templates/annotated/gallery-flipcards-alternating/.

// Nullable for the same reason as the accordion's panel fields — see the
// note in galleryAccordion.schema.ts. `projectLine` is the one most prone
// to misattribution (it exists purely to name a real project), so the meta
// tells the model to leave it null unless the brief ties this specific
// photo to a project.
// No min lengths, for the reason given in galleryAccordion.schema.ts —
// this shape is also built from hand-typed captions. The maxes are real:
// the card back is a fixed-size face and long copy overflows it.
const flipCardItem = z.object({
  imageId: z.string().min(1), // a gallery item is always a photo
  label: z.string().max(40).nullable(), // short front-facing label, e.g. "VR Training"
  body: z.string().max(220).nullable(), // back-of-card description
  projectLine: z.string().max(80).nullable(), // e.g. "MetaHRise — MCMC", or just a project name with no client
});

export const galleryFlipcardsAlternatingContent = z.object({
  items: z.array(flipCardItem).min(3).max(8),
});

export type GalleryFlipcardsAlternatingContent = z.infer<typeof galleryFlipcardsAlternatingContent>;
export type FlipCardItem = z.infer<typeof flipCardItem>;
