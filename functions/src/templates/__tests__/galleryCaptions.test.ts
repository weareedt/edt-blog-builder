import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../render/renderArticle';
import { galleryAccordionContent } from '../content/galleryAccordion.schema';
import { galleryFlipcardsAlternatingContent } from '../content/galleryFlipcardsAlternating.schema';
import { prepareGalleryAccordionContext } from '../content/galleryAccordion.prepareContext';
import { prepareGalleryFlipcardsAlternatingContext } from '../content/galleryFlipcardsAlternating.prepareContext';
import {
  buildGalleryContentFromImages,
  NotEnoughGalleryImagesError,
} from '../content/galleryFromImages';
import type { ArticleImage } from '../article';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function hbs(galleryId: string): string {
  return readFileSync(join(REPO_ROOT, 'templates', 'annotated', galleryId, 'template.hbs'), 'utf8');
}

function image(id: string, caption: string | null, captionDetail: string | null): ArticleImage {
  return {
    id,
    kind: 'image',
    storagePath: `users/u/uploads/a/${id}.jpg`,
    contentType: 'image/jpeg',
    width: 1200,
    height: 800,
    bytes: 1000,
    userNote: null,
    caption,
    captionDetail,
  };
}

const THREE_IMAGES = [
  image('img-a', 'Gate 3', 'Handles 40 queries an hour'),
  image('img-b', '  ', ''), // whitespace-only — must read as absent, not a blank line
  image('img-c', 'Briefing room', null),
];

function renderAccordion(content: unknown): string {
  const parsed = galleryAccordionContent.parse(content);
  const imageSrcById = Object.fromEntries(parsed.items.map((i) => [i.imageId, PLACEHOLDER_SRC]));
  return renderArticle(hbs('gallery-accordion'), prepareGalleryAccordionContext({ content: parsed, imageSrcById }));
}

function renderFlipcards(content: unknown): string {
  const parsed = galleryFlipcardsAlternatingContent.parse(content);
  const imageSrcById = Object.fromEntries(parsed.items.map((i) => [i.imageId, PLACEHOLDER_SRC]));
  return renderArticle(
    hbs('gallery-flipcards-alternating'),
    prepareGalleryFlipcardsAlternatingContext({ content: parsed, imageSrcById })
  );
}

describe('buildGalleryContentFromImages', () => {
  it("'none' produces one item per photo with every caption field null", () => {
    const content = buildGalleryContentFromImages({
      galleryId: 'gallery-accordion',
      mode: 'none',
      images: THREE_IMAGES,
      itemMin: 3,
      itemMax: 8,
    });

    expect(content.items).toEqual([
      { imageId: 'img-a', tag: null, title: null, metric: null },
      { imageId: 'img-b', tag: null, title: null, metric: null },
      { imageId: 'img-c', tag: null, title: null, metric: null },
    ]);
  });

  it("'none' ignores captions that were typed earlier, rather than discarding them", () => {
    // Switching a gallery to image-only should hide the captions, so that
    // switching back to 'manual' brings them straight back.
    const content = buildGalleryContentFromImages({
      galleryId: 'gallery-accordion',
      mode: 'none',
      images: THREE_IMAGES,
      itemMin: 3,
      itemMax: 8,
    });
    expect(content.items.every((i) => Object.values(i).slice(1).every((v) => v === null))).toBe(true);
    expect(THREE_IMAGES[0].caption).toBe('Gate 3');
  });

  it("'manual' maps caption/detail onto the accordion's title/metric and leaves tag null", () => {
    const content = buildGalleryContentFromImages({
      galleryId: 'gallery-accordion',
      mode: 'manual',
      images: THREE_IMAGES,
      itemMin: 3,
      itemMax: 8,
    });

    expect(content.items).toEqual([
      { imageId: 'img-a', tag: null, title: 'Gate 3', metric: 'Handles 40 queries an hour' },
      { imageId: 'img-b', tag: null, title: null, metric: null },
      { imageId: 'img-c', tag: null, title: 'Briefing room', metric: null },
    ]);
  });

  it("'manual' maps caption/detail onto the flip-card's label/body and leaves projectLine null", () => {
    const content = buildGalleryContentFromImages({
      galleryId: 'gallery-flipcards-alternating',
      mode: 'manual',
      images: THREE_IMAGES,
      itemMin: 3,
      itemMax: 8,
    });

    expect(content.items).toEqual([
      { imageId: 'img-a', label: 'Gate 3', body: 'Handles 40 queries an hour', projectLine: null },
      { imageId: 'img-b', label: null, body: null, projectLine: null },
      { imageId: 'img-c', label: 'Briefing room', body: null, projectLine: null },
    ]);
  });

  it('caps items at the gallery ceiling and preserves upload order', () => {
    const many = Array.from({ length: 10 }, (_, i) => image(`img-${i}`, `Photo ${i}`, null));
    const content = buildGalleryContentFromImages({
      galleryId: 'gallery-accordion',
      mode: 'manual',
      images: many,
      itemMin: 3,
      itemMax: 8,
    });

    expect(content.items).toHaveLength(8);
    expect(content.items.map((i) => i.imageId)).toEqual([
      'img-0', 'img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6', 'img-7',
    ]);
  });

  it('throws rather than rendering a short gallery when photos were removed after the draft', () => {
    expect(() =>
      buildGalleryContentFromImages({
        galleryId: 'gallery-accordion',
        mode: 'none',
        images: THREE_IMAGES.slice(0, 2),
        itemMin: 3,
        itemMax: 8,
      })
    ).toThrow(NotEnoughGalleryImagesError);
  });

  it('produces content that still satisfies the gallery schemas', () => {
    for (const mode of ['none', 'manual'] as const) {
      expect(() =>
        galleryAccordionContent.parse(
          buildGalleryContentFromImages({
            galleryId: 'gallery-accordion',
            mode,
            images: THREE_IMAGES,
            itemMin: 3,
            itemMax: 8,
          })
        )
      ).not.toThrow();
      expect(() =>
        galleryFlipcardsAlternatingContent.parse(
          buildGalleryContentFromImages({
            galleryId: 'gallery-flipcards-alternating',
            mode,
            images: THREE_IMAGES,
            itemMin: 3,
            itemMax: 8,
          })
        )
      ).not.toThrow();
    }
  });

  it('accepts a short hand-typed caption that the old min-length would have rejected', () => {
    // "Gate 3" is 6 characters; `body` used to require 20.
    expect(() =>
      galleryFlipcardsAlternatingContent.parse(
        buildGalleryContentFromImages({
          galleryId: 'gallery-flipcards-alternating',
          mode: 'manual',
          images: [image('img-a', 'Gate 3', 'Live'), image('img-b', 'A', 'B'), image('img-c', 'C', 'D')],
          itemMin: 3,
          itemMax: 8,
        })
      )
    ).not.toThrow();
  });
});

describe('caption rendering', () => {
  it('omits the accordion caption overlay entirely when a panel has no text', () => {
    const html = renderAccordion({
      items: [
        { imageId: 'img-a', tag: null, title: null, metric: null },
        { imageId: 'img-b', tag: null, title: null, metric: null },
        { imageId: 'img-c', tag: null, title: null, metric: null },
      ],
    });
    const markup = html.slice(html.indexOf('<div class="gallery-wrap">'));

    // An empty `.cap` would still paint over the photo, so it must not be emitted.
    expect(markup).not.toContain('class="cap"');
    expect((markup.match(/class="panel"/g) ?? []).length).toBe(3);
    // The photos and their index numbers still render.
    expect((markup.match(/<img /g) ?? []).length).toBe(3);
    expect(markup).toContain('<span class="index">01</span>');
  });

  it('emits only the caption parts that are present', () => {
    const html = renderAccordion({
      items: [
        { imageId: 'img-a', tag: null, title: 'Gate 3', metric: null },
        { imageId: 'img-b', tag: 'AR', title: null, metric: null },
        { imageId: 'img-c', tag: null, title: null, metric: null },
      ],
    });
    const markup = html.slice(html.indexOf('<div class="gallery-wrap">'));

    expect((markup.match(/class="cap"/g) ?? []).length).toBe(2);
    expect(markup).toContain('<h3>Gate 3</h3>');
    expect(markup).not.toContain('<h3></h3>');
    expect(markup).not.toContain('<p></p>');
    expect(markup).not.toContain('<span class="tag"></span>');
  });

  it('falls back to a bare index tag on a flip card with no label', () => {
    const html = renderFlipcards({
      items: [
        { imageId: 'img-a', label: null, body: 'Some copy', projectLine: null },
        { imageId: 'img-b', label: 'VR Training', body: null, projectLine: null },
        { imageId: 'img-c', label: null, body: null, projectLine: null },
      ],
    });
    const markup = html.slice(html.indexOf('<div class="gallery-wrap">'));

    // Never "01 — " with a dangling separator.
    expect(markup).toContain('<span class="tag">01</span>');
    expect(markup).toContain('<span class="tag">02 — VR Training</span>');
    expect(markup).not.toContain('— </span>');
    expect(markup).not.toContain('<div class="label"></div>');
    expect(markup).not.toContain('<div class="stack"></div>');
  });
});
