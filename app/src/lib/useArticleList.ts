import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { ArticleDoc } from '../types/article';

/** Matches the composite index declared in firestore.indexes.json (createdBy asc, createdAt desc). */
export function useArticleList(uid: string) {
  const [articles, setArticles] = useState<ArticleDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ArticleDoc));
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { articles, loading };
}
