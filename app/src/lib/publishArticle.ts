import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Publishes a ready article to the EDT site's blog, or updates the page it
 * already has. Returns the slug it published under — which may differ from
 * the one asked for, if another article already holds that URL.
 */
export async function publishArticle(articleId: string, slug?: string): Promise<{ slug: string; path: string }> {
  const call = httpsCallable<{ articleId: string; slug?: string }, { slug: string; path: string }>(
    functions,
    'publishArticle',
    { timeout: 120_000 }
  );
  const result = await call({ articleId, ...(slug ? { slug } : {}) });
  return result.data;
}

/** Takes the article off the site. The builder copy and its download are untouched. */
export async function unpublishArticle(articleId: string): Promise<void> {
  const call = httpsCallable(functions, 'unpublishArticle', { timeout: 60_000 });
  await call({ articleId });
}
