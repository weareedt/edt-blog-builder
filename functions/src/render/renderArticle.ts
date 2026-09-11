import Handlebars from 'handlebars';
import { renderBlock, renderCallout } from './blocks';
import { renderHighlight } from './highlightBlocks';

let helpersRegistered = false;

function registerHelpers(): void {
  if (helpersRegistered) return;
  helpersRegistered = true;

  Handlebars.registerHelper('pad2', (zeroBasedIndex: number) =>
    String(zeroBasedIndex + 1).padStart(2, '0')
  );

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

  Handlebars.registerHelper('renderBlock', (block: Parameters<typeof renderBlock>[0]) => {
    return new Handlebars.SafeString(renderBlock(block));
  });

  Handlebars.registerHelper('renderCallout', (callout: Parameters<typeof renderCallout>[0]) => {
    return new Handlebars.SafeString(renderCallout(callout));
  });

  Handlebars.registerHelper('renderHighlight', (highlight: Parameters<typeof renderHighlight>[0]) => {
    return new Handlebars.SafeString(renderHighlight(highlight));
  });
}

/**
 * Compiles and renders one annotated template's Handlebars source against a
 * pre-built context object. This is a thin, template-agnostic engine — all
 * per-template logic (computing anchors, the eyebrow string, gallery HTML,
 * etc.) happens in that template's own `prepareContext` function before
 * calling this, so the .hbs source itself stays declarative.
 */
export function renderArticle(templateSource: string, context: Record<string, unknown>): string {
  registerHelpers();
  const compiled = Handlebars.compile(templateSource, { noEscape: false, strict: true });
  return compiled(context);
}
