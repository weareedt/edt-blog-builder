/**
 * Rewrites a generated article's CSS so it can be embedded in a page that has
 * its own stylesheet.
 *
 * The templates were written as standalone documents: they style `body`,
 * `html`, `*` and plenty of generic class names (`.wrap`, `.title`, `.tag`,
 * `.btn-primary`, `.display-md`). The EDT site uses several of those names
 * itself, so dropping an article into one of its pages would have the two
 * stylesheets overwriting each other in both directions — we already watched
 * a template's own `.tag` rule wreck a gallery card inside a single article.
 *
 * Every selector is therefore prefixed with a scope class, and the
 * document-level selectors are rewritten to mean "the article container":
 *
 *   body{background:#0A0A0A}      ->  .edt-article{background:#0A0A0A}
 *   *{box-sizing:border-box}      ->  .edt-article *{box-sizing:border-box}
 *   .wrap{max-width:1180px}       ->  .edt-article .wrap{max-width:1180px}
 *   @media(...){ .col{...} }      ->  @media(...){ .edt-article .col{...} }
 *
 * At-rules that don't contain selectors (@font-face, @keyframes, @import) are
 * left exactly as they are: their contents aren't selectors, and prefixing
 * keyframe steps or font descriptors would break them.
 */

/** At-rules whose body is declarations or keyframe steps, not selectors. */
const VERBATIM_AT_RULES = /^@(font-face|keyframes|-webkit-keyframes|counter-style|font-feature-values|property|page)\b/i;
/** At-rules whose body is more rules, so we recurse into it. */
const NESTED_AT_RULES = /^@(media|supports|container|layer|scope)\b/i;

/** Selectors that mean "the document" in a standalone article. */
const DOCUMENT_SELECTOR = /^(?::root|html|body)$/i;

function scopeSelector(selector: string, scope: string): string {
  const trimmed = selector.trim();
  if (trimmed.length === 0) return trimmed;

  // `html, body { … }` and `:root { … }` all become the container itself.
  if (DOCUMENT_SELECTOR.test(trimmed)) return scope;

  // `html.x`, `body > .y`, `body:hover` — swap the document part for the
  // container and keep the rest of the selector.
  const documentPrefix = trimmed.match(/^(?::root|html|body)\b/i);
  if (documentPrefix) return `${scope}${trimmed.slice(documentPrefix[0].length)}`;

  return `${scope} ${trimmed}`;
}

function scopeSelectorList(selectorList: string, scope: string): string {
  // Split on commas that aren't inside (), [] or quotes — :is(a, b) is one selector.
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const ch of selectorList) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);

  return parts
    .map((part) => scopeSelector(part, scope))
    .filter((part) => part.length > 0)
    .join(', ');
}

/** Splits CSS into top-level chunks: `prelude { body }` blocks and stray text. */
function splitRules(css: string): Array<{ prelude: string; body: string | null }> {
  const rules: Array<{ prelude: string; body: string | null }> = [];
  let prelude = '';
  let depth = 0;
  let body = '';
  let quote: string | null = null;
  let inComment = false;

  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    const next = css[i + 1];

    if (inComment) {
      if (depth === 0) prelude += ch;
      else body += ch;
      if (ch === '*' && next === '/') {
        inComment = false;
        if (depth === 0) prelude += next;
        else body += next;
        i += 1;
      }
      continue;
    }
    if (!quote && ch === '/' && next === '*') {
      inComment = true;
      if (depth === 0) prelude += ch;
      else body += ch;
      continue;
    }
    if (quote) {
      if (depth === 0) prelude += ch;
      else body += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (depth === 0) prelude += ch;
      else body += ch;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      if (depth === 1) continue; // the brace itself isn't part of either string
      body += ch;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push({ prelude, body });
        prelude = '';
        body = '';
        continue;
      }
      body += ch;
      continue;
    }

    if (depth === 0) prelude += ch;
    else body += ch;
  }

  // Trailing text with no block (e.g. a bare @import or stray whitespace).
  if (prelude.trim().length > 0) rules.push({ prelude, body: null });

  return rules;
}

/** Index of the last `;` outside quotes and parens, or -1. */
function lastTopLevelSemicolon(text: string): number {
  let depth = 0;
  let quote: string | null = null;
  let found = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    else if (ch === ';' && depth === 0) found = i;
  }
  return found;
}

export function scopeArticleCss(css: string, scope = '.edt-article'): string {
  return splitRules(css)
    .map(({ prelude, body }) => {
      if (body === null) return prelude;

      // A statement at-rule (`@import …;`, `@charset …;`) is swallowed into
      // the NEXT rule's prelude by the block splitter, since it has no braces
      // of its own. Peel those off first, or the rule after an @import —
      // which in every one of these templates is `:root{…}` — would be
      // treated as part of the at-rule and escape scoping entirely.
      const semicolon = lastTopLevelSemicolon(prelude);
      if (semicolon >= 0) {
        const statements = prelude.slice(0, semicolon + 1);
        const rest = prelude.slice(semicolon + 1);
        return statements + scopeArticleCss(`${rest}{${body}}`, scope);
      }

      const trimmedPrelude = prelude.trim();
      if (VERBATIM_AT_RULES.test(trimmedPrelude)) return `${prelude}{${body}}`;
      if (NESTED_AT_RULES.test(trimmedPrelude)) {
        return `${prelude}{${scopeArticleCss(body, scope)}}`;
      }
      if (trimmedPrelude.startsWith('@')) return `${prelude}{${body}}`;

      // Keep any comment sitting in front of the selector where it was.
      const commentMatch = prelude.match(/^([\s\S]*\*\/)?([\s\S]*)$/);
      const leading = commentMatch?.[1] ?? '';
      const selectors = commentMatch?.[2] ?? prelude;

      return `${leading}${scopeSelectorList(selectors, scope)}{${body}}`;
    })
    .join('');
}
