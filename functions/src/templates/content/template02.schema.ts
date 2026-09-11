import { z } from 'zod';
import { CATEGORY_IDS } from '../types';

// See the file-layout note in template03.schema.ts.

const stepHighlight = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('pullQuote'),
    quote: z.string().min(10).max(300),
    attribution: z.string().min(3).max(80),
  }),
  z.object({
    type: z.literal('statCard'),
    windowLabel: z.string().min(2).max(30), // e.g. "RESULTS.EXE"
    cells: z
      .array(
        z.object({
          number: z.string().min(1).max(20), // e.g. "93%" — a short display value, not necessarily numeric
          label: z.string().min(3).max(90),
        })
      )
      .min(1)
      .max(4),
  }),
  z.object({
    type: z.literal('tagList'),
    tags: z.array(z.string().min(2).max(30)).min(1).max(4), // first tag renders highlighted
  }),
]);

const step = z.object({
  sectionLabel: z.string().min(3).max(60), // e.g. "The brief"
  paragraphs: z.array(z.string().min(40).max(900)).min(1).max(3),
  /** At most one trailing highlight per step — matches the source design exactly. */
  highlight: stepHighlight.nullable(),
});

export const template02Content = z.object({
  title: z.string().min(8).max(90),
  dek: z.string().min(40).max(300),
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
  readTimeMinutes: z.number().int().min(2).max(30),
  client: z.string().min(2).max(60).nullable(),
  featureImage: z
    .object({
      windowLabel: z.string().min(2).max(60), // e.g. "METAHRISE.EXE — FIELD_CAPTURE.JPG"
      caption: z.string().min(10).max(200),
      imageId: z.string(),
    })
    .nullable(),
  lede: z.string().min(40).max(700),
  steps: z.array(step).min(3).max(8),
  closing: z.string().min(20).max(600).nullable(),
  cta: z
    .object({
      heading: z.string().min(3).max(90),
      body: z.string().min(10).max(400),
    })
    .nullable(),
  galleryPlacement: z.enum(['after-intro', 'before-cta']).nullable(),
});

export type Template02Content = z.infer<typeof template02Content>;
export type Step = z.infer<typeof step>;
export type StepHighlight = z.infer<typeof stepHighlight>;
