import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { ArticleDoc } from '../types/article';

export function useArticle(articleId: string | undefined) {
  const [article, setArticle] = useState<ArticleDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'articles', articleId), (snap) => {
      setArticle(snap.exists() ? ({ id: snap.id, ...snap.data() } as ArticleDoc) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [articleId]);

  return { article, loading };
}
