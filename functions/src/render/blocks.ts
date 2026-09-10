import { escapeHtml } from './escapeHtml';
import { sanitizeRichText } from './sanitizeRichText';

/**
 * The content-block vocabulary used inside one of template-03's sections.
 * `callout` is deliberately NOT a block kind here — in the original design
 * the `.callout` div is a standalone sibling between sections, not nested
 * inside one (it has no heading, no TOC entry, and the scrollspy never
 * observes it). It is modeled separately as a top-level body item — see
 * `BodyItem` in template03.schema.ts.
 */
export type ContentBlock =
  | { kind: 'paragraph'; richText: string }
  | { kind: 'bulletList'; items: string[] }
  | { kind: 'comparisonTable'; columns: string[]; rows: string[][] }
  | { kind: 'closingNote'; body: string };

/**
 * Renders one content block to raw HTML. All plain-text fields are
 * HTML-escaped and all rich-text fields pass through sanitizeRichText —
 * this function is the only place model-authored text becomes markup, so
 * every field must be escaped/sanitized here, never left raw.
 */
export function renderBlock(block: ContentBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return `<p>${sanitizeRichText(block.richText)}</p>`;

    case 'bulletList':
      return [
        '<ul>',
        ...block.items.map((item) => `  <li>${escapeHtml(item)}</li>`),
        '</ul>',
      ].join('\n');

    case 'comparisonTable': {
      const thead = `<tr>${block.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
      const tbody = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('\n              ');
      return [
        '<div class="table-scroll">',
        '  <table>',
        `    <thead>\n              ${thead}\n            </thead>`,
        `    <tbody>\n              ${tbody}\n            </tbody>`,
        '  </table>',
        '</div>',
      ].join('\n');
    }

    case 'closingNote':
      return ['<div class="closing">', `  <p>${sanitizeRichText(block.body)}</p>`, '</div>'].join(
        '\n'
      );
  }
}

/** The standalone `.callout` aside — see the note on ContentBlock above. */
export function renderCallout(callout: { label: string; body: string }): string {
  return [
    '<div class="callout">',
    `  <span class="label">${escapeHtml(callout.label)}</span>`,
    `  <p>${sanitizeRichText(callout.body)}</p>`,
    '</div>',
  ].join('\n');
}
