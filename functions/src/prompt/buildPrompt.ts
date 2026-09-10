import type Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './brandVoice';
import type { CategoryId, GalleryPlacement } from '../templates/types';

export interface BuildPromptInput {
  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateStructureNotes: string;
  templateExampleContent: unknown;
  galleryStructureNotes: string | null;
  galleryExampleContent: unknown | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  supportedGalleryPlacements: GalleryPlacement[];
  imageCount: number;
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
      text: `EXAMPLE CONTENT for this template (a worked example about a different topic — do not reuse its facts, only its shape and voice):\n${JSON.stringify(input.templateExampleContent, null, 2)}`,
    },
  ];

  if (input.galleryStructureNotes) {
    stableContent.push({
      type: 'text',
      text: `GALLERY COMPONENT (selected for this article)\n${input.galleryStructureNotes}\n\nSupported placements: ${input.supportedGalleryPlacements.join(', ')}.${
        input.requestedGalleryPlacement
          ? ` The user asked for placement: "${input.requestedGalleryPlacement}" — use it.`
          : ' No placement was requested — choose whichever supported placement best fits the narrative.'
      }`,
    });
    stableContent.push({
      type: 'text',
      text: `EXAMPLE GALLERY CONTENT (a worked example — do not reuse its facts):\n${JSON.stringify(input.galleryExampleContent, null, 2)}`,
      cache_control: { type: 'ephemeral' },
    });
  } else {
    // No gallery selected — mark the template example as the cache boundary instead.
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
      ? `${input.imageCount} image(s) were uploaded and are shown below — place them using their imageId, never invent one.`
      : `No images were uploaded for inline use.`
  );
  briefLines.push(
    'Return one call to the content tool matching the required schema. No commentary outside the tool call.'
  );

  const briefContent: Anthropic.ContentBlockParam[] = [
    { type: 'text', text: briefLines.join('\n\n') },
  ];

  return { system, stableContent, briefContent };
}
