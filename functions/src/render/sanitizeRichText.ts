import sanitizeHtml from 'sanitize-html';

/**
 * The only inline markup a model-authored body-copy field may contain.
 * Anything outside this allowlist is stripped, not escaped-and-shown.
 */
export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['strong', 'em', 'a', 'code'],
    allowedAttributes: {
      a: ['href'],
    },
    // Disallowed-scheme hrefs (javascript:, data:, etc.) are stripped from
    // the attribute rather than removing the whole element/text.
    allowedSchemes: ['http', 'https'],
    allowProtocolRelative: false,
  }).trim();
}
