import { describe, expect, it } from 'vitest';
import { scopeArticleCss } from '../scopeArticleCss';

const S = '.edt-article';

describe('scopeArticleCss', () => {
  it('turns document-level selectors into the container itself', () => {
    expect(scopeArticleCss('body{background:#0A0A0A;}', S)).toBe('.edt-article{background:#0A0A0A;}');
    expect(scopeArticleCss('html,body{margin:0;padding:0;}', S)).toBe('.edt-article, .edt-article{margin:0;padding:0;}');
    expect(scopeArticleCss(':root{--blue:#2D2DFF;}', S)).toBe('.edt-article{--blue:#2D2DFF;}');
  });

  it('prefixes ordinary selectors so site styles cannot collide', () => {
    expect(scopeArticleCss('.tag{border:1px solid #fff;}', S)).toBe('.edt-article .tag{border:1px solid #fff;}');
    expect(scopeArticleCss('*{box-sizing:border-box;}', S)).toBe('.edt-article *{box-sizing:border-box;}');
    expect(scopeArticleCss('h1,h2,h3{margin:0;}', S)).toBe('.edt-article h1, .edt-article h2, .edt-article h3{margin:0;}');
  });

  it('keeps a document selector with its own extras', () => {
    expect(scopeArticleCss('body .wrap{max-width:1180px;}', S)).toBe('.edt-article .wrap{max-width:1180px;}');
    expect(scopeArticleCss('::selection{background:blue;}', S)).toBe('.edt-article ::selection{background:blue;}');
  });

  it('recurses into media and container queries', () => {
    expect(scopeArticleCss('@media(min-width:900px){.wrap{padding-inline:80px;}}', S)).toBe(
      '@media(min-width:900px){.edt-article .wrap{padding-inline:80px;}}'
    );
    expect(scopeArticleCss('@container (min-width:460px){.flip-grid{gap:16px;}}', S)).toBe(
      '@container (min-width:460px){.edt-article .flip-grid{gap:16px;}}'
    );
  });

  it('leaves at-rules whose bodies are not selectors alone', () => {
    const keyframes = '@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}';
    expect(scopeArticleCss(keyframes, S)).toBe(keyframes);
    const fontFace = "@font-face{font-family:'Dela Gothic One';src:url(x.ttf);}";
    expect(scopeArticleCss(fontFace, S)).toBe(fontFace);
    const imported = "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk');";
    expect(scopeArticleCss(imported, S)).toBe(imported);
  });

  it('does not split a comma inside :is() or an attribute selector', () => {
    expect(scopeArticleCss('.a:is(.b,.c){color:red;}', S)).toBe('.edt-article .a:is(.b,.c){color:red;}');
    expect(scopeArticleCss('[data-x="a,b"]{color:red;}', S)).toBe('.edt-article [data-x="a,b"]{color:red;}');
  });

  it('keeps comments and handles a braces-in-content declaration', () => {
    expect(scopeArticleCss('/* note */\n.a{content:"}";}', S)).toContain('/* note */');
    expect(scopeArticleCss('.eyebrow::before{content:"";width:8px;}', S)).toBe(
      '.edt-article .eyebrow::before{content:"";width:8px;}'
    );
  });

  it('scopes the rule that follows a standalone @import', () => {
    // The block splitter hands `@import …; :root` over as one prelude, since
    // the @import has no braces. Every template opens exactly like this.
    const css = "@import url('https://fonts.googleapis.com/css2?family=X');\n  :root{--blue:#2D2DFF;}";
    const out = scopeArticleCss(css, S);
    expect(out).toContain("@import url('https://fonts.googleapis.com/css2?family=X');");
    expect(out).toContain('.edt-article{--blue:#2D2DFF;}');
    expect(/(^|[{}])\s*:root\s*\{/.test(out)).toBe(false);
  });

  it('scopes a whole template stylesheet without dropping rules', () => {
    const css = [
      "@import url('https://fonts.googleapis.com/css2?family=X');",
      ':root{--blue:#2D2DFF;}',
      '*{box-sizing:border-box;}',
      'html,body{margin:0;}',
      'body{background:var(--black);}',
      '.wrap{max-width:1180px;}',
      '@media(min-width:900px){.wrap{padding-inline:80px;}.col{max-width:680px;}}',
      '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    ].join('\n');
    const out = scopeArticleCss(css, S);

    // Every rule survives, and nothing outside the container can be restyled.
    expect(out).toContain('@import');
    expect(out).toContain('@keyframes spin');
    expect(out.match(/\{/g)?.length).toBe(css.match(/\{/g)?.length);
    // A rule boundary is the start of the sheet, or just after { or } — so
    // the correctly scoped `.edt-article *{…}` is not a match, but a bare
    // `*{…}` or `body{…}` anywhere (including inside @media) would be.
    expect(/(^|[{}])\s*body\s*\{/.test(out)).toBe(false);
    expect(/(^|[{}])\s*\*\s*\{/.test(out)).toBe(false);
  });
});
