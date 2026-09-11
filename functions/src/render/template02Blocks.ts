import { escapeHtml } from './escapeHtml';
import { sanitizeRichText } from './sanitizeRichText';
import type { StepHighlight } from '../templates/content/template02.schema';

/**
 * Renders a step's optional trailing highlight (at most one per step,
 * matching the source design exactly — never a mix of pull-quote and
 * stat-card in the same step). All plain-text fields are HTML-escaped and
 * quote text passes through sanitizeRichText — this function is the only
 * place model-authored text becomes markup here, so every field must be
 * escaped/sanitized, never left raw.
 */
export function renderStepHighlight(highlight: StepHighlight): string {
  switch (highlight.type) {
    case 'pullQuote':
      return [
        '<div class="pull-quote" data-reveal>',
        `  <p>"${sanitizeRichText(highlight.quote)}"</p>`,
        `  <div class="src">${escapeHtml(highlight.attribution)}</div>`,
        '</div>',
      ].join('\n');

    case 'statCard': {
      const cells = highlight.cells
        .map(
          (cell) =>
            `      <div class="stat-cell">\n        <div class="stat-num">${escapeHtml(cell.number)}</div>\n        <div class="stat-label">${escapeHtml(cell.label)}</div>\n      </div>`
        )
        .join('\n');
      return [
        '<div class="stat-card" data-reveal>',
        '  <div class="os-window">',
        `    <div class="os-titlebar"><span class="name">${escapeHtml(highlight.windowLabel)}</span><div class="os-btns"><i></i><i></i><i></i></div></div>`,
        '    <div class="stat-grid">',
        cells,
        '    </div>',
        '  </div>',
        '</div>',
      ].join('\n');
    }

    case 'tagList': {
      const tags = highlight.tags
        .map((tag, i) => `  <span class="tag${i === 0 ? ' blue' : ''}">${escapeHtml(tag)}</span>`)
        .join('\n');
      return ['<div class="inline-tags">', tags, '</div>'].join('\n');
    }
  }
}
