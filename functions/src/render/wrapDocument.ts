import { escapeHtml } from './escapeHtml';

export interface DocumentShellInput {
  title: string;
  description: string;
  /** The rendered template fragment (the annotated template's own output). */
  bodyHtml: string;
}

/**
 * Wraps a rendered template fragment into a complete HTML document. This
 * exists because none of the source templates are complete documents —
 * every one of them starts with <title> immediately followed by <style>,
 * with no <!DOCTYPE>, <html>, <head>, or <body> at all.
 */
export function wrapDocument(input: DocumentShellInput): string {
  const { title, description, bodyHtml } = input;

  // bodyHtml itself begins with the fragment's own <title> and <style>
  // (every source template does — see F1: none of them are complete HTML
  // documents). Those are valid, if unusual, inside <body> — real browsers
  // parse and render them correctly (verified visually) — so the fragment
  // is placed in <body> as-is, rather than attempting to split title/style
  // out into <head> by string surgery.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
