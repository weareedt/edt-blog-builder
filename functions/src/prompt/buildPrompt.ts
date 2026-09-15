import type Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './brandVoice';
import type { CategoryId, GalleryPlacement } from '../templates/types';
import type { VideoPlacement } from '../templates/article';

export interface BuildPromptInput {
  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateStructureNotes: string;
  templateExampleContent: unknown;
  /** Only when Claude is writing the gallery's captions ('auto'); null otherwise. */
  galleryStructureNotes: string | null;
  galleryExampleContent: unknown | null;
  /** Whether a gallery appears at all — its placement is the article's decision in every caption mode. */
  gallerySelected: boolean;
  requestedGalleryPlacement: GalleryPlacement | null;
  supportedGalleryPlacements: GalleryPlacement[];
  imageCount: number;
  /** The photo the user uploaded as the hero, for templates that have one. */
  heroImageId: string | null;
  /** The template has a hero slot (featureImage). Without an uploaded hero it stays empty. */
  templateHasHero: boolean;
  /** The photos that make up the gallery (never including the hero). */
  galleryImageIds: string[];
  /** The user wrote the gallery's heading themselves. */
  galleryIntroProvided: boolean;
  /** Videos attached to the article. Claude never sees the video itself — only what it's for. */
  videos: Array<{ caption: string | null; placement: VideoPlacement }>;
}

export interface BuiltPrompt {
  system: string;
  /** The stable, cacheable half of the user turn — identical across requests for the same template+gallery. */
  stableContent: Anthropic.ContentBlockParam[];
  /** The volatile half — the actual brief. Vision blocks for uploaded images go between these two in generateArticle.ts. */
  briefContent: Anthropic.ContentBlockParam[];
}

/**
 * Pure text assembly — no I/O, independently unit-testable. Image vision
 * blocks require fetching from Storage, so they're built separately
 * (buildImageContentBlocks) and spliced in by the caller between
 * `stableContent` and `briefContent`.
 */
export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const system = buildSystemPrompt();

  const stableContent: Anthropic.ContentBlockParam[] = [
    {
      type: 'text',
      text: `TEMPLATE STRUCTURE\n${input.templateStructureNotes}`,
    },
    {
      type: 'text',
      text: `EXAMPLE CONTENT for this template — a worked example about a different topic. Take its shape, voice and restraint, never its facts. It is not a checklist: its optional parts are there because that story earned them, not because every article needs them.\n${JSON.stringify(input.templateExampleContent, null, 2)}`,
    },
  ];

  if (input.galleryStructureNotes) {
    stableContent.push({
      type: 'text',
      text: `GALLERY COMPONENT (you're also writing its captions)\n${input.galleryStructureNotes}`,
    });
    stableContent.push({
      type: 'text',
      text: `EXAMPLE GALLERY CONTENT (a worked example — take its approach, never its facts):\n${JSON.stringify(input.galleryExampleContent, null, 2)}`,
      cache_control: { type: 'ephemeral' },
    });
  } else {
    // No gallery captions to write — mark the template example as the cache boundary instead.
    stableContent[stableContent.length - 1] = {
      ...stableContent[stableContent.length - 1],
      cache_control: { type: 'ephemeral' },
    } as Anthropic.TextBlockParam;
  }

  const briefLines = [
    `ARTICLE BRIEF`,
    `Topic/brief: ${input.brief}`,
    `Category (must be reflected in the byline/eyebrow exactly as given): ${input.category}`,
  ];
  if (input.angle) briefLines.push(`Audience/angle: ${input.angle}`);
  if (input.keyPoints.length > 0) {
    briefLines.push(`Key points to cover:\n${input.keyPoints.map((p) => `- ${p}`).join('\n')}`);
  }

  briefLines.push(
    input.imageCount > 0
      ? `${input.imageCount} image(s) were uploaded and are shown below — refer to them only by imageId, never invent one.`
      : `No images were uploaded.`
  );

  if (input.heroImageId) {
    briefLines.push(
      `HERO PHOTO: imageId ${input.heroImageId} is the photo the user chose as the hero. Use it as featureImage — write its alt (an objective description of what's visible) and its caption (why it matters, or null) — and don't use it anywhere else.`
    );
  } else if (input.templateHasHero) {
    briefLines.push(
      'No hero photo was uploaded. Set featureImage to null — never promote a gallery or other photo into the hero slot.'
    );
  }

  // Placement is the article's decision whatever the gallery's caption mode.
  if (input.gallerySelected) {
    const placements = input.supportedGalleryPlacements.join(', ');
    briefLines.push(
      [
        `GALLERY: ${input.galleryImageIds.length} photo(s) will appear as a gallery (imageIds: ${input.galleryImageIds.join(', ')}).`,
        input.requestedGalleryPlacement
          ? `The user asked for placement "${input.requestedGalleryPlacement}" — set galleryPlacement to it.`
          : `Choose galleryPlacement (${placements}) by narrative: where the text has just set up what the photos show. Don't default to the end.`,
        input.supportedGalleryPlacements.includes('mid-article')
          ? `If galleryPlacement is mid-article, set galleryAfterSection to the section number it should follow — between groups of sections, not straight after the first one; otherwise null. Don't put it right after a section that ends in a stat card, or next to the video.`
          : `Set galleryAfterSection to null.`,
      ]
        .filter(Boolean)
        .join(' ')
    );
    if (input.galleryStructureNotes && input.galleryIntroProvided) {
      briefLines.push(`The user wrote the gallery's heading themselves — in gallery content, set intro to null.`);
    }
  } else {
    briefLines.push('No gallery. Set galleryPlacement and galleryAfterSection to null.');
  }

  // Claude can't watch the video, so the caption is all it has to judge fit.
  if (input.videos.length > 0) {
    const described = input.videos.map((v) => (v.caption ? `"${v.caption}"` : 'a video with no caption')).join('; ');
    const auto = input.videos.some((v) => v.placement === 'auto');
    briefLines.push(
      [
        `VIDEO: ${described}.`,
        auto
          ? `It sits between sections as an interlude, ideally between two groups of sections (after section 2 of 5, say) where it changes the pace. Set videoAfterSection to the section it follows — where the text before it has set up what the video shows. With four or more sections, never straight after the first or the last, and not after a section that ends in a stat card or callout.`
          : `Its position is fixed by the user; set videoAfterSection to null.`,
        input.videos.some((v) => v.caption)
          ? `Set videoIntro to { eyebrow: 2-4 words, e.g. "See it in motion"; line: null } — the video already has a caption, and a line above it would only repeat it.`
          : `Set videoIntro to { eyebrow: 2-4 words, e.g. "See it in motion"; line: one short sentence on what to watch for, or null }.`,
      ].join(' ')
    );
  } else {
    briefLines.push('No video. Set videoAfterSection and videoIntro to null.');
  }

  briefLines.push(
    'Before writing, decide what this article argues and which of the brief\'s items are the same kind of thing. Then return one call to the content tool matching the required schema. No commentary outside the tool call.'
  );

  const briefContent: Anthropic.ContentBlockParam[] = [{ type: 'text', text: briefLines.join('\n\n') }];

  return { system, stableContent, briefContent };
}
