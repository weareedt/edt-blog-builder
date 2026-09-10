import { Link } from 'react-router-dom';
import type { ArticleDoc } from '../types/article';
import { StatusBadge } from './StatusBadge';

export function ArticleListItem({ article }: { article: ArticleDoc }) {
  const heading = article.title ?? (article.brief.slice(0, 70) || '(untitled draft)');

  return (
    <Link to={`/article/${article.id}`} className="article-list-item">
      <div className="article-list-item__main">
        <div className="article-list-item__title">{heading}</div>
        <div className="article-list-item__meta">
          {article.templateLabel} · {article.categoryLabel}
        </div>
      </div>
      <StatusBadge status={article.status} />
    </Link>
  );
}
