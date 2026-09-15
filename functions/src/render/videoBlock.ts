import { escapeHtml } from './escapeHtml';

/** A video as stored on the article doc — see ArticleVideo in ../templates/article. */
export type VideoSource =
  | { kind: 'embed'; url: string }
  | { kind: 'upload'; downloadUrl: string; contentType: string };

export interface ResolvedEmbed {
  provider: 'youtube' | 'vimeo';
  embedSrc: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{5,12}$/;

/**
 * Turns whatever a person pastes from the address bar or a share sheet into
 * the provider's embeddable player URL, or null if it isn't a recognisable
 * YouTube or Vimeo video.
 *
 * The output is only ever built from an extracted, pattern-checked ID —
 * never by passing the pasted URL through — so the resulting src can only
 * ever point at the two player hosts the edit-save sanitizer allows.
 * YouTube is embedded via youtube-nocookie.com, its privacy-enhanced
 * player, since this ends up on EDT's public site.
 */
export function resolveEmbedUrl(raw: string): ResolvedEmbed | null {
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
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return { provider: 'youtube', embedSrc: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  let vimeoId: string | null = null;
  if (host === 'vimeo.com') {
    vimeoId = segments.find((s) => VIMEO_ID.test(s)) ?? null;
  } else if (host === 'player.vimeo.com' && segments[0] === 'video') {
    vimeoId = segments[1] ?? null;
  }
  if (vimeoId && VIMEO_ID.test(vimeoId)) {
    return { provider: 'vimeo', embedSrc: `https://player.vimeo.com/video/${vimeoId}` };
  }

  return null;
}

export interface RenderVideoBlockInput {
  id: string;
  source: VideoSource;
  caption: string | null;
}

/**
 * The self-contained style for a video block. Like the gallery components it
 * carries its own CSS rather than relying on any one template's classes —
 * the same block has to look right dropped into all four templates, and
 * template-03 has no `.os-window` of its own. Colours read the templates'
 * shared custom properties with literal fallbacks.
 *
 * Emitted once per article (see renderVideoStyles), not once per video, so
 * that an edit-save — which keeps a <style> block only if it's byte-
 * identical to one in the original output — sees exactly one copy.
 */
export function renderVideoStyles(): string {
  return `<style>
  .edt-video{margin:40px 0;}
  .edt-video .win{border:1px solid var(--hairline, rgba(255,255,255,0.14));background:var(--surface, #111);}
  .edt-video .bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--hairline, rgba(255,255,255,0.14));}
  .edt-video .bar span{font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--grey, #8C8C8C);}
  .edt-video .bar i{display:inline-block;width:9px;height:9px;margin-left:5px;border:1px solid var(--grey, #8C8C8C);}
  .edt-video .stage{position:relative;aspect-ratio:16/9;background:#000;}
  .edt-video .stage iframe,.edt-video .stage video{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;}
  .edt-video .cap{padding:12px 4px 0;font-size:12px;color:var(--grey, #8C8C8C);}
</style>`;
}

/**
 * Renders one video, framed in the same title-bar window chrome the
 * templates use for their feature images. Carries `data-block="video"` so
 * edit mode can find and move it (see the rearrange controls in the app).
 * An embed URL that doesn't resolve renders nothing rather than a broken
 * player — resolveEmbedUrl is also run at submit time, so that's a backstop.
 */
export function renderVideoBlock(input: RenderVideoBlockInput): string {
  const { id, source, caption } = input;

  let player: string;
  let label: string;
  if (source.kind === 'embed') {
    const resolved = resolveEmbedUrl(source.url);
    if (!resolved) return '';
    label = resolved.provider === 'youtube' ? 'VIDEO.EXE — YOUTUBE' : 'VIDEO.EXE — VIMEO';
    player = `<iframe src="${escapeHtml(resolved.embedSrc)}" title="${escapeHtml(caption ?? 'Video')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  } else {
    label = 'VIDEO.EXE';
    player = `<video controls playsinline preload="metadata"><source src="${escapeHtml(source.downloadUrl)}" type="${escapeHtml(source.contentType)}"></video>`;
  }

  return [
    `<figure class="edt-video" data-block="video" data-block-id="${escapeHtml(id)}">`,
    '  <div class="win">',
    `    <div class="bar"><span>${escapeHtml(label)}</span><span><i></i><i></i><i></i></span></div>`,
    `    <div class="stage">${player}</div>`,
    '  </div>',
    caption ? `  <figcaption class="cap">${escapeHtml(caption)}</figcaption>` : '',
    '</figure>',
  ]
    .filter(Boolean)
    .join('\n');
}
