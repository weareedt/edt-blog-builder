import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { functions, storage } from '../lib/firebase';
import { useArticle } from '../lib/useArticle';
import { useRegeneratedVersions } from '../lib/useRegeneratedVersions';
import { regenerateArticle } from '../lib/regenerateArticle';
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
            <ArticlePreview storagePath={article.outputHtmlStoragePath} />
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
function ArticlePreview({ storagePath }: { storagePath: string | null }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await getDownloadURL(ref(storage, storagePath));
        const res = await fetch(url);
        const text = await res.text();
        if (!cancelled) setHtml(text);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the article.');
      }
    })();
    return () => {
      cancelled = true;
    };
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

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={download}>
        Download .html<span className="arrow">→</span>
      </button>
      <iframe title="Article preview" className="preview-frame" sandbox="allow-scripts" srcDoc={html} />
    </div>
  );
}
