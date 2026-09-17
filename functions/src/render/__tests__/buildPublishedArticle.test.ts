import { describe, expect, it } from 'vitest';
import { ARTICLE_SCOPE_CLASS, buildPublishedArticle } from '../buildPublishedArticle';

const FRAGMENT = `<title>Long-Form Article Template</title>
<style>
  body{background:#0A0A0A;}
  .tag{border:1px solid #fff;}
  @media(min-width:900px){.wrap{padding-inline:80px;}}
</style>

<section class="article-hero">
  <h1 class="title">A Hologram That Answers Gate Questions</h1>
  <img src="https://firebasestorage.example/o/photo.jpg" alt="A kiosk at a gate.">
</section>
<script>
  document.querySelectorAll('.flip-card').forEach(function (c) { c.onclick = null; });
</script>`;

describe('buildPublishedArticle', () => {
  const built = buildPublishedArticle(FRAGMENT);

  it('wraps the markup in the scope container', () => {
    expect(built.bodyHtml.startsWith(`<div class="${ARTICLE_SCOPE_CLASS}">`)).toBe(true);
    expect(built.bodyHtml.trimEnd().endsWith('</div>')).toBe(true);
    expect(built.bodyHtml).toContain('A Hologram That Answers Gate Questions');
  });

  it('lifts the CSS out of the markup and scopes it', () => {
    expect(built.bodyHtml).not.toContain('<style');
    expect(built.styleCss).toContain('.edt-article{background:#0A0A0A;}');
    expect(built.styleCss).toContain('.edt-article .tag{border:1px solid #fff;}');
    expect(built.styleCss).toContain('@media(min-width:900px){.edt-article .wrap');
  });

  it('drops scripts, which would never run once embedded anyway', () => {
    expect(built.bodyHtml).not.toContain('<script');
    expect(built.bodyHtml).not.toContain('flip-card');
  });

  it("drops the fragment's own <title>, leaving that to the page's metadata", () => {
    expect(built.bodyHtml).not.toContain('<title>');
    expect(built.bodyHtml).not.toContain('Long-Form Article Template');
  });

  it('keeps photo URLs as they are', () => {
    expect(built.bodyHtml).toContain('src="https://firebasestorage.example/o/photo.jpg"');
    expect(built.bodyHtml).toContain('alt="A kiosk at a gate."');
  });

  it('leaves nothing that could restyle the surrounding page', () => {
    expect(/(^|[{}])\s*body\s*\{/.test(built.styleCss)).toBe(false);
    expect(/(^|[{}])\s*\*\s*\{/.test(built.styleCss)).toBe(false);
  });
});
