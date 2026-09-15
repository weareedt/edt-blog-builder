import { KNOWN_PROJECTS } from './brandVoice';
import type { GalleryId, TemplateId } from '../templates/types';

/**
 * Post-generation editorial checks — the code half of EDITORIAL_JUDGEMENT
 * and WRITING_TELLS in brandVoice.ts.
 *
 * Two kinds of problem, handled differently:
 * - review*: things only a rewrite can fix (stock phrasing, an opening that
 *   restates the dek, a CTA that counts sections, an invented stat). These
 *   are sent back to Claude as one corrective retry via
 *   generateStructuredContent's `review` hook. If they survive the retry the
 *   article still ships — they're quality problems, not broken output.
 * - repair*: things code can fix deterministically and safely (a number
 *   typed into a step label the template already numbers, an attribution on
 *   a quote that isn't in the brief, a stat cell with a made-up number).
 *   Always applied, after generation, whatever the model returned.
 *
 * The heuristics favour precision over recall: a false positive costs a
 * retry, so the phrase list is specific rather than exhaustive.
 */

export interface ReviewContext {
  brief: string;
  angle: string | null;
  keyPoints: string[];
}

// Model output is validated against per-template Zod schemas before it gets
// here; these functions walk it structurally and tolerate absent keys.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Content = any;

export const WRITING_TELL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: '"Most X fail(s) for the same reason"', pattern: /\bmost\s+[\w-]+(?:\s+[\w-]+)?\s+fails?\s+for\s+the\s+same\s+reason\b/i },
  { name: '"harder than it sounds"', pattern: /\bharder(?:\s+[\w-]+)?\s+than\s+it\s+sounds\b/i },
  { name: '"X isn\'t just Y"', pattern: /\b(?:isn['’]t|is\s+not|aren['’]t|are\s+not)\s+just\b/i },
  { name: '"It\'s not about X"', pattern: /\bit['’]s\s+not\s+about\b/i },
  { name: '"Here\'s the thing"', pattern: /\bhere['’]s\s+the\s+thing\b/i },
  { name: '"The truth/reality is"', pattern: /\bthe\s+(?:truth|reality)\s+is\b/i },
  { name: '"at the end of the day"', pattern: /\bat\s+the\s+end\s+of\s+the\s+day\b/i },
  { name: '"more than just"', pattern: /\bmore\s+than\s+just\b/i },
  { name: '"in today\'s…"', pattern: /\bin\s+today['’]s\b/i },
  {
    name: 'marketing filler',
    pattern:
      /\b(?:game[- ]?chang\w*|cutting[- ]edge|seamless(?:ly)?|leverag(?:e|es|ed|ing)|unlock(?:s|ed|ing)?\s+(?:the|new|your)|elevat(?:e|es|ed|ing)\b(?!\s+(?:lift|shaft))|synerg\w*|revolutioni[sz]\w*)/i,
  },
];

const NUMBER_WORD = '(?:two|three|four|five|six|seven|eight|nine|ten|\\d+)';
const COUNT_BACK_PATTERNS = [
  new RegExp(
    `\\b(?:these|those|all|of\\s+the)\\s+${NUMBER_WORD}\\b(?!\\s*(?:%|percent|per|years?|months?|weeks?|days?|hours?|minutes?|people|employees|visitors|staff))`,
    'i'
  ),
  new RegExp(
    `\\b${NUMBER_WORD}\\s+(?:categories|ways|things|lessons|ideas|steps|sections|tools|types|options|principles|approaches|formats)\\b`,
    'i'
  ),
];

// A card back that opens like a photo description: a person or group as the
// subject, then a physical present-tense verb close behind ("A trainee
// steadies himself…", "Visitors pause…"). Kept tight — short gap, bodily
// verbs only — because an insight can start with "An AR trail is…" too.
const DESCRIPTIVE_CARD_BACK =
  /^(?:a|an|two|three|four|several|visitors|people|guests|a\s+group(?:\s+of)?)\s+(?:[\w'’-]+\s+){0,5}?(?:stand|stands|holds|holding|reaches|watch|watches|watching|looks|looking|pause|pauses|sits|sitting|walks|walking|steadies|raises|leans)\b/i;

const STOPWORDS = new Set(
  (
    "that this with from they them their there what when where which while have were will would could should into onto than then your ours about each just only also more most very really actually here " +
    "it's they're we've we're don't isn't because being been does doing done some such other over under same like make made every"
  ).split(' ')
);

function stems(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z][a-z'’-]{3,}/g) ?? [])
      .map((w) => w.replace(/['’]s$/, '').replace(/ies$/, 'y').replace(/(?:es|s)$/, ''))
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

/** Share of `reference`'s words that also appear in `text`. */
function coverage(text: Set<string>, reference: Set<string>): number {
  if (reference.size === 0) return 0;
  let hits = 0;
  for (const w of reference) if (text.has(w)) hits += 1;
  return hits / reference.size;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let both = 0;
  for (const w of a) if (b.has(w)) both += 1;
  return both / union.size;
}

function firstSentences(text: string, count = 2): string {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text]).slice(0, count).join(' ');
}

function normaliseForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberTokens(text: string): string[] {
  return (text.match(/\d[\d,.]*/g) ?? []).map((t) => t.replace(/,/g, '').replace(/\.$/, ''));
}

function numbersSupported(value: string, ctx: ReviewContext): boolean {
  const tokens = numberTokens(value);
  if (tokens.length === 0) return true;
  const evidence = new Set(numberTokens([ctx.brief, ctx.angle ?? '', ...ctx.keyPoints, KNOWN_PROJECTS].join('\n')));
  return tokens.every((t) => evidence.has(t));
}

function quoteIsInBrief(quote: string, ctx: ReviewContext): boolean {
  const q = normaliseForMatch(quote);
  return q.length > 0 && normaliseForMatch([ctx.brief, ctx.angle ?? '', ...ctx.keyPoints].join(' ')).includes(q);
}

const SKIP_KEYS = new Set(['imageId', 'category', 'type', 'kind', 'url', 'windowLabel']);

function collectStrings(value: unknown, path = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (!SKIP_KEYS.has(k)) collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

export function countSections(templateId: TemplateId, content: Content): number {
  switch (templateId) {
    case 'template-01-case-study-roundup':
      return content.entries?.length ?? 0;
    case 'template-02-longform-numbered-steps':
      return content.steps?.length ?? 0;
    default:
      return (content.bodyItems ?? []).filter((i: Content) => i.type === 'section').length;
  }
}

function highlightsOf(templateId: TemplateId, content: Content): Array<{ path: string; highlight: Content }> {
  if (templateId === 'template-02-longform-numbered-steps') {
    return (content.steps ?? []).flatMap((s: Content, i: number) =>
      s.highlight ? [{ path: `steps[${i}].highlight`, highlight: s.highlight }] : []
    );
  }
  if (templateId === 'template-04-basic-scroll') {
    return (content.bodyItems ?? []).flatMap((b: Content, i: number) =>
      b.type === 'highlight' ? [{ path: `bodyItems[${i}].highlight`, highlight: b.highlight }] : []
    );
  }
  return [];
}

function tellIssues(strings: Array<[string, string]>): string[] {
  const issues: string[] = [];
  for (const [path, text] of strings) {
    for (const { name, pattern } of WRITING_TELL_PATTERNS) {
      if (pattern.test(text)) {
        issues.push(`${path} uses the stock phrasing ${name}. Rewrite it as a specific, concrete observation in EDT's voice.`);
      }
    }
  }
  return issues;
}

export function reviewArticleContent(templateId: TemplateId, content: Content, ctx: ReviewContext): string[] {
  const issues = tellIssues(collectStrings(content));

  const opening: string | null = content.lede ?? content.intro ?? null;
  if (opening && content.dek) {
    const dek = stems(content.dek);
    if (dek.size >= 5 && coverage(stems(firstSentences(opening)), dek) >= 0.35) {
      issues.push(
        `The opening ${content.lede ? 'lede' : 'intro'} restates the dek. Open with an observation, a tension, a question or a specific project moment that moves the idea forward instead.`
      );
    }
  }

  const endings: Array<[string, string | undefined]> = [
    ['closing', content.closing ?? undefined],
    ['cta.heading', content.cta?.heading],
    ['cta.body', content.cta?.body],
  ];
  for (const [path, text] of endings) {
    if (text && COUNT_BACK_PATTERNS.some((p) => p.test(text))) {
      issues.push(
        `${path} counts the article back to the reader ("these five", "five categories"…). Resolve or act on the article's argument instead of referring to its structure.`
      );
    }
  }

  for (const { path, highlight } of highlightsOf(templateId, content)) {
    if (highlight.type !== 'statCard') continue;
    highlight.cells.forEach((cell: Content, j: number) => {
      if (!numbersSupported(cell.number, ctx)) {
        issues.push(
          `${path}.cells[${j}] ("${cell.number}") isn't a metric given in the brief or the known projects. Stat cards are only for real, meaningful metrics — drop this cell, or the whole stat card.`
        );
      }
    });
  }

  if (templateId === 'template-01-case-study-roundup') {
    (content.entries ?? []).forEach((entry: Content, i: number) => {
      if (entry.statLine && !numbersSupported(entry.statLine, ctx)) {
        issues.push(
          `entries[${i}].statLine uses a number that isn't in the brief or the known projects. State a real result, or set statLine to null.`
        );
      }
    });
  }

  const feature = content.featureImage;
  if (feature) {
    if (!feature.alt?.trim()) {
      issues.push('featureImage.alt is missing. Describe, objectively, what is visible in the photo.');
    } else if (feature.caption && jaccard(stems(feature.alt), stems(feature.caption)) >= 0.6) {
      issues.push(
        'featureImage.caption repeats the alt text. The caption should say why the image matters or what to notice in it — or be null.'
      );
    }
  }

  return issues;
}

export function reviewGalleryContent(galleryId: GalleryId, content: Content): string[] {
  const issues = tellIssues(collectStrings(content));
  (content.items ?? []).forEach((item: Content, i: number) => {
    if (!item.alt?.trim()) issues.push(`items[${i}].alt is missing. Describe, objectively, what is visible in the photo.`);
    if (galleryId !== 'gallery-flipcards-alternating' || !item.body) return;
    const echoesAlt = item.alt && jaccard(stems(item.alt), stems(item.body)) >= 0.45;
    if (echoesAlt || DESCRIPTIVE_CARD_BACK.test(item.body.trim())) {
      issues.push(
        `items[${i}].body describes the photo. The back of the card is the reward for flipping it: give the insight — why this project or moment mattered, or the design decision behind it.`
      );
    }
  });
  return issues;
}

const LEADING_NUMBER = /^\s*(?:\d{1,2}|[ivx]{1,4})\s*[.):\-–—]\s+/i;

export function repairArticleContent<T>(templateId: TemplateId, content: T, ctx: ReviewContext): T {
  const c: Content = structuredClone(content);

  // The templates number items themselves (01, 02…); a number in the label
  // prints the sequence twice.
  const strip = (s: unknown) => (typeof s === 'string' ? s.replace(LEADING_NUMBER, '') : s);
  if (templateId === 'template-02-longform-numbered-steps') {
    (c.steps ?? []).forEach((s: Content) => (s.sectionLabel = strip(s.sectionLabel)));
  } else if (templateId === 'template-04-basic-scroll') {
    (c.bodyItems ?? []).forEach((b: Content) => b.type === 'section' && (b.sectionLabel = strip(b.sectionLabel)));
  } else if (templateId === 'template-03-standard-article-toc') {
    (c.bodyItems ?? []).forEach((b: Content) => {
      if (b.type !== 'section') return;
      b.heading = strip(b.heading);
      if (b.navLabel) b.navLabel = strip(b.navLabel);
    });
  }

  // Quotes: an attribution survives only on a quote that's really in the brief.
  // Stat cells: only numbers backed by the brief or the known projects.
  const fixHighlight = (h: Content): Content | null => {
    if (!h) return h;
    if (h.type === 'pullQuote' && h.attribution && !quoteIsInBrief(h.quote, ctx)) return { ...h, attribution: null };
    if (h.type === 'statCard') {
      const cells = h.cells.filter((cell: Content) => numbersSupported(cell.number, ctx));
      return cells.length > 0 ? { ...h, cells } : null;
    }
    return h;
  };
  if (templateId === 'template-02-longform-numbered-steps') {
    (c.steps ?? []).forEach((s: Content) => (s.highlight = fixHighlight(s.highlight)));
  } else if (templateId === 'template-04-basic-scroll') {
    c.bodyItems = (c.bodyItems ?? [])
      .map((b: Content) => (b.type === 'highlight' ? { ...b, highlight: fixHighlight(b.highlight) } : b))
      .filter((b: Content) => b.type !== 'highlight' || b.highlight);
  } else if (templateId === 'template-01-case-study-roundup') {
    (c.entries ?? []).forEach((e: Content) => {
      if (e.statLine && !numbersSupported(e.statLine, ctx)) e.statLine = null;
    });
  }

  // Alt and caption: if only a caption came back, it's almost certainly a
  // description — move it to alt. If the caption just echoes the alt, drop it.
  const f = c.featureImage;
  if (f) {
    if (!f.alt?.trim() && f.caption) {
      f.alt = f.caption;
      f.caption = null;
    } else if (f.alt && f.caption && jaccard(stems(f.alt), stems(f.caption)) >= 0.6) {
      f.caption = null;
    }
  }

  return c;
}
