import type { TemplateStaticMeta } from '../types';

export const template02Meta: TemplateStaticMeta = {
  id: 'template-02-longform-numbered-steps',
  label: 'Long-form numbered sequence',
  blurb: 'One idea told as a numbered sequence — steps, lessons, principles, examples or projects — with an optional hero photo and occasional highlights.',
  supportedGalleryPlacements: ['after-intro', 'mid-article', 'before-cta'],
  images: {
    minInline: 0,
    maxInline: 1,
    galleryMin: 3,
    galleryMax: 8,
    note: 'At most one hero photo, shown near the top. If the user uploaded a hero photo, it is always that one.',
  },
  structureNotes: `One article told as a numbered sequence. The template prints the numbers
(01, 02, 03…) beside each item itself, so never put a number in a section
label: "VR as a training tool", not "1. VR as a training tool".

The sequence can be the stages of one project, lessons, principles, ideas,
examples or projects — whatever the brief's material naturally is. Pick one
kind and hold it: every numbered item should be the same kind of thing. If
one item in the brief is a different kind (four technologies and one design
principle, say), don't number it alongside the others — make it the tension
the lede opens on, the closing paragraph that ties the rest together, or
name the shift explicitly in its label. Use 3 to 8 items; most articles
need 4 to 6. Each item has a short label and 1 to 3 paragraphs.

Highlights: an item may end with at most one — a callout line (a pullQuote
with attribution null), a real quote from the brief, a stat card, or a short
tag list. Most items should have none; two across a whole article is plenty,
and none is fine. Follow the evidence rules for stat cards and quotes.

Hero photo (featureImage): optional, shown once near the top. It takes an
alt (objective description of what's visible), a caption (why it matters,
or null) and a short all-caps windowLabel. If there's no suitable photo, set
featureImage to the JSON literal null.

Closing: optional. It resolves the argument; it never recaps the items.`,
};
