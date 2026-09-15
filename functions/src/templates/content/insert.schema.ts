import { z } from 'zod';

/**
 * The short setup above a video interlude — an eyebrow ("See it in motion")
 * and optionally one line on what to watch for. Lets a video sit between
 * sections as its own beat instead of reading as part of the section above.
 */
export const videoIntroSchema = z
  .object({
    eyebrow: z.string().max(32),
    line: z.string().max(180).nullable(),
  })
  .nullish();

/** The optional editorial heading above a gallery — e.g. "The work, up close" plus one line. */
export const galleryIntroSchema = z
  .object({
    eyebrow: z.string().max(40),
    line: z.string().max(180).nullable(),
  })
  .nullish();
