import { useRef } from 'react';

// The iframe renders the real static preview at desktop width so the
// template's own @media(min-width:900px) rules kick in, then gets scaled
// down uniformly to fit the small frame. Aspect ratio is fixed; callers
// only pick the frame's rendered width (`frameWidth`).
const RENDER_WIDTH = 1300;
const RENDER_HEIGHT = 900;

const SCROLL_THROUGH_MS = 5000;

/**
 * A small "OS window" thumbnail showing a template or gallery's real
 * rendered output (from app/public/template-previews/, built by
 * `npm run previews:build`) — not a screenshot, so it can never drift
 * from what the renderer actually produces. On hover, scrolls the
 * iframe's own content from top to bottom so the picker gives a sense of
 * the whole layout, not just the hero.
 */
export function TemplatePreviewFrame({
  previewUrl,
  label,
  frameWidth = 260,
}: {
  previewUrl: string;
  label: string;
  frameWidth?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rafRef = useRef<number | null>(null);
  const scale = frameWidth / RENDER_WIDTH;
  const frameHeight = RENDER_HEIGHT * scale;

  function stopAnimation() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function handleMouseEnter() {
    const win = iframeRef.current?.contentWindow;
    const doc = win?.document;
    if (!win || !doc?.documentElement) return;

    const maxScroll = Math.max(0, doc.documentElement.scrollHeight - RENDER_HEIGHT);
    if (maxScroll === 0) return;

    stopAnimation();
    const startedAt = performance.now();

    function tick(now: number) {
      const t = Math.min((now - startedAt) / SCROLL_THROUGH_MS, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease-in-out
      win!.scrollTo(0, eased * maxScroll);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleMouseLeave() {
    stopAnimation();
    iframeRef.current?.contentWindow?.scrollTo(0, 0);
  }

  return (
    <div className="preview-frame-shell" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="preview-frame-shell__bar">
        <span className="preview-frame-shell__bar-label">{label}</span>
        <span className="preview-frame-shell__dots">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="preview-frame-shell__viewport" style={{ width: frameWidth, height: frameHeight }}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          title={`${label} preview`}
          tabIndex={-1}
          width={RENDER_WIDTH}
          height={RENDER_HEIGHT}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
