import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { useArticleList } from '../lib/useArticleList';
import { ArticleListItem } from '../components/ArticleListItem';

export function DashboardPage() {
  const { uid } = useAuth();
  const { articles, loading } = useArticleList(uid);

  return (
    <div className="page">
      <div className="page-header">
        <h1>EDT Blog Builder</h1>
        <Link to="/new" className="btn btn-primary">
          New article
        </Link>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <p>No articles yet.</p>
          <Link to="/new" className="btn btn-primary">
            Create your first article
          </Link>
        </div>
      )}

      <div className="article-list">
        {articles.map((article) => (
          <ArticleListItem key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
