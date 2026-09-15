// A copy of resolveEmbedUrl in functions/src/render/videoBlock.ts, so the
// brief form can tell someone their link won't work before they submit —
// the same small, explicit duplication as types/article.ts. The server copy
// is the one that matters: it runs again at render time and renders nothing
// for a URL it can't resolve.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{5,12}$/;

export function resolveEmbedUrl(raw: string): { provider: 'youtube' | 'vimeo'; id: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\.|^m\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  let youtubeId: string | null = null;
  if (host === 'youtu.be') {
    youtubeId = segments[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (segments[0] === 'watch') youtubeId = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(segments[0])) youtubeId = segments[1] ?? null;
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) return { provider: 'youtube', id: youtubeId };

  let vimeoId: string | null = null;
  if (host === 'vimeo.com') {
    vimeoId = segments.find((s) => VIMEO_ID.test(s)) ?? null;
  } else if (host === 'player.vimeo.com' && segments[0] === 'video') {
    vimeoId = segments[1] ?? null;
  }
  if (vimeoId && VIMEO_ID.test(vimeoId)) return { provider: 'vimeo', id: vimeoId };

  return null;
}
