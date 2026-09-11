import { useEffect, useRef } from 'react';

// The iframe renders the real static preview at desktop width so the
// template's own @media(min-width:900px) rules kick in, then gets scaled
// down uniformly to fit the small frame. Aspect ratio is fixed; callers
// only pick the frame's rendered width (`frameWidth`) — and, for a gallery
// that wants a close-up rather than the whole thing, a narrower
// `renderWidth`/`renderHeight` so a smaller slice of the page fills the
// same frame (see the flip-card gallery, which renders at mobile width so
// its single-column layout shows one card up close instead of a shrunk grid).
const RENDER_WIDTH = 1300;
const RENDER_HEIGHT = 900;

const SCROLL_THROUGH_MS = 5000;
const ACCORDION_STEP_MS = 900;

export type PreviewAnimation = 'scroll' | 'flip' | 'accordion';

/**
 * A small "OS window" thumbnail showing a template or gallery's real
 * rendered output (from app/public/template-previews/, built by
 * `npm run previews:build`) — not a screenshot, so it can never drift
 * from what the renderer actually produces. On hover, it plays whichever
 * animation actually demonstrates that layout:
 *  - 'scroll' (templates): scrolls top to bottom.
 *  - 'flip' (flip-card gallery): flips the card, same as a real hover/click.
 *  - 'accordion' (accordion gallery): cycles the expanded panel.
 * Pointer events are disabled on the iframe itself (see .preview-frame-shell__viewport
 * iframe in app.css), so real :hover states inside it never fire — every
 * animation here is driven directly against the iframe's own (same-origin,
 * static) document instead.
 */
export function TemplatePreviewFrame({
  previewUrl,
  label,
  frameWidth = 260,
  renderWidth = RENDER_WIDTH,
  renderHeight = RENDER_HEIGHT,
  animation = 'scroll',
}: {
  previewUrl: string;
  label: string;
  frameWidth?: number;
  renderWidth?: number;
  renderHeight?: number;
  animation?: PreviewAnimation;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rafRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const scale = frameWidth / renderWidth;
  const frameHeight = renderHeight * scale;

  function stopAnimation() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }

  useEffect(() => stopAnimation, []);

  function runScroll(win: Window, doc: Document) {
    const maxScroll = Math.max(0, doc.documentElement.scrollHeight - renderHeight);
    if (maxScroll === 0) return;
    const startedAt = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startedAt) / SCROLL_THROUGH_MS, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease-in-out
      win.scrollTo(0, eased * maxScroll);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    }
    rafRef.current = requestAnimationFrame(tick);
    cleanupRef.current = () => win.scrollTo(0, 0);
  }

  function runFlip(doc: Document) {
    const cards = Array.from(doc.querySelectorAll('.flip-card'));
    if (cards.length === 0) return;
    cards.forEach((c) => c.classList.add('flipped'));
    cleanupRef.current = () => cards.forEach((c) => c.classList.remove('flipped'));
  }

  function runAccordion(win: Window, doc: Document) {
    const panels = Array.from(doc.querySelectorAll<HTMLElement>('.panel'));
    if (panels.length === 0) return;
    function activate(index: number) {
      panels.forEach((panel, i) => {
        const cap = panel.querySelector<HTMLElement>('.cap');
        if (i === index) {
          panel.style.flex = '6';
          if (cap) cap.style.opacity = '1';
        } else {
          panel.style.flex = '1';
          if (cap) cap.style.opacity = '0';
        }
      });
    }
    let index = 0;
    activate(index);
    // Cleared via the same `win` it was created on — an id from the
    // iframe's own window's timer table means nothing to the parent
    // window's clearInterval (each window has its own id namespace).
    const intervalId = win.setInterval(() => {
      index = (index + 1) % panels.length;
      activate(index);
    }, ACCORDION_STEP_MS);
    cleanupRef.current = () => {
      win.clearInterval(intervalId);
      panels.forEach((panel) => {
        panel.style.flex = '';
        const cap = panel.querySelector<HTMLElement>('.cap');
        if (cap) cap.style.opacity = '';
      });
    };
  }

  function handleMouseEnter() {
    const win = iframeRef.current?.contentWindow;
    const doc = win?.document;
    if (!win || !doc?.documentElement) return;

    stopAnimation();
    if (animation === 'flip') runFlip(doc);
    else if (animation === 'accordion') runAccordion(win, doc);
    else runScroll(win, doc);
  }

  function handleMouseLeave() {
    stopAnimation();
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
          width={renderWidth}
          height={renderHeight}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
