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
      // Video blocks. An <iframe> is only kept when its src is on one of
      // allowedIframeHostnames below — anything else is dropped whole.
      'iframe', 'video', 'source',
    ],
    allowedAttributes: {
      // data-* must survive a save: the templates' own CSS and scripts key
      // off them (data-reveal gates scroll-in visibility, data-default picks
      // the accordion's open panel, data-block marks what can be
      // rearranged). Stripping them silently broke those features after the
      // first edit. They're inert as far as script execution goes — the
      // only scripts that read them are the byte-identical originals above.
      '*': ['class', 'id', 'tabindex', 'data-*'],
      a: ['href'],
      img: ['src', 'alt'],
      iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'],
      video: ['src', 'controls', 'playsinline', 'preload', 'poster'],
      source: ['src', 'type'],
    },
    allowedSchemesByTag: {
      img: ['data', 'http', 'https'],
      a: ['http', 'https', 'mailto'],
      iframe: ['https'],
      // http is for the local Storage emulator (http://127.0.0.1:9199);
      // real Firebase Storage download URLs are always https.
      video: ['http', 'https'],
      source: ['http', 'https'],
    },
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'],
    allowProtocolRelative: false,
    // A disallowed iframe host or video scheme only loses its src above,
    // leaving an empty player shell behind. Drop the element entirely.
    exclusiveFilter: (frame) =>
      (frame.tag === 'iframe' || frame.tag === 'source') && !frame.attribs.src,
  });

  return sanitized.replace(/@@PRESERVED_BLOCK_(\d+)@@/g, (_match, indexStr: string) => {
    const block = editedBlocks[Number(indexStr)];
    return block && allowedBlocks.has(block) ? block : '';
  });
}
