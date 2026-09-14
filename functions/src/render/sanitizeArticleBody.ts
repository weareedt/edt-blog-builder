import sanitizeHtml from 'sanitize-html';

const STYLE_OR_SCRIPT = /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Pulls every <style>/<script> block out of `html`, replacing each with a unique token. */
function extractBlocks(html: string): { stripped: string; blocks: string[] } {
  const blocks: string[] = [];
  const stripped = html.replace(STYLE_OR_SCRIPT, (match) => {
    const token = `@@PRESERVED_BLOCK_${blocks.length}@@`;
    blocks.push(match);
    return token;
  });
  return { stripped, blocks };
}

/**
 * Sanitizes a user-edited article body for safe re-storage.
 *
 * This output is meant to eventually live on the real EDT website, so an
 * edit is never trusted verbatim — but a normal text edit (fixing a typo,
 * rewording a paragraph) never needs to touch the article's own
 * <style>/<script> blocks at all, so the safest rule is the strictest one
 * that still allows that: any <style>/<script> block in the edited body is
 * kept only if it is byte-for-byte identical to one already present in the
 * last-known-good rendered output (originalBodyHtml) — new or modified
 * script/style content is silently dropped rather than trusted. Everything
 * else runs through a real content sanitizer (structural tags/attributes
 * only — no inline event handlers, no javascript: URLs).
 */
export function sanitizeEditedArticleBody(editedBodyHtml: string, originalBodyHtml: string): string {
  const { blocks: originalBlocks } = extractBlocks(originalBodyHtml);
  const allowedBlocks = new Set(originalBlocks);

  const { stripped, blocks: editedBlocks } = extractBlocks(editedBodyHtml);

  const sanitized = sanitizeHtml(stripped, {
    allowedTags: [
      'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'br', 'hr',
      'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
      'blockquote', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'title',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'tabindex'],
      a: ['href'],
      img: ['src', 'alt'],
    },
    allowedSchemesByTag: {
      img: ['data', 'http', 'https'],
      a: ['http', 'https', 'mailto'],
    },
    allowProtocolRelative: false,
  });

  return sanitized.replace(/@@PRESERVED_BLOCK_(\d+)@@/g, (_match, indexStr: string) => {
    const block = editedBlocks[Number(indexStr)];
    return block && allowedBlocks.has(block) ? block : '';
  });
}
