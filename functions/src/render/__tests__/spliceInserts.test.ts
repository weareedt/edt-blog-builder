import { describe, expect, it } from 'vitest';
import { placeInterlude, spliceInserts } from '../spliceInserts';
import { renderArticle } from '../renderArticle';
import { renderVideoBlock, renderVideoStyles } from '../videoBlock';
import { templateRegistry } from '../../templates/generated/registry';
import { prepareTemplate01Context } from '../../templates/content/template01.prepareContext';
import { prepareTemplate02Context } from '../../templates/content/template02.prepareContext';
import { prepareTemplate03Context } from '../../templates/content/template03.prepareContext';
import { prepareTemplate04Context } from '../../templates/content/template04.prepareContext';

type Item = { type: 'section' | 'callout'; name: string };
const S = (name: string): Item => ({ type: 'section', name });
const C = (name: string): Item => ({ type: 'callout', name });
const isSection = (i: Item) => i.type === 'section';

function names(out: ReturnType<typeof spliceInserts<Item>>): string[] {
  return out.map((i) => ('name' in i ? i.name : `INSERT:${i.insertHtml}`));
}

describe('spliceInserts', () => {
  it('counts sections, not raw items, when placing', () => {
    const out = spliceInserts([S('a'), C('note'), S('b'), S('c')], isSection, [{ html: 'v', afterSection: 2 }]);
    expect(names(out)).toEqual(['a', 'note', 'b', 'INSERT:v', 'c']);
  });

  it("lands after a section's trailing callout, never between a section and it", () => {
    const out = spliceInserts([S('a'), C('note'), S('b')], isSection, [{ html: 'v', afterSection: 1 }]);
    expect(names(out)).toEqual(['a', 'note', 'INSERT:v', 'b']);
  });

  it('places 0 before the first section and an oversized index after the last', () => {
    const out = spliceInserts([S('a'), S('b')], isSection, [
      { html: 'end', afterSection: Number.MAX_SAFE_INTEGER },
      { html: 'start', afterSection: 0 },
    ]);
    expect(names(out)).toEqual(['INSERT:start', 'a', 'b', 'INSERT:end']);
  });

  it('gives every real item insertHtml: null for Handlebars strict mode', () => {
    expect(spliceInserts([S('a')], isSection, [])).toEqual([{ type: 'section', name: 'a', insertHtml: null }]);
  });
});

describe('placeInterlude', () => {
  it('moves an interlude off section 1 in a longer article — after 02 of 05', () => {
    expect(placeInterlude(1, 5)).toBe(2);
    expect(placeInterlude(0, 5)).toBe(2);
  });

  it('never places it after the last section of a longer article', () => {
    expect(placeInterlude(5, 5)).toBe(4);
  });

  it('keeps a sensible request as given', () => {
    expect(placeInterlude(3, 6)).toBe(3);
  });

  it('defaults to between the groups when nothing was requested', () => {
    expect(placeInterlude(null, 5)).toBe(2);
    expect(placeInterlude(undefined, 8)).toBe(4);
  });

  it('takes the request as given in a short article', () => {
    expect(placeInterlude(1, 3)).toBe(1);
  });
});

const VIDEO_HTML = `${renderVideoStyles()}\n${renderVideoBlock({
  id: 'vid-1',
  source: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
  caption: 'Walkthrough',
  eyebrow: 'See it in motion',
  intro: 'Watch where people stop.',
})}`;
const inserts = [{ html: VIDEO_HTML, afterSection: 1 }];

describe('inserts render inside every template', () => {
  const cases = [
    ['template-01-case-study-roundup', (content: any) => prepareTemplate01Context({ content, imageSrcById: {}, galleryHtml: null, inserts })],
    ['template-02-longform-numbered-steps', (content: any) => prepareTemplate02Context({ content, imageSrcById: {}, galleryHtml: null, inserts })],
    ['template-03-standard-article-toc', (content: any) => prepareTemplate03Context({ content, galleryHtml: null, inserts })],
    ['template-04-basic-scroll', (content: any) => prepareTemplate04Context({ content, imageSrcById: {}, galleryHtml: null, inserts })],
  ] as const;

  it.each(cases)('%s', (templateId, prepare) => {
    const entry = templateRegistry[templateId];
    const html = renderArticle(entry.hbsSource, prepare(entry.schema.parse(entry.exampleContent)));
    expect((html.match(/data-block="video"/g) ?? []).length).toBe(1);
    expect((html.match(/\.edt-video\{margin:64px/g) ?? []).length).toBe(1);
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('See it in motion');
  });

  it('does not number an insert as a step, or give it a TOC entry', () => {
    const t02 = templateRegistry['template-02-longform-numbered-steps'];
    const c02 = t02.schema.parse(t02.exampleContent) as any;
    const html02 = renderArticle(t02.hbsSource, prepareTemplate02Context({ content: c02, imageSrcById: {}, galleryHtml: null, inserts }));
    expect((html02.match(/class="step-num"/g) ?? []).length).toBe(c02.steps.length);

    const t03 = templateRegistry['template-03-standard-article-toc'];
    const c03 = t03.schema.parse(t03.exampleContent) as any;
    const html03 = renderArticle(t03.hbsSource, prepareTemplate03Context({ content: c03, galleryHtml: null, inserts }));
    const sections = c03.bodyItems.filter((i: any) => i.type === 'section').length;
    const start = html03.indexOf('id="tocList"');
    const tocList = html03.slice(start, html03.indexOf('</ul>', start));
    expect((tocList.match(/<li>/g) ?? []).length).toBe(sections);
  });
});
