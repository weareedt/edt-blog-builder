import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';
import type { ArticleVideo, VideoPlacement } from '../types/article';

/** Matches the limits in storage.rules — checked here first so the error is readable. */
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

/** A video chosen in the brief form, not yet uploaded (if it's a file). */
export type PendingVideo = {
  id: string;
  caption: string | null;
  placement: VideoPlacement;
} & ({ kind: 'embed'; url: string } | { kind: 'upload'; file: File });

export class UnsupportedVideoError extends Error {}

export function checkVideoFile(file: File): string | null {
  if (!(VIDEO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Use an MP4, WebM or MOV file.';
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(0)}MB — the limit is ${VIDEO_MAX_BYTES / 1024 / 1024}MB.`;
  }
  return null;
}

/**
 * Turns a pending video into the ArticleVideo stored on the doc — uploading
 * it first if it's a file. The stored `downloadUrl` is Firebase's tokenised
 * download link, which is what the generated article points its <video> at:
 * it works for anyone who has the article, signed in or not, which is what
 * a published blog post needs. It stops working only if the file is deleted
 * or its token revoked in the console.
 */
export async function resolvePendingVideo(
  uid: string,
  articleId: string,
  pending: PendingVideo,
  onProgress?: (fraction: number) => void
): Promise<ArticleVideo> {
  const base = { id: pending.id, caption: pending.caption, placement: pending.placement };
  if (pending.kind === 'embed') return { ...base, kind: 'embed', url: pending.url.trim() };

  const problem = checkVideoFile(pending.file);
  if (problem) throw new UnsupportedVideoError(problem);

  const ext = pending.file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const storagePath = `users/${uid}/uploads/${articleId}/videos/${pending.id}.${ext}`;
  const storageRef = ref(storage, storagePath);

  const task = uploadBytesResumable(storageRef, pending.file, { contentType: pending.file.type });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      reject,
      () => resolve()
    );
  });

  return {
    ...base,
    kind: 'upload',
    storagePath,
    downloadUrl: await getDownloadURL(storageRef),
    contentType: pending.file.type,
    bytes: pending.file.size,
  };
}
