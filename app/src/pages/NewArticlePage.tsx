import { collection, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { db } from '../lib/firebase';
import { createArticleDoc } from '../lib/createArticleDoc';
import { uploadPendingImages } from '../lib/uploadImages';
import { ArticleForm, type ArticleFormValues } from '../components/ArticleForm';

export function NewArticlePage() {
  const { uid } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values: ArticleFormValues) {
    const articleId = doc(collection(db, 'articles')).id;
    const images = await uploadPendingImages(uid, articleId, values.pendingImages);

    await createArticleDoc({
      articleId,
      uid,
      brief: values.brief,
      category: values.category,
      angle: values.angle,
      keyPoints: values.keyPoints,
      templateId: values.templateId,
      galleryId: values.galleryId,
      requestedGalleryPlacement: values.requestedGalleryPlacement,
      images,
    });

    navigate(`/article/${articleId}`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>New article</h1>
      </div>
      <ArticleForm submitLabel="Create article" submittingLabel="Creating…" onSubmit={onSubmit} />
    </div>
  );
}
