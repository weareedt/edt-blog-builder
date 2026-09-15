import type { TemplateStaticMeta } from '../types';

export const template04Meta: TemplateStaticMeta = {
  id: 'template-04-basic-scroll',
  label: 'Basic scroll',
  blurb: 'One story told as a flowing scroll of labelled sections — no numbering — with an optional hero photo and occasional highlights.',
  supportedGalleryPlacements: ['after-intro', 'mid-article', 'before-cta'],
  images: {
    minInline: 0,
    maxInline: 1,
    galleryMin: 3,
    galleryMax: 8,
    note: 'At most one hero photo, shown near the top — only the photo uploaded as the hero. No hero upload, no hero image.',
  },
  structureNotes: `One story told in depth as a flowing scroll of labelled sections, with no
numbering. The beats come from the brief, not a fixed list — a project
story might move from the brief to the approach to what was built to what
it changed, while an idea-led piece moves through its argument. Use 3 to 8
sections; most stories need 4 to 6. Each section has a short label and 1 to
3 paragraphs. Never put a number in a label.

Between sections, a freestanding highlight may appear: a callout line (a
pullQuote with attribution null), a real quote from the brief, a stat card,
or a short tag list. Most stories need one or two at most, placed after the
strongest sections; none is fine. Never put two highlights back to back,
and follow the evidence rules for stat cards and quotes.

Hero photo (featureImage): optional, shown once near the top. It takes an
alt (objective description of what's visible), a caption (why it matters,
or null) and a short all-caps windowLabel. It is only ever the photo the
user uploaded as the hero; with no hero upload, featureImage is null.

Closing: optional. It resolves the story; it never recaps the sections.`,
};
