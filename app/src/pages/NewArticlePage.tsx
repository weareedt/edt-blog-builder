import { collection, doc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { db } from '../lib/firebase';
import { createArticleDoc } from '../lib/createArticleDoc';
import { UnsupportedImageError } from '../lib/downscaleImage';
import { uploadPendingImages, type PendingImage } from '../lib/uploadImages';
import {
  CATEGORY_IDS,
  GALLERY_CATALOG,
  TEMPLATE_CATALOG,
  type CategoryId,
  type GalleryId,
  type GalleryPlacement,
  type TemplateId,
} from '../types/article';

const NONE = 'none' as const;
const AUTO_PLACEMENT = 'auto' as const;

const PLACEMENT_LABELS: Record<GalleryPlacement, string> = {
  'after-intro': 'After the intro',
  'mid-article': 'Mid-article',
  'before-cta': 'Before the closing CTA',
  'end-of-article': 'End of article',
};

export function NewArticlePage() {
  const { uid } = useAuth();
  const navigate = useNavigate();

  const [brief, setBrief] = useState('');
  const [category, setCategory] = useState<CategoryId>('Insights');
  const [angle, setAngle] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>(TEMPLATE_CATALOG[0].id);
  const [galleryId, setGalleryId] = useState<GalleryId | typeof NONE>(NONE);
  const [placement, setPlacement] = useState<GalleryPlacement | typeof AUTO_PLACEMENT>(
    AUTO_PLACEMENT
  );
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const template = TEMPLATE_CATALOG.find((t) => t.id === templateId)!;
  const gallery = galleryId === NONE ? null : GALLERY_CATALOG.find((g) => g.id === galleryId)!;

  const imageCountValid = !gallery || (pendingImages.length >= gallery.itemMin && pendingImages.length <= gallery.itemMax);
  const canSubmit = brief.trim().length > 0 && imageCountValid && !submitting;

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setImageError(null);
    const additions: PendingImage[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      userNote: null,
    }));
    setPendingImages((prev) => [...prev, ...additions]);
  }

  function onTemplateChange(id: TemplateId) {
    setTemplateId(id);
    const nextTemplate = TEMPLATE_CATALOG.find((t) => t.id === id)!;
    if (placement !== AUTO_PLACEMENT && !nextTemplate.supportedGalleryPlacements.includes(placement)) {
      setPlacement(AUTO_PLACEMENT);
    }
  }

  function removeImage(id: string) {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }

  function setImageNote(id: string, note: string) {
    setPendingImages((prev) => prev.map((p) => (p.id === id ? { ...p, userNote: note || null } : p)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const articleId = doc(collection(db, 'articles')).id;

      let images;
      try {
        images = await uploadPendingImages(uid, articleId, pendingImages);
      } catch (err) {
        if (err instanceof UnsupportedImageError) {
          setImageError(err.message);
          setSubmitting(false);
          return;
        }
        throw err;
      }

      const keyPoints = keyPointsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await createArticleDoc({
        articleId,
        uid,
        brief: brief.trim(),
        category,
        angle: angle.trim() || null,
        keyPoints,
        templateId,
        galleryId: galleryId === NONE ? null : galleryId,
        requestedGalleryPlacement: placement === AUTO_PLACEMENT ? null : placement,
        images,
      });

      navigate(`/article/${articleId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>New article</h1>
      </div>

      <form className="brief-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Topic / brief</span>
          <textarea
            required
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="What's this article about? Include any key points, facts, or angle you want covered."
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="field-hint">Byline author is always "The EDT Team".</span>
        </label>

        <label className="field">
          <span>Audience / angle (optional)</span>
          <input type="text" value={angle} onChange={(e) => setAngle(e.target.value)} />
        </label>

        <label className="field">
          <span>Key points (optional, one per line)</span>
          <textarea rows={3} value={keyPointsText} onChange={(e) => setKeyPointsText(e.target.value)} />
        </label>

        <fieldset className="field">
          <legend>Template</legend>
          <div className="template-card-list">
            {TEMPLATE_CATALOG.map((t) => (
              <label
                key={t.id}
                className={`template-card${templateId === t.id ? ' template-card--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={templateId === t.id}
                  onChange={() => onTemplateChange(t.id)}
                />
                <div>
                  <div className="template-card__label">{t.label}</div>
                  <div className="template-card__blurb">{t.blurb}</div>
                  <div className="template-card__range">{t.structureRangeLabel}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Gallery component</legend>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name="gallery"
                checked={galleryId === NONE}
                onChange={() => setGalleryId(NONE)}
              />
              None
            </label>
            {GALLERY_CATALOG.map((g) => (
              <label key={g.id}>
                <input
                  type="radio"
                  name="gallery"
                  checked={galleryId === g.id}
                  onChange={() => setGalleryId(g.id)}
                />
                {g.label}
              </label>
            ))}
          </div>

          {gallery && (
            <>
              <label className="field" style={{ marginTop: 12 }}>
                <span>Gallery placement</span>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as GalleryPlacement | typeof AUTO_PLACEMENT)}
                >
                  <option value={AUTO_PLACEMENT}>Let Claude decide</option>
                  {template.supportedGalleryPlacements.map((p) => (
                    <option key={p} value={p}>
                      {PLACEMENT_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>

              <p className="field-hint">
                {gallery.label} needs {gallery.itemMin} to {gallery.itemMax} photos. You've added{' '}
                {pendingImages.length}.
                {!imageCountValid && pendingImages.length < gallery.itemMin && (
                  <strong> Add at least {gallery.itemMin - pendingImages.length} more.</strong>
                )}
                {!imageCountValid && pendingImages.length > gallery.itemMax && (
                  <strong> Remove {pendingImages.length - gallery.itemMax} to fit the limit.</strong>
                )}
              </p>
            </>
          )}

          {!gallery && (
            <p className="field-hint">
              {template.label} — {template.structureRangeLabel}. {template.imagesNote} You've
              uploaded {pendingImages.length}
              {template.maxImages > 0 ? ` (up to ${template.maxImages} used inline)` : ''}.
            </p>
          )}
        </fieldset>

        <fieldset className="field">
          <legend>Images</legend>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              onFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />
          {imageError && <p className="field-error">{imageError}</p>}

          {pendingImages.length > 0 && (
            <ul className="pending-image-list">
              {pendingImages.map((p) => (
                <li key={p.id} className="pending-image-list__item">
                  <span className="pending-image-list__name">{p.file.name}</span>
                  <input
                    type="text"
                    placeholder="Optional note for this photo"
                    value={p.userNote ?? ''}
                    onChange={(e) => setImageNote(p.id, e.target.value)}
                  />
                  <button type="button" onClick={() => removeImage(p.id)} aria-label={`Remove ${p.file.name}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {submitError && <p className="field-error">{submitError}</p>}

        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? 'Creating…' : 'Create article'}
        </button>
      </form>
    </div>
  );
}
