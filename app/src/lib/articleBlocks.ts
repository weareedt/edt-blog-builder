import type { TemplateId } from '../types/article';

/**
 * Edit-mode rearranging, operating directly on the preview iframe's DOM.
 *
 * The edit iframe runs with scripts disabled (see the sandbox note in
 * ArticleDetailPage), so nothing here runs inside the article — the app
 * reaches into the same-origin document and moves nodes itself. The
 * controls live in the app, not injected into the article, so there's
 * nothing to strip back out on save beyond the focus highlight class.
 */

export type BlockKind = 'section' | 'entry' | 'step' | 'callout' | 'highlight' | 'gallery' | 'video' | 'photo';

export interface ArticleBlock {
  kind: BlockKind;
  label: string;
  /** Usually one element; a flowing-deep-dive section is its label plus its body copy. */
  nodes: Element[];
}

interface TemplateBlockConfig {
  /**
   * The container blocks are rearranged within. A movable block outside it
   * — a page-level gallery or feature photo — is pulled into it when
   * something moves past, rather than pushing a text section out to page
   * level where it would lose its column.
   */
  root: string;
  blocks: string;
}

const SHARED = '.gallery-wrap, .edt-video';

const CONFIG: Record<TemplateId, TemplateBlockConfig> = {
  'template-01-case-study-roundup': { root: '.roundup > .wrap', blocks: `article.entry, ${SHARED}` },
  // `.steps`, not the column: steps are grid items styled as a list, so they
  // stay in it and galleries/videos join them instead.
  'template-02-longform-numbered-steps': {
    root: '.article-body .steps',
    blocks: `section.feature-media, article.step, ${SHARED}`,
  },
  'template-03-standard-article-toc': { root: '.article-main', blocks: `.article-section, .callout, ${SHARED}` },
  'template-04-basic-scroll': {
    root: '.article-body .col',
    blocks: `section.feature-media, .section-label, .pull-quote, .stat-card, .inline-tags, ${SHARED}`,
  },
};

const FOCUS_CLASS = 'edt-editor-focus';

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(s: string, max = 64): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function describe(el: Element): { kind: BlockKind; label: string } {
  if (el.matches('.gallery-wrap')) {
    const count = el.querySelectorAll('img').length;
    return { kind: 'gallery', label: `${count} photo${count === 1 ? '' : 's'}` };
  }
  if (el.matches('.edt-video')) return { kind: 'video', label: text(el.querySelector('figcaption')) || 'Video' };
  if (el.matches('.feature-media')) {
    return { kind: 'photo', label: text(el.querySelector('.feature-caption')) || 'Feature photo' };
  }
  if (el.matches('article.entry')) return { kind: 'entry', label: text(el.querySelector('h2')) };
  if (el.matches('article.step')) return { kind: 'step', label: text(el.querySelector('.section-label')) };
  if (el.matches('.article-section')) return { kind: 'section', label: text(el.querySelector('h2')) };
  if (el.matches('.section-label')) return { kind: 'section', label: text(el) };
  if (el.matches('.callout')) return { kind: 'callout', label: text(el.querySelector('.label')) || 'Callout' };
  if (el.matches('.pull-quote')) return { kind: 'highlight', label: `Quote — ${text(el.querySelector('p'))}` };
  if (el.matches('.stat-card')) return { kind: 'highlight', label: `Stats — ${text(el.querySelector('.os-titlebar .name'))}` };
  return { kind: 'highlight', label: `Tags — ${text(el)}` };
}

/** The article's movable blocks, in reading order. Empty if this doesn't look like the given template. */
export function getBlocks(doc: Document, templateId: TemplateId): ArticleBlock[] {
  const config = CONFIG[templateId];
  if (!doc.querySelector(config.root)) return [];

  const candidates = Array.from(doc.querySelectorAll(config.blocks));
  return candidates
    // A highlight inside a step, say, moves with its step — not on its own.
    .filter((el) => !candidates.some((other) => other !== el && other.contains(el)))
    .map((el) => {
      const nodes = [el];
      if (el.matches('.section-label') && el.nextElementSibling?.matches('.body-copy')) {
        nodes.push(el.nextElementSibling);
      }
      const { kind, label } = describe(el);
      return { kind, label: truncate(label), nodes };
    });
}

function insertBefore(nodes: Element[], ref: Element) {
  for (const node of nodes) ref.parentNode!.insertBefore(node, ref);
}

function insertAfter(nodes: Element[], ref: Element) {
  let anchor: Node = ref;
  for (const node of nodes) {
    anchor.parentNode!.insertBefore(node, anchor.nextSibling);
    anchor = node;
  }
}

/**
 * Moves block `index` one place up (-1) or down (+1), then re-derives
 * everything the templates compute from order. Returns the block's new index.
 */
export function moveBlock(doc: Document, templateId: TemplateId, index: number, direction: -1 | 1): number {
  const blocks = getBlocks(doc, templateId);
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return index;

  const root = doc.querySelector(CONFIG[templateId].root)!;
  const inRoot = (b: ArticleBlock) => root.contains(b.nodes[0]);
  const moving = blocks[index];
  const neighbour = blocks[target];
  const first = (b: ArticleBlock) => b.nodes[0];
  const last = (b: ArticleBlock) => b.nodes[b.nodes.length - 1];

  // Normally the moving block steps over its neighbour into the neighbour's
  // container. The exception: a block inside the root never steps out past
  // a page-level neighbour — the neighbour comes in on its other side
  // instead. Same resulting order; the text stays in its column.
  const moveNeighbourInstead = inRoot(moving) && !inRoot(neighbour);
  if (direction === 1) {
    if (moveNeighbourInstead) insertBefore(neighbour.nodes, first(moving));
    else insertAfter(moving.nodes, last(neighbour));
  } else {
    if (moveNeighbourInstead) insertAfter(neighbour.nodes, last(moving));
    else insertBefore(moving.nodes, first(neighbour));
  }

  renumber(doc, templateId);
  return target;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Re-applies what each template's prepareContext derives from position, so a
 * moved block doesn't leave "03" before "02", a drop cap on the third
 * paragraph, or a TOC in the old order.
 */
function renumber(doc: Document, templateId: TemplateId) {
  const root = doc.querySelector(CONFIG[templateId].root);
  if (!root) return;

  switch (templateId) {
    case 'template-01-case-study-roundup': {
      const entries = Array.from(root.querySelectorAll(':scope > article.entry'));
      entries.forEach((entry, i) => {
        entry.classList.toggle('flip', i % 2 === 1);
        const index = entry.querySelector('.copy .index');
        if (index) index.textContent = `${pad2(i + 1)} / ${entries.length}`;
      });
      break;
    }
    case 'template-02-longform-numbered-steps': {
      const steps = Array.from(root.querySelectorAll(':scope > article.step'));
      steps.forEach((step, i) => {
        const num = step.querySelector('.step-num');
        if (num) num.textContent = pad2(i + 1);
        step.querySelector('.body-copy')?.classList.toggle('drop', i === 0);
      });
      break;
    }
    case 'template-03-standard-article-toc': {
      const list = doc.getElementById('tocList');
      if (!list) break;
      const items = Array.from(list.querySelectorAll(':scope > li'));
      const byAnchor = new Map(items.map((li) => [li.querySelector('a')?.getAttribute('href')?.slice(1), li]));
      root.querySelectorAll('.article-section').forEach((section) => {
        const li = byAnchor.get(section.id);
        if (li) list.appendChild(li);
      });
      list.querySelectorAll(':scope > li .n').forEach((n, i) => (n.textContent = pad2(i + 1)));
      break;
    }
    case 'template-04-basic-scroll': {
      const bodies = Array.from(root.querySelectorAll(':scope > .section-label + .body-copy'));
      bodies.forEach((body, i) => body.classList.toggle('drop', i === 0));
      break;
    }
  }
}

/** Outlines one block in the preview and scrolls it into view. Pass -1 to clear. */
export function focusBlock(doc: Document, templateId: TemplateId, index: number) {
  if (!doc.getElementById('edt-editor-style')) {
    // In <head>, which a save never sends — only body.innerHTML is saved.
    const style = doc.createElement('style');
    style.id = 'edt-editor-style';
    style.textContent = `.${FOCUS_CLASS}{outline:2px dashed #2D2DFF;outline-offset:8px;}`;
    doc.head.appendChild(style);
  }
  doc.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => el.classList.remove(FOCUS_CLASS));
  const block = getBlocks(doc, templateId)[index];
  if (!block) return;
  block.nodes.forEach((n) => n.classList.add(FOCUS_CLASS));
  // Not scrollIntoView: that also scrolls every scrollable ancestor —
  // including the app page around the iframe — so the outline and buttons
  // would jump off screen on every move. Scroll the article's own window only.
  const win = doc.defaultView;
  if (win) {
    const top = block.nodes[0].getBoundingClientRect().top + win.scrollY - win.innerHeight / 3;
    win.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}

/** The edited body as it should be saved — without the editor's focus highlight. */
export function serializeBodyForSave(doc: Document): string {
  const clone = doc.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => {
    el.classList.remove(FOCUS_CLASS);
    if (!el.getAttribute('class')) el.removeAttribute('class');
  });
  return clone.innerHTML;
}
