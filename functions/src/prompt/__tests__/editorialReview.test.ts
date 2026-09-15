import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  repairArticleContent,
  reviewArticleContent,
  reviewGalleryContent,
} from '../editorialReview';
import { template02Content } from '../../templates/content/template02.schema';
import { galleryFlipcardsAlternatingContent } from '../../templates/content/galleryFlipcardsAlternating.schema';

const ANNOTATED = join(__dirname, '..', '..', '..', '..', 'templates', 'annotated');

/**
 * Regression case: the "Five Ways Immersive Technology Actually Changes a
 * Space" article (step-by-step template + flip-card gallery), reduced to the
 * copy that showed each problem. Every issue called out in review of that
 * article should be caught here — by review (needs a rewrite) or by repair
 * (fixed in code).
 */
const REGRESSION_CTX = {
  brief:
    'Insights article: five ways immersive technology changes a space — VR for training, AR for heritage and festivals, immersive rooms, interactive walls, and why storytelling should lead the tech. Reference our real projects.',
  angle: null,
  keyPoints: [],
};

const REGRESSION_ARTICLE = template02Content.parse({
  title: 'Five Ways Immersive Technology Actually Changes a Space',
  dek: "VR, AR, immersive rooms and interactive tech get lumped together as one buzzword. They're not the same tool. Here's what each one is actually good for, and what we've built with them.",
  category: 'Insights',
  readTimeMinutes: 7,
  client: null,
  featureImage: {
    windowLabel: 'FIELD_NOTES.EXE — SITE_CAPTURE.JPG',
    alt: 'A government delegate tries a VR headset on the exhibition floor, controllers in hand, colleagues watching over his shoulder.',
    caption: 'A government delegate tries a VR headset on the exhibition floor, controllers in hand, colleagues watching over his shoulder.',
    imageId: 'img-1',
  },
  lede: '"Immersive technology" gets used as one word for five different tools. VR, AR, projection-mapped rooms and interactive walls solve different problems and fail in different ways when you use the wrong one.',
  steps: [
    {
      sectionLabel: '1. VR can turn training into an experience',
      paragraphs: [
        'Most training fails for the same reason: people are told information instead of put inside it. VR fixes that by making the environment the teacher.',
        "Walk the wrong way in a headset and you find out immediately, in the environment. That's a harder brief than it sounds.",
      ],
      highlight: {
        type: 'pullQuote',
        quote: "You can't VR your way out of boring content. You have to change what the person is doing while they learn it.",
        attribution: '— EDT, on building MetaHRise',
      },
    },
    {
      sectionLabel: '2. AR can add digital layers to real places',
      paragraphs: ['CheritAR puts a guide on a heritage building the moment a phone points at it, and ARFestKL scaled the idea to festival crowds.'],
      highlight: { type: 'tagList', tags: ['AR Heritage', 'Location-Based AR'] },
    },
    {
      sectionLabel: '3. Immersive rooms transform physical environments',
      paragraphs: ['IKAT Malaysia staged the history of ikat weaving as a walkable environment rather than a wall of text and glass cases.'],
      highlight: null,
    },
    {
      sectionLabel: '4. Interactive tech turns audiences into participants',
      paragraphs: ["The AirAsia Founders' Gallery combines interactive walls, AR overlays and an AI layer into one permanent gallery."],
      highlight: {
        type: 'statCard',
        windowLabel: 'BUILT.EXE',
        cells: [
          { number: '3', label: 'Layers combined in one gallery — interactive walls, AR, AI' },
          { number: '1', label: 'Permanent interactive wall, told in a tower lobby' },
        ],
      },
    },
    {
      sectionLabel: '5. Storytelling should lead the tech',
      paragraphs: ['None of the above works if the technology comes first. Every project on this list started as a story or a problem, not a platform.'],
      highlight: null,
    },
  ],
  closing: "Five categories, one rule that held across all of them: the technology has to disappear into the experience, or it's just a gadget in the room.",
  cta: {
    heading: 'Not sure which of these five you need?',
    body: 'Tell us the space, the audience, and what you want them to walk away doing differently.',
  },
  galleryPlacement: 'before-cta',
});

const REGRESSION_FLIP_BACKS = galleryFlipcardsAlternatingContent.parse({
  items: [
    { imageId: 'a', label: 'VR Training', body: 'A trainee steadies himself in a headset, controllers raised, while colleagues watch the environment play out on a laptop screen.', projectLine: null },
    { imageId: 'b', label: 'Immersive Room', body: 'A group stands inside a wraparound projection of pink and violet nebulae, phones out.', projectLine: 'New Balance Grey Day' },
    { imageId: 'c', label: 'Responsive Spaces', body: 'A woman holding a child reaches out and the projected starfield reacts to her hand.', projectLine: null },
    { imageId: 'd', label: 'Living Heritage', body: 'Visitors pause mid-walkthrough, lit by shifting projections on all sides.', projectLine: 'IKAT Malaysia' },
  ],
});

describe('editorial review — immersive-tech regression article', () => {
  const issues = reviewArticleContent('template-02-longform-numbered-steps', REGRESSION_ARTICLE, REGRESSION_CTX);
  const has = (fragment: string) => issues.some((i) => i.includes(fragment));

  it('catches stock AI phrasing', () => {
    expect(has('"Most X fail(s) for the same reason"')).toBe(true);
    expect(has('"harder than it sounds"')).toBe(true);
  });

  it('catches an opening that restates the dek', () => {
    expect(has('restates the dek')).toBe(true);
  });

  it('catches a closing and CTA that count the sections back', () => {
    expect(issues.some((i) => i.startsWith('closing counts'))).toBe(true);
    expect(issues.some((i) => i.startsWith('cta.heading counts'))).toBe(true);
  });

  it('catches a stat card built from numbers that were never in the brief', () => {
    expect(has('steps[3].highlight.cells[0] ("3")')).toBe(true);
    expect(has('steps[3].highlight.cells[1] ("1")')).toBe(true);
  });

  it('catches a caption that just repeats the alt text', () => {
    expect(has('featureImage.caption repeats the alt text')).toBe(true);
  });

  it('catches flip-card backs that describe the photo instead of giving an insight', () => {
    const galleryIssues = reviewGalleryContent('gallery-flipcards-alternating', REGRESSION_FLIP_BACKS);
    for (const i of [0, 1, 2, 3]) {
      expect(galleryIssues.some((g) => g.startsWith(`items[${i}].body describes the photo`))).toBe(true);
    }
  });
});

describe('editorial repair — immersive-tech regression article', () => {
  const repaired = repairArticleContent('template-02-longform-numbered-steps', REGRESSION_ARTICLE, REGRESSION_CTX);

  it('strips numbers the template already prints from step labels', () => {
    expect(repaired.steps.map((s) => s.sectionLabel)).toEqual([
      'VR can turn training into an experience',
      'AR can add digital layers to real places',
      'Immersive rooms transform physical environments',
      'Interactive tech turns audiences into participants',
      'Storytelling should lead the tech',
    ]);
  });

  it('turns generated copy presented as an EDT quote into an unattributed callout', () => {
    expect(repaired.steps[0].highlight).toMatchObject({ type: 'pullQuote', attribution: null });
  });

  it('drops a stat card whose numbers are all unsupported', () => {
    expect(repaired.steps[3].highlight).toBeNull();
  });

  it('drops a caption that only repeats the alt text', () => {
    expect(repaired.featureImage).toMatchObject({ caption: null });
    expect(repaired.featureImage?.alt).toContain('government delegate');
  });

  it('still satisfies the template schema', () => {
    expect(() => template02Content.parse(repaired)).not.toThrow();
  });

  it('keeps a real quote attributed when the brief actually contains it', () => {
    const ctx = {
      ...REGRESSION_CTX,
      brief: `${REGRESSION_CTX.brief} Our lead designer said: "You can't VR your way out of boring content. You have to change what the person is doing while they learn it."`,
    };
    const kept = repairArticleContent('template-02-longform-numbered-steps', REGRESSION_ARTICLE, ctx);
    expect(kept.steps[0].highlight).toMatchObject({ attribution: '— EDT, on building MetaHRise' });
  });
});

describe('editorial review — the prompt examples model the rules they teach', () => {
  it('finds nothing to fix in the step-by-step prompt example', () => {
    const example = JSON.parse(
      readFileSync(join(ANNOTATED, 'template-02-longform-numbered-steps', 'prompt-example.json'), 'utf8')
    );
    const ctx = { brief: 'MetaHRise for MCMC: 145 new hires, 93% satisfaction, Malaysia Book of Records.', angle: null, keyPoints: [] };
    expect(reviewArticleContent('template-02-longform-numbered-steps', template02Content.parse(example), ctx)).toEqual([]);
  });

  it('finds nothing to fix in the flip-card prompt example', () => {
    const example = JSON.parse(readFileSync(join(ANNOTATED, 'gallery-flipcards-alternating', 'prompt-example.json'), 'utf8'));
    expect(reviewGalleryContent('gallery-flipcards-alternating', galleryFlipcardsAlternatingContent.parse(example))).toEqual([]);
  });
});
