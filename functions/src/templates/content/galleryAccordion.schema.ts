import { z } from 'zod';
import { galleryIntroSchema } from './insert.schema';

// See the file-layout note in template03.schema.ts — this is real logic and
// lives under functions/src, while the .hbs + example-content.json for this
// gallery live under templates/annotated/gallery-accordion/.

// Every caption field is nullable, and deliberately so. When these were
// required, the model had no way to express "I can't tell what this photo
// is" — so it filled the slot from the known-projects list and captioned
// unrelated stock photos with real EDT project names. Nullable fields give
// it somewhere honest to land; see the caption guidance in the meta, and
// GalleryCaptionMode in ../types for the modes that skip the model entirely.
// The max lengths are real layout constraints — the caption sits in a
// single non-wrapping line over the photo. There are deliberately no min
// lengths: this same shape is built from hand-typed captions in 'manual'
// mode (see galleryFromImages.ts), where "Gate 3" is a perfectly good
// title. Length *guidance* for the model lives in the meta's prose.
const panelItem = z.object({
  imageId: z.string().min(1), // a gallery item is always a photo
  alt: z.string().max(240).nullish(), // objective description of what's visible
  tag: z.string().max(28).nullable(),
  title: z.string().max(48).nullable(),
  metric: z.string().max(90).nullable(),
});

export const galleryAccordionContent = z.object({
  items: z.array(panelItem).min(3).max(8),
  intro: galleryIntroSchema,
});

export type GalleryAccordionContent = z.infer<typeof galleryAccordionContent>;
export type PanelItem = z.infer<typeof panelItem>;
