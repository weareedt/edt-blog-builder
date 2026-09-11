import type { TemplateStaticMeta } from '../types';

export const template02Meta: TemplateStaticMeta = {
  id: 'template-02-longform-numbered-steps',
  label: 'Long-form numbered steps',
  blurb: 'A single deep-dive story told as numbered steps — brief, approach, build, results, retro — with one optional feature image and per-step highlights.',
  supportedGalleryPlacements: ['after-intro', 'before-cta'],
  images: {
    minInline: 0,
    maxInline: 1,
    galleryMin: 3,
    galleryMax: 8,
    note: 'At most one feature image, shown once near the top. It is optional — omit it if no suitable photo was uploaded.',
  },
  structureNotes: `This template tells one story in depth, as a sequence of
numbered steps (a brief, an approach, what was built, the results, a
retro — the exact beats depend on the brief, not a fixed list). Use
3 to 8 steps; most stories need 4-6. Each step has a short section
label (e.g. "The brief"), and 1-3 paragraphs of body copy. A step may
end with at most one highlight — a pull-quote, a stat-card (1-4
number+label results), or a short tag list — never more than one, and
never force one onto every step; most stories only need highlights on
a couple of the strongest steps. The template supports one optional
feature image near the top with a caption; omit it if no suitable
photo was uploaded rather than reusing an unrelated one. An optional
gallery may be inserted after the intro or just before the CTA, if
one was selected.`,
};
