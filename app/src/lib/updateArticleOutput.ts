import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function updateArticleOutput(articleId: string, bodyHtml: string): Promise<void> {
  const call = httpsCallable(functions, 'updateArticleOutput', { timeout: 60_000 });
  await call({ articleId, bodyHtml });
}
