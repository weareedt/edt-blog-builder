import './admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { sanitizeEditedArticleBody } from './render/sanitizeArticleBody';
import type { ArticleDoc } from './templates/article';

// Generous but bounded — same spirit as PAYLOAD_TOO_LARGE elsewhere; a
// human-edited article body has no business approaching this.
const MAX_BODY_BYTES = 5 * 1024 * 1024;

/**
 * Lets the owner of a *ready* article touch up its generated content
 * (fixing a typo, rewording a line) before downloading it. Deliberately a
 * server-side callable rather than a direct client write to Storage:
 * storage.rules denies client writes to output.html outright, because this
 * HTML is meant to eventually be embedded into the real EDT website — an
 * edit is re-sanitized here rather than trusted verbatim, and any
 * <style>/<script> content that doesn't byte-for-byte match what was
 * already in the last-known-good output is dropped (see
 * sanitizeEditedArticleBody's own comment for why).
 */
export const updateArticleOutput = onCall(
  { timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const { articleId, bodyHtml } = (request.data ?? {}) as { articleId?: string; bodyHtml?: string };
    if (!articleId || typeof articleId !== 'string') {
      throw new HttpsError('invalid-argument', 'articleId is required.');
    }
    if (typeof bodyHtml !== 'string' || bodyHtml.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'bodyHtml is required.');
    }
    if (Buffer.byteLength(bodyHtml, 'utf8') > MAX_BODY_BYTES) {
      throw new HttpsError('invalid-argument', 'Edited content is too large.');
    }

    const db = getFirestore();
    const docRef = db.collection('articles').doc(articleId);
    const uid = request.auth.uid;

    const snap = await docRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Article not found.');
    const article = snap.data() as ArticleDoc;
    if (article.createdBy !== uid) throw new HttpsError('permission-denied', 'Not your article.');
    if (article.status !== 'ready') {
      throw new HttpsError('failed-precondition', 'Only a ready article can be edited.');
    }
    if (!article.outputHtmlStoragePath) {
      throw new HttpsError('failed-precondition', 'This article has no stored output yet.');
    }

    const bucket = getStorage().bucket();
    const file = bucket.file(article.outputHtmlStoragePath);
    const [originalBuffer] = await file.download();
    const originalHtml = originalBuffer.toString('utf8');

    const bodyMatch = originalHtml.match(/<body>([\s\S]*)<\/body>/);
    if (!bodyMatch) throw new HttpsError('internal', 'Stored output is not in the expected format.');
    const originalBodyHtml = bodyMatch[1];

    const sanitizedBody = sanitizeEditedArticleBody(bodyHtml, originalBodyHtml);
    const updatedHtml = originalHtml.replace(/<body>[\s\S]*<\/body>/, `<body>\n${sanitizedBody}\n</body>`);

    await file.save(Buffer.from(updatedHtml, 'utf8'), { contentType: 'text/html' });

    await docRef.update({
      outputSizeBytes: Buffer.byteLength(updatedHtml, 'utf8'),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { status: 'ok' as const };
  }
);
