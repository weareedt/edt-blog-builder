import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { functions, storage } from '../lib/firebase';
import { useArticle } from '../lib/useArticle';
import { useRegeneratedVersions } from '../lib/useRegeneratedVersions';
import { regenerateArticle } from '../lib/regenerateArticle';
import { updateArticleOutput } from '../lib/updateArticleOutput';
import { StatusBadge } from '../components/StatusBadge';
import type { ArticleErrorCode } from '../types/article';

// One line of guidance per failure mode — the specific detail (e.g. the
// actual payload size for PAYLOAD_TOO_LARGE) already lives in
// article.errorMessage; this just says what it generally means / what to
// try, since errorCode alone isn't self-explanatory to someone using the
// tool rather than reading the Cloud Function's source.
const ERROR_HINTS: Record<ArticleErrorCode, string> = {
  SCHEMA_VALIDATION_FAILED:
    "The model's output didn't match the required structure, even after one retry.",
  MODEL_ERROR: 'The model declined or errored while generating.',
  TIMEOUT: 'Generation took too long and timed out.',
  PAYLOAD_TOO_LARGE: 'The uploaded images are too large once inlined into the article — try removing some.',
  RENDER_FAILED: 'The content generated successfully, but rendering it to HTML failed.',
  UNKNOWN: 'Something unexpected went wrong.',
};

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { uid } = useAuth();
  const navigate = useNavigate();
  const { article, loading } = useArticle(articleId);
  const regeneratedVersions = useRegeneratedVersions(uid, articleId);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function generate() {
    if (!articleId) return;
    setTriggering(true);
    setTriggerError(null);
    try {
      const generateArticle = httpsCallable(functions, 'generateArticle', { timeout: 540_000 });
      await generateArticle({ articleId });
    } catch (err) {
      // The Firestore doc's own status/errorMessage is the source of truth
      // (see the callable's design) — this is only advisory, immediate
      // feedback for the common case where the call itself couldn't even
      // be dispatched.
      setTriggerError(err instanceof Error ? err.message : 'Could not start generation.');
    } finally {
      setTriggering(false);
    }
  }

  async function regenerate() {
    if (!article) return;
    setRegenerating(true);
    try {
      const newArticleId = await regenerateArticle(article);
      navigate(`/article/${newArticleId}`);
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (!article) return <div className="page">Article not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{article.title ?? article.brief.slice(0, 60)}</h1>
        <StatusBadge status={article.status} />
      </div>

      {(article.regeneratedFromArticleId || regeneratedVersions.length > 0) && (
        <p className="muted lineage-note">
          {article.regeneratedFromArticleId && (
            <>
              Regenerated from{' '}
              <Link to={`/article/${article.regeneratedFromArticleId}`}>an earlier version</Link>.{' '}
            </>
          )}
          {regeneratedVersions.map((v) => (
            <span key={v.id}>
              Regenerated as <Link to={`/article/${v.id}`}>{v.title ?? 'a new version'}</Link>.{' '}
            </span>
          ))}
        </p>
      )}

      {article.status === 'draft' && (
        <div className="panel">
          <PanelBar label="DRAFT.EXE" />
          <div className="panel__body">
            <p>This article hasn't been generated yet.</p>
            <button type="button" className="btn btn-primary" onClick={generate} disabled={triggering}>
              {triggering ? 'Starting…' : 'Generate'}
              {!triggering && <span className="arrow">→</span>}
            </button>
            {triggerError && <p className="field-error">{triggerError}</p>}
          </div>
        </div>
      )}

      {article.status === 'generating' && (
        <div className="panel">
          <PanelBar label="GENERATING.EXE" />
          <div className="panel__body">
            <p>Generating your article — this can take a minute or two.</p>
          </div>
        </div>
      )}

      {article.status === 'failed' && (
        <div className="panel panel--error">
          <PanelBar label="ERROR.EXE" />
          <div className="panel__body">
            <p>Generation failed. {article.errorCode ? ERROR_HINTS[article.errorCode] : ''}</p>
            {article.errorMessage && <p className="muted">{article.errorMessage}</p>}
            <button type="button" className="btn btn-primary" onClick={generate} disabled={triggering}>
              {triggering ? 'Retrying…' : 'Try again'}
              {!triggering && <span className="arrow">→</span>}
            </button>
          </div>
        </div>
      )}

      {article.status === 'ready' && (
        <div className="panel">
          <PanelBar label="ARTICLE.EXE" />
          <div className="panel__body">
            <p>Your article is ready.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={regenerate} disabled={regenerating}>
                {regenerating ? 'Creating…' : 'Regenerate as new version'}
              </button>
            </div>
            <ArticlePreview articleId={article.id} storagePath={article.outputHtmlStoragePath} />
          </div>
        </div>
      )}
    </div>
  );
}

function PanelBar({ label }: { label: string }) {
  return (
    <div className="panel__bar">
      <span className="panel__bar-label">{label}</span>
      <span className="panel__dots">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

/** Fetches the rendered HTML from Storage — it's never inlined into the Firestore doc (see D6/1MiB note). */
function ArticlePreview({ articleId, storagePath }: { articleId: string; storagePath: string | null }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function loadFresh() {
    if (!storagePath) return;
    const url = await getDownloadURL(ref(storage, storagePath));
    const res = await fetch(url, { cache: 'no-store' });
    return res.text();
  }

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    loadFresh()
      .then((text) => {
        if (!cancelled) setHtml(text ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the article.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath]);

  if (!storagePath) return <p className="muted">No output stored on this document yet.</p>;
  if (error) return <p className="field-error">{error}</p>;
  if (!html) return <p className="muted">Loading preview…</p>;

  function download() {
    const blob = new Blob([html ?? ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'article.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleEditFrameLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.body.contentEditable = 'true';
    // Some templates (the numbered-steps ones) start body copy at
    // opacity:0 and only reveal it via a scroll-triggered script — which
    // edit mode deliberately disables (see the sandbox comment above).
    // Add the same class that script would have added, directly, so
    // there's no invisible-but-editable text.
    doc.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('revealed'));
  }

  function cancelEdit() {
    setSaveError(null);
    setEditing(false);
  }

  async function saveEdit() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateArticleOutput(articleId, doc.body.innerHTML);
      const fresh = await loadFresh();
      setHtml(fresh ?? null);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your edits.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={download}>
          Download .html<span className="arrow">→</span>
        </button>
        {!editing && (
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            Edit before download
          </button>
        )}
        {editing && (
          <>
            <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
              {!saving && <span className="arrow">→</span>}
            </button>
            <button type="button" className="btn" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </>
        )}
      </div>
      {editing && (
        <p className="field-hint">
          Click into the text to edit it directly. Layout, images, and interactive bits (like the flip
          cards) aren't editable here.
        </p>
      )}
      {saveError && <p className="field-error">{saveError}</p>}
      <iframe
        key={editing ? 'edit' : 'view'}
        ref={iframeRef}
        title="Article preview"
        className={`preview-frame${editing ? ' preview-frame--editing' : ''}`}
        // Read-only preview: allow-scripts (no allow-same-origin) so the
        // article's own interactive bits (TOC scrollspy, flip cards) work
        // without granting it same-origin access to the app. Edit mode
        // flips this: allow-same-origin (no allow-scripts) so contentEditable
        // and reading the edited HTML back out are possible, at the cost of
        // disabling all scripts in the frame — including the ones that
        // reveal scroll-triggered content (see handleEditFrameLoad).
        sandbox={editing ? 'allow-same-origin' : 'allow-scripts'}
        srcDoc={html}
        onLoad={editing ? handleEditFrameLoad : undefined}
      />
    </div>
  );
}
