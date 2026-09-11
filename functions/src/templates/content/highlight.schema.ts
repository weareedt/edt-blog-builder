import { z } from 'zod';

// Shared by template-02 (one highlight per numbered step) and template-04
// (freestanding highlights in a flat body flow) — same three highlight
// kinds, same constraints, in both designs.
export const highlightSchema = z.discriminatedUnion('type', [
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

export type Highlight = z.infer<typeof highlightSchema>;
