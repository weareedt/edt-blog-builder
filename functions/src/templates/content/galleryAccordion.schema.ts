import { z } from 'zod';

// See the file-layout note in template03.schema.ts — this is real logic and
// lives under functions/src, while the .hbs + example-content.json for this
// gallery live under templates/annotated/gallery-accordion/.

const panelItem = z.object({
  imageId: z.string().min(1), // a gallery item is always a photo
  tag: z.string().min(2).max(28),
  title: z.string().min(2).max(48),
  metric: z.string().min(2).max(90),
});

export const galleryAccordionContent = z.object({
  items: z.array(panelItem).min(3).max(8),
});

export type GalleryAccordionContent = z.infer<typeof galleryAccordionContent>;
export type PanelItem = z.infer<typeof panelItem>;
