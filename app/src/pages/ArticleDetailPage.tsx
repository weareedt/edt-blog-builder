import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { functions, storage } from '../lib/firebase';
import { useArticle } from '../lib/useArticle';
import { StatusBadge } from '../components/StatusBadge';

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { article, loading } = useArticle(articleId);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

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

  if (loading) return <div className="page">Loading…</div>;
  if (!article) return <div className="page">Article not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{article.title ?? article.brief.slice(0, 60)}</h1>
        <StatusBadge status={article.status} />
      </div>

      {article.status === 'draft' && (
        <div className="panel">
          <p>This article hasn't been generated yet.</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={triggering}>
            {triggering ? 'Starting…' : 'Generate'}
          </button>
          {triggerError && <p className="field-error">{triggerError}</p>}
        </div>
      )}

      {article.status === 'generating' && (
        <div className="panel">
          <p>Generating your article — this can take a minute or two.</p>
        </div>
      )}

      {article.status === 'failed' && (
        <div className="panel panel--error">
          <p>Generation failed: {article.errorMessage ?? article.errorCode ?? 'Unknown error.'}</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={triggering}>
            {triggering ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {article.status === 'ready' && (
        <div className="panel">
          <p>Your article is ready.</p>
          <ArticlePreview storagePath={article.outputHtmlStoragePath} />
        </div>
      )}
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
        Download .html
      </button>
      <iframe title="Article preview" className="preview-frame" sandbox="allow-scripts" srcDoc={html} />
    </div>
  );
}
