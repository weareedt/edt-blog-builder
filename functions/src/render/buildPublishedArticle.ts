import { scopeArticleCss } from './scopeArticleCss';

export interface PublishedArticleHtml {
  /** The article's own CSS, scoped to the container class. */
  styleCss: string;
  /** The article markup, wrapped in that container. No <style>, no <script>. */
  bodyHtml: string;
}

/** The class the published article's markup and CSS are scoped to. */
export const ARTICLE_SCOPE_CLASS = 'edt-article';

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const TITLE_TAG = /<title\b[^>]*>[\s\S]*?<\/title>/gi;

/**
 * Turns a rendered article fragment into something a Next.js page can embed.
 *
 * Three things have to change on the way from "standalone .html file" to
 * "section of the EDT site":
 *
 * 1. CSS is scoped (see scopeArticleCss) so the article can't restyle the
 *    site and Tailwind can't restyle the article.
 * 2. <script> blocks are dropped. Markup injected into a React page doesn't
 *    execute its scripts, so they'd be dead weight that merely looks alive —
 *    the site re-implements the three behaviours (table-of-contents
 *    scrollspy, flip cards, scroll reveals) as a client component instead.
 * 3. The leftover <title> (every template fragment opens with one) goes:
 *    the page's own metadata supplies the document title.
 *
 * The downloadable .html is untouched by any of this — it keeps its scripts,
 * its own <title>, and its packed-in photos.
 */
export function buildPublishedArticle(fragment: string): PublishedArticleHtml {
  const styles: string[] = [];
  const withoutStyles = fragment.replace(STYLE_BLOCK, (_match, css: string) => {
    styles.push(css);
    return '';
  });

  const markup = withoutStyles.replace(SCRIPT_BLOCK, '').replace(TITLE_TAG, '').trim();
  const styleCss = scopeArticleCss(styles.join('\n'), `.${ARTICLE_SCOPE_CLASS}`).trim();

  return {
    styleCss,
    bodyHtml: `<div class="${ARTICLE_SCOPE_CLASS}">\n${markup}\n</div>`,
  };
}
