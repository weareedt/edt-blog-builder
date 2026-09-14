import { onCall } from 'firebase-functions/v2/https';

/**
 * Trivial callable used only to prove the client -> Functions emulator wiring
 * works in isolation, before anything else depends on it (Phase 0 verification).
 */
export const ping = onCall(() => {
  return { ok: true, at: Date.now() };
});

export { generateArticle } from './generateArticle';
export { updateArticleOutput } from './updateArticleOutput';
