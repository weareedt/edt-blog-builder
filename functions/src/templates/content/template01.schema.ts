import { z } from 'zod';
import { CATEGORY_IDS } from '../types';

// See the file-layout note in template03.schema.ts.

const roundupEntry = z.object({
  windowLabel: z.string().min(2).max(24), // the .os-titlebar "name", e.g. "IKAT.EXE"
  projectName: z.string().min(2).max(60),
  category: z.string().min(2).max(30), // the highlighted blue tag, e.g. "VR Training"
  client: z.string().max(40).nullable(), // renders as "Client — {client}"; omitted entirely if null
  blurb: z.string().min(180).max(720),
  statLine: z.string().min(4).max(120),
  /** Optional. Unset → the template's .media-slot-label placeholder renders. */
  imageId: z.string().nullable(),
  imageAlt: z.string().max(160).nullable(),
});

export const template01Content = z.object({
  title: z.string().min(8).max(90),
  dek: z.string().min(40).max(300),
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
  readTimeMinutes: z.number().int().min(2).max(30),
  intro: z.string().min(40).max(900).nullable(),
  entries: z.array(roundupEntry).min(3).max(12),
  cta: z
    .object({
      heading: z.string().min(3).max(90),
      body: z.string().min(10).max(400),
    })
    .nullable(),
  galleryPlacement: z.enum(['after-intro', 'end-of-article']).nullable(),
});

export type Template01Content = z.infer<typeof template01Content>;
export type RoundupEntry = z.infer<typeof roundupEntry>;
