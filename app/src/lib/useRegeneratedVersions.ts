import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { ArticleDoc } from '../types/article';

/**
 * Articles regenerated FROM this one — the forward direction of lineage
 * (the backward direction is just `article.regeneratedFromArticleId`, a
 * plain doc reference). Both filters are plain equality, so this needs no
 * composite index beyond Firestore's automatic single-field ones.
 */
export function useRegeneratedVersions(uid: string, articleId: string | undefined) {
  const [versions, setVersions] = useState<ArticleDoc[]>([]);

  useEffect(() => {
    if (!articleId) {
      setVersions([]);
      return;
    }
    const q = query(
      collection(db, 'articles'),
      where('createdBy', '==', uid),
      where('regeneratedFromArticleId', '==', articleId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ArticleDoc));
    });
    return unsubscribe;
  }, [uid, articleId]);

  return versions;
}
