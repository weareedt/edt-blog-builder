import type { TemplateStaticMeta } from '../types';

export const template04Meta: TemplateStaticMeta = {
  id: 'template-04-basic-scroll',
  label: 'Basic scroll',
  blurb: 'A single deep-dive story told as a flat scroll of labelled sections — the same story format as long-form numbered steps, without the step numbering.',
  supportedGalleryPlacements: ['after-intro', 'before-cta'],
  images: {
    minInline: 0,
    maxInline: 1,
    galleryMin: 3,
    galleryMax: 8,
    note: 'At most one feature image, shown once near the top. It is optional — omit it if no suitable photo was uploaded.',
  },
  structureNotes: `This template tells one story in depth as a flat, continuously
scrolling sequence of labelled sections (a brief, an approach, what was
built, the results, a retro — the exact beats depend on the brief, not a
fixed list) — the same kind of story as the numbered-steps template,
without step numbers. Use 3 to 8 sections; most stories need 4-6. Each
section has a short label (e.g. "The brief") and 1-3 paragraphs of body
copy. Between sections, a freestanding highlight may appear — a
pull-quote, a stat-card (1-4 number+label results), or a short tag list
— never force one in after every section; most stories only need
highlights after a couple of the strongest sections. The template
supports one optional feature image near the top with a caption; if no
suitable photo was uploaded, set featureImage to the JSON literal null
— never a string, and never reusing an unrelated photo. An optional
gallery may be inserted after the intro or just before
the CTA, if one was selected.`,
};
