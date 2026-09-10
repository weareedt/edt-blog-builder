import { z } from 'zod';
import { CATEGORY_IDS } from '../types';

// Note on file layout: this schema is real TypeScript logic, so it lives
// directly under functions/src (imported by generateArticle and tests)
// rather than under the repo-root templates/annotated/ directory, which
// holds only design DATA (the .hbs source and example-content.json) that
// scripts/build-template-registry.mjs embeds as string/JSON literals into
// functions/src/templates/generated/registry.ts.

const contentBlock = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('paragraph'),
    richText: z.string().min(1).max(1200),
  }),
  z.object({
    kind: z.literal('bulletList'),
    items: z.array(z.string().min(1).max(220)).min(2).max(6),
  }),
  z.object({
    kind: z.literal('comparisonTable'),
    columns: z.array(z.string().min(1).max(40)).min(2).max(5),
    rows: z.array(z.array(z.string().min(1).max(120)).min(2).max(5)).min(2).max(6),
  }),
  z.object({
    kind: z.literal('closingNote'),
    body: z.string().min(1).max(600),
  }),
]);

const sectionItem = z.object({
  type: z.literal('section'),
  heading: z.string().min(3).max(70),
  /** Optional short label for the TOC, when the full heading runs long. Falls back to `heading`. */
  navLabel: z.string().min(3).max(50).nullable(),
  blocks: z.array(contentBlock).min(1).max(5),
});

// A standalone aside between sections — no heading, no TOC entry, never
// observed by the scrollspy. Modeled as a top-level body item (a sibling
// of sections) rather than a block *inside* a section, matching exactly
// how the original template nests `.callout` in the DOM.
const calloutItem = z.object({
  type: z.literal('callout'),
  label: z.string().min(1).max(60),
  body: z.string().min(1).max(600),
});

const bodyItem = z.discriminatedUnion('type', [sectionItem, calloutItem]);

export const template03Content = z
  .object({
    title: z.string().min(8).max(90),
    dek: z.string().min(40).max(260),
    category: z.enum(CATEGORY_IDS as [string, ...string[]]),
    readTimeMinutes: z.number().int().min(2).max(30),
    lede: z.string().min(40).max(700),
    bodyItems: z.array(bodyItem).min(3).max(11),
    cta: z
      .object({
        heading: z.string().min(3).max(90),
        body: z.string().min(10).max(400),
      })
      .nullable(),
    galleryPlacement: z.enum(['mid-article', 'before-cta']).nullable(),
  })
  .refine(
    (content) => {
      const sectionCount = content.bodyItems.filter((item) => item.type === 'section').length;
      return sectionCount >= 3 && sectionCount <= 9;
    },
    { message: 'bodyItems must contain between 3 and 9 sections (callouts do not count).' }
  );

export type Template03Content = z.infer<typeof template03Content>;
export type BodyItem = z.infer<typeof bodyItem>;
export type SectionItem = z.infer<typeof sectionItem>;
export type CalloutItem = z.infer<typeof calloutItem>;
