import { z } from 'zod';
import { CATEGORY_IDS } from '../types';
import { highlightSchema } from './highlight.schema';
import { videoIntroSchema } from './insert.schema';

// See the file-layout note in template03.schema.ts.

const sectionItem = z.object({
  type: z.literal('section'),
  sectionLabel: z.string().min(3).max(60), // e.g. "The brief"
  paragraphs: z.array(z.string().min(40).max(900)).min(1).max(3),
});

// A freestanding highlight between sections — unlike template-02, this
// template has no numbered-step wrapper for a highlight to attach to, so
// it's modeled as its own top-level body item, a sibling of sections.
const highlightItem = z.object({
  type: z.literal('highlight'),
  highlight: highlightSchema,
});

const bodyItem = z.discriminatedUnion('type', [sectionItem, highlightItem]);

export const template04Content = z
  .object({
    title: z.string().min(8).max(90),
    dek: z.string().min(40).max(300),
    category: z.enum(CATEGORY_IDS as [string, ...string[]]),
    readTimeMinutes: z.number().int().min(2).max(30),
    client: z.string().min(2).max(60).nullable(),
    featureImage: z
      .object({
        windowLabel: z.string().min(2).max(60), // e.g. "METAHRISE.EXE — FIELD_CAPTURE.JPG"
        alt: z.string().max(240).nullish(), // objective description of what's visible
        caption: z.string().max(200).nullable(), // why it matters — never a description
        imageId: z.string(),
      })
      .nullable(),
    lede: z.string().min(40).max(700),
    bodyItems: z.array(bodyItem).min(3).max(14),
    closing: z.string().min(20).max(600).nullable(),
    cta: z
      .object({
        heading: z.string().min(3).max(90),
        body: z.string().min(10).max(400),
      })
      .nullable(),
    galleryPlacement: z.enum(['after-intro', 'mid-article', 'before-cta']).nullable(),
    galleryAfterSection: z.number().int().min(0).max(20).nullish(), // only for 'mid-article'
    /** Only set when the brief includes a video to place — see buildPrompt. 0 = before the first section. */
    videoAfterSection: z.number().int().min(0).max(20).nullish(),
    videoIntro: videoIntroSchema,
  })
  .refine(
    (content) => {
      const sectionCount = content.bodyItems.filter((item) => item.type === 'section').length;
      return sectionCount >= 3 && sectionCount <= 8;
    },
    { message: 'bodyItems must contain between 3 and 8 sections (highlights do not count).' }
  );

export type Template04Content = z.infer<typeof template04Content>;
export type BodyItem = z.infer<typeof bodyItem>;
export type SectionItem = z.infer<typeof sectionItem>;
export type HighlightItem = z.infer<typeof highlightItem>;
