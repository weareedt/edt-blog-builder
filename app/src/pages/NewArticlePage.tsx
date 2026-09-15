import { collection, doc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { db } from '../lib/firebase';
import { createArticleDoc } from '../lib/createArticleDoc';
import { uploadPendingImages } from '../lib/uploadImages';
import { resolvePendingVideo } from '../lib/uploadVideo';
import { ArticleForm, type ArticleFormValues } from '../components/ArticleForm';

export function NewArticlePage() {
  const { uid } = useAuth();
  const navigate = useNavigate();
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  async function onSubmit(values: ArticleFormValues) {
    const articleId = doc(collection(db, 'articles')).id;
    const images = await uploadPendingImages(uid, articleId, values.pendingImages);
    const videos = values.video
      ? [await resolvePendingVideo(uid, articleId, values.video, setVideoProgress)]
      : [];
    setVideoProgress(null);

    await createArticleDoc({
      articleId,
      uid,
      brief: values.brief,
      category: values.category,
      angle: values.angle,
      keyPoints: values.keyPoints,
      templateId: values.templateId,
      galleryId: values.galleryId,
      galleryCaptionMode: values.galleryCaptionMode,
      requestedGalleryPlacement: values.requestedGalleryPlacement,
      images,
      videos,
    });

    navigate(`/article/${articleId}`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>New article</h1>
      </div>
      <ArticleForm
        submitLabel="Create article"
        submittingLabel={
          videoProgress === null ? 'Creating…' : `Uploading video… ${Math.round(videoProgress * 100)}%`
        }
        onSubmit={onSubmit}
      />
    </div>
  );
}
