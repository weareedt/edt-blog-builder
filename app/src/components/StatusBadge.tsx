import type { ArticleStatus } from '../types/article';

const LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  generating: 'Generating…',
  ready: 'Ready',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>;
}
