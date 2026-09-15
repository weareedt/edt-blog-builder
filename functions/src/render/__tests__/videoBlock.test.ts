import { describe, expect, it } from 'vitest';
import { renderVideoBlock, resolveEmbedUrl } from '../videoBlock';
import { sanitizeEditedArticleBody } from '../sanitizeArticleBody';

describe('resolveEmbedUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=share', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('resolves the YouTube URL %s', (input, id) => {
    expect(resolveEmbedUrl(input)).toEqual({
      provider: 'youtube',
      embedSrc: `https://www.youtube-nocookie.com/embed/${id}`,
    });
  });

  it.each([
    ['https://vimeo.com/76979871', '76979871'],
    ['https://vimeo.com/channels/staffpicks/76979871', '76979871'],
    ['https://player.vimeo.com/video/76979871', '76979871'],
  ])('resolves the Vimeo URL %s', (input, id) => {
    expect(resolveEmbedUrl(input)).toEqual({
      provider: 'vimeo',
      embedSrc: `https://player.vimeo.com/video/${id}`,
    });
  });

  it.each([
    'not a url',
    'javascript:alert(1)',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=">< script',
    'https://vimeo.com/about',
  ])('rejects %s', (input) => {
    expect(resolveEmbedUrl(input)).toBeNull();
  });
});

describe('renderVideoBlock', () => {
  it('renders an embed inside a movable, framed figure', () => {
    const html = renderVideoBlock({
      id: 'v1',
      source: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
      caption: 'Pilot walkthrough',
    });
    expect(html).toContain('data-block="video"');
    expect(html).toContain('data-block-id="v1"');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('<figcaption class="cap">Pilot walkthrough</figcaption>');
  });

  it('renders an uploaded file as a native video element', () => {
    const html = renderVideoBlock({
      id: 'v2',
      source: { kind: 'upload', downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/v.mp4?alt=media&token=t', contentType: 'video/mp4' },
      caption: null,
    });
    expect(html).toContain('<video controls playsinline preload="metadata">');
    expect(html).toContain('type="video/mp4"');
    expect(html).not.toContain('figcaption');
  });

  it('renders nothing for an embed URL that does not resolve', () => {
    expect(
      renderVideoBlock({ id: 'v3', source: { kind: 'embed', url: 'https://example.com/x' }, caption: null })
    ).toBe('');
  });

  it('escapes caption text', () => {
    const html = renderVideoBlock({
      id: 'v4',
      source: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
      caption: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img');
  });

  it('survives an edit-save round trip intact', () => {
    // The whole point of widening the sanitizer: a video block rendered here
    // must come back out of sanitizeEditedArticleBody still playable.
    const embed = renderVideoBlock({
      id: 'v1',
      source: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
      caption: 'Walkthrough',
    });
    const upload = renderVideoBlock({
      id: 'v2',
      source: { kind: 'upload', downloadUrl: 'http://127.0.0.1:9199/v0/b/demo/o/v.mp4?alt=media', contentType: 'video/mp4' },
      caption: null,
    });
    const result = sanitizeEditedArticleBody(embed + upload, '');
    expect(result).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(result).toContain('allowfullscreen');
    expect(result).toContain('data-block="video"');
    expect(result).toContain('<source src="http://127.0.0.1:9199/v0/b/demo/o/v.mp4?alt=media"');
  });
});
