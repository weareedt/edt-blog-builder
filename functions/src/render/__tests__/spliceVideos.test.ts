import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { spliceVideos } from '../spliceVideos';
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

function names(out: ReturnType<typeof spliceVideos<Item>>): string[] {
  return out.map((i) => ('name' in i ? i.name : `VIDEO:${i.videoHtml}`));
}

describe('spliceVideos', () => {
  it('counts sections, not raw items, when placing', () => {
    const out = spliceVideos([S('a'), C('note'), S('b'), S('c')], isSection, [{ html: 'v', afterSection: 2 }]);
    expect(names(out)).toEqual(['a', 'note', 'b', 'VIDEO:v', 'c']);
  });

  it('places 0 before the first section and an oversized index after the last', () => {
    const out = spliceVideos([S('a'), S('b')], isSection, [
      { html: 'end', afterSection: Number.MAX_SAFE_INTEGER },
      { html: 'start', afterSection: 0 },
    ]);
    expect(names(out)).toEqual(['VIDEO:start', 'a', 'b', 'VIDEO:end']);
  });

  it('gives every real item videoHtml: null for Handlebars strict mode', () => {
    const out = spliceVideos([S('a')], isSection, []);
    expect(out).toEqual([{ type: 'section', name: 'a', videoHtml: null }]);
  });
});

const VIDEO_HTML = `${renderVideoStyles()}\n${renderVideoBlock({
  id: 'vid-1',
  source: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
  caption: 'Walkthrough',
})}`;

describe('video blocks render inside every template', () => {
  const cases = [
    ['template-01-case-study-roundup', (content: any) =>
      prepareTemplate01Context({ content, imageSrcById: {}, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })],
    ['template-02-longform-numbered-steps', (content: any) =>
      prepareTemplate02Context({ content, imageSrcById: {}, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })],
    ['template-03-standard-article-toc', (content: any) =>
      prepareTemplate03Context({ content, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })],
    ['template-04-basic-scroll', (content: any) =>
      prepareTemplate04Context({ content, imageSrcById: {}, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })],
  ] as const;

  it.each(cases)('%s', (templateId, prepare) => {
    const entry = templateRegistry[templateId];
    const content = entry.schema.parse(entry.exampleContent);
    const html = renderArticle(entry.hbsSource, prepare(content));

    // Exactly one video, one copy of its stylesheet, and the player intact.
    expect((html.match(/data-block="video"/g) ?? []).length).toBe(1);
    expect((html.match(/\.edt-video\{margin/g) ?? []).length).toBe(1);
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });

  it('does not number a video as a step, or give it a TOC entry', () => {
    const t02 = templateRegistry['template-02-longform-numbered-steps'];
    const c02 = t02.schema.parse(t02.exampleContent) as any;
    const html02 = renderArticle(
      t02.hbsSource,
      prepareTemplate02Context({ content: c02, imageSrcById: {}, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })
    );
    expect((html02.match(/class="step-num"/g) ?? []).length).toBe(c02.steps.length);

    const t03 = templateRegistry['template-03-standard-article-toc'];
    const c03 = t03.schema.parse(t03.exampleContent) as any;
    const html03 = renderArticle(
      t03.hbsSource,
      prepareTemplate03Context({ content: c03, galleryHtml: null, videos: [{ html: VIDEO_HTML, afterSection: 1 }] })
    );
    const sections = c03.bodyItems.filter((i: any) => i.type === 'section').length;
    const tocList = html03.slice(html03.indexOf('id="tocList"'), html03.indexOf('</ul>', html03.indexOf('id="tocList"')));
    expect((tocList.match(/<li>/g) ?? []).length).toBe(sections);
  });
});

// Keeps the path import used (the registry embeds the .hbs, but a missing
// template file should still fail loudly here rather than pass vacuously).
readFileSync(join(__dirname, '..', '..', '..', '..', 'templates', 'annotated', 'template-03-standard-article-toc', 'template.hbs'));
