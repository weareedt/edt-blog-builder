import { useState } from 'react';
import { UnsupportedImageError } from '../lib/downscaleImage';
import type { PendingImage } from '../lib/uploadImages';
import { resolveEmbedUrl } from '../lib/resolveEmbedUrl';
import { checkVideoFile, UnsupportedVideoError, type PendingVideo } from '../lib/uploadVideo';
import { TemplatePreviewFrame, type PreviewAnimation } from './TemplatePreviewFrame';
import {
  CATEGORY_IDS,
  GALLERY_CATALOG,
  TEMPLATE_CATALOG,
  type ArticleImage,
  type CategoryId,
  type GalleryCaptionMode,
  type GalleryIntro,
  type GalleryId,
  type GalleryPlacement,
  type TemplateId,
  type VideoPlacement,
} from '../types/article';

const NONE = 'none' as const;
const AUTO_PLACEMENT = 'auto' as const;

const CAPTION_MODE_LABELS: Record<GalleryCaptionMode, string> = {
  none: 'No captions — photos only',
  manual: 'I\u2019ll write the captions',
  auto: 'Let Claude write them from the photos',
};

const CAPTION_MODE_HINTS: Record<GalleryCaptionMode, string> = {
  none: 'Each photo fills its panel with no text over it.',
  manual:
    'Type a caption against each photo below. Leave one blank and that panel renders as photo only.',
  auto:
    'Claude sees each photo and captions what it actually shows. Costs one extra API call, and it can still guess wrong \u2014 check the captions before you publish.',
};

const VIDEO_PLACEMENT_LABELS: Record<VideoPlacement, string> = {
  auto: 'Let Claude pick the section it fits',
  'after-intro': 'After the intro',
  'before-closing': 'Before the closing',
};

const PLACEMENT_LABELS: Record<GalleryPlacement, string> = {
  'after-intro': 'After the intro',
  'mid-article': 'Between sections, where it fits',
  'before-cta': 'Before the closing CTA',
  'end-of-article': 'End of article',
};

const GALLERY_PREVIEW_PROPS: Record<
  GalleryId,
  { animation: PreviewAnimation; renderWidth?: number; renderHeight?: number }
> = {
  'gallery-accordion': { animation: 'accordion' },
  'gallery-flipcards-alternating': { animation: 'flip', renderWidth: 480, renderHeight: 330 },
};

/** One row in the combined photo list — either a new file not yet uploaded, or an already-uploaded image. */
interface ImageRow {
  id: string;
  note: string;
  caption: string;
  captionDetail: string;
  file: File | null;
  existing: ArticleImage | null;
}

export interface ArticleFormValues {
  brief: string;
  category: CategoryId;
  angle: string | null;
  keyPoints: string[];
  templateId: TemplateId;
  galleryId: GalleryId | null;
  galleryCaptionMode: GalleryCaptionMode | null;
  requestedGalleryPlacement: GalleryPlacement | null;
  pendingImages: PendingImage[];
  remainingExistingImages: ArticleImage[];
  video: PendingVideo | null;
  /** The id of the hero photo within pendingImages, if one was uploaded for a template with a hero slot. */
  heroImageId: string | null;
  galleryIntro: GalleryIntro | null;
}

export interface ArticleFormProps {
  initialBrief?: string;
  initialCategory?: CategoryId;
  initialAngle?: string | null;
  initialKeyPoints?: string[];
  initialTemplateId?: TemplateId;
  initialGalleryId?: GalleryId | null;
  initialCaptionMode?: GalleryCaptionMode | null;
  initialPlacement?: GalleryPlacement | null;
  existingImages?: ArticleImage[];
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: ArticleFormValues) => Promise<void>;
}

export function ArticleForm({
  initialBrief = '',
  initialCategory = 'Insights',
  initialAngle = null,
  initialKeyPoints = [],
  initialTemplateId = TEMPLATE_CATALOG[0].id,
  initialGalleryId = null,
  initialCaptionMode = null,
  initialPlacement = null,
  existingImages = [],
  submitLabel,
  submittingLabel,
  onSubmit,
}: ArticleFormProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  const [angle, setAngle] = useState(initialAngle ?? '');
  const [keyPointsText, setKeyPointsText] = useState(initialKeyPoints.join('\n'));
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplateId);
  const [galleryId, setGalleryId] = useState<GalleryId | typeof NONE>(initialGalleryId ?? NONE);
  const [placement, setPlacement] = useState<GalleryPlacement | typeof AUTO_PLACEMENT>(
    initialPlacement ?? AUTO_PLACEMENT
  );
  // Null until the user picks one, so the gallery's own default applies and
  // keeps applying if they switch galleries.
  const [captionMode, setCaptionMode] = useState<GalleryCaptionMode | null>(initialCaptionMode);
  const [imageRows, setImageRows] = useState<ImageRow[]>(
    existingImages.map((img) => ({
      id: img.id,
      note: img.userNote ?? '',
      caption: img.caption ?? '',
      captionDetail: img.captionDetail ?? '',
      file: null,
      existing: img,
    }))
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoKind, setVideoKind] = useState<'none' | 'embed' | 'upload'>('none');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoCaption, setVideoCaption] = useState('');
  const [videoPlacement, setVideoPlacement] = useState<VideoPlacement>('auto');
  // One id for the life of the form, so re-submitting after an error
  // overwrites the same Storage object instead of orphaning another.
  const [videoId] = useState(() => crypto.randomUUID());
  const [heroFile, setHeroFile] = useState<File | null>(null);
  // Stable for the life of the form, like videoId, so a retry overwrites the same upload.
  const [heroId] = useState(() => crypto.randomUUID());
  const [galleryHeading, setGalleryHeading] = useState('');
  const [galleryIntroLine, setGalleryIntroLine] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const template = TEMPLATE_CATALOG.find((t) => t.id === templateId)!;
  const gallery = galleryId === NONE ? null : GALLERY_CATALOG.find((g) => g.id === galleryId)!;

  // What's actually in force right now: the user's pick if this gallery
  // supports it, otherwise the gallery's default. Switching from the
  // accordion to the flip-cards therefore drops an unsupported 'none'
  // rather than silently rendering blank card backs.
  const effectiveCaptionMode: GalleryCaptionMode | null = gallery
    ? captionMode && gallery.supportedCaptionModes.includes(captionMode)
      ? captionMode
      : gallery.defaultCaptionMode
    : null;

  const imageCountValid = !gallery || (imageRows.length >= gallery.itemMin && imageRows.length <= gallery.itemMax);
  const embed = videoKind === 'embed' && videoUrl.trim() ? resolveEmbedUrl(videoUrl) : null;
  const videoFileProblem = videoKind === 'upload' && videoFile ? checkVideoFile(videoFile) : null;
  const videoValid =
    videoKind === 'none' ||
    (videoKind === 'embed' && embed !== null) ||
    (videoKind === 'upload' && videoFile !== null && videoFileProblem === null);
  const canSubmit = brief.trim().length > 0 && imageCountValid && videoValid && !submitting;

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setImageError(null);
    const additions: ImageRow[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      existing: null,
      note: '',
      caption: '',
      captionDetail: '',
    }));
    setImageRows((prev) => [...prev, ...additions]);
  }

  function onTemplateChange(id: TemplateId) {
    setTemplateId(id);
    const nextTemplate = TEMPLATE_CATALOG.find((t) => t.id === id)!;
    if (placement !== AUTO_PLACEMENT && !nextTemplate.supportedGalleryPlacements.includes(placement)) {
      setPlacement(AUTO_PLACEMENT);
    }
  }

  function removeImageRow(id: string) {
    setImageRows((prev) => prev.filter((r) => r.id !== id));
  }

  function setImageRowField(id: string, field: 'note' | 'caption' | 'captionDetail', value: string) {
    setImageRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setImageError(null);

    const pendingImages: PendingImage[] = imageRows
      .filter((r) => r.file)
      .map((r) => ({
        id: r.id,
        file: r.file!,
        userNote: r.note || null,
        caption: r.caption.trim() || null,
        captionDetail: r.captionDetail.trim() || null,
      }));
    // The hero rides in the same upload batch but is flagged separately, so
    // it's never counted as, or used as, a gallery photo.
    const heroImageId = template.hasHeroImage && heroFile ? heroId : null;
    if (heroImageId && heroFile) {
      pendingImages.unshift({ id: heroImageId, file: heroFile, userNote: null, caption: null, captionDetail: null });
    }
    const remainingExistingImages: ArticleImage[] = imageRows
      .filter((r) => r.existing)
      .map((r) => ({
        ...r.existing!,
        userNote: r.note || null,
        caption: r.caption.trim() || null,
        captionDetail: r.captionDetail.trim() || null,
      }));

    try {
      await onSubmit({
        brief: brief.trim(),
        category,
        angle: angle.trim() || null,
        keyPoints: keyPointsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        templateId,
        galleryId: galleryId === NONE ? null : galleryId,
        galleryCaptionMode: effectiveCaptionMode,
        requestedGalleryPlacement: placement === AUTO_PLACEMENT ? null : placement,
        pendingImages,
        remainingExistingImages,
        heroImageId,
        galleryIntro:
          gallery && galleryHeading.trim()
            ? { eyebrow: galleryHeading.trim(), line: galleryIntroLine.trim() || null }
            : null,
        video:
          videoKind === 'none'
            ? null
            : {
                id: videoId,
                caption: videoCaption.trim() || null,
                placement: videoPlacement,
                ...(videoKind === 'embed'
                  ? { kind: 'embed' as const, url: videoUrl }
                  : { kind: 'upload' as const, file: videoFile! }),
              },
      });
    } catch (err) {
      if (err instanceof UnsupportedImageError) {
        setImageError(err.message);
      } else if (err instanceof UnsupportedVideoError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="brief-form" onSubmit={handleSubmit}>
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
              <TemplatePreviewFrame previewUrl={`/template-previews/${t.id}.html`} label={t.label} />
              <div className="template-card__copy">
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
        <div className="template-card-list template-card-list--galleries">
          <label className={`template-card${galleryId === NONE ? ' template-card--selected' : ''}`}>
            <input
              type="radio"
              name="gallery"
              checked={galleryId === NONE}
              onChange={() => setGalleryId(NONE)}
            />
            <div className="preview-frame-shell preview-frame-shell--empty">
              <div className="preview-frame-shell__bar">
                <span className="preview-frame-shell__bar-label">None</span>
                <span className="preview-frame-shell__dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
              <div className="preview-frame-shell__empty">No gallery</div>
            </div>
            <div className="template-card__copy">
              <div className="template-card__label">None</div>
              <div className="template-card__blurb">Photos appear inline in the article body only.</div>
            </div>
          </label>
          {GALLERY_CATALOG.map((g) => {
            const preview = GALLERY_PREVIEW_PROPS[g.id];
            return (
              <label
                key={g.id}
                className={`template-card${galleryId === g.id ? ' template-card--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="gallery"
                  checked={galleryId === g.id}
                  onChange={() => setGalleryId(g.id)}
                />
                <TemplatePreviewFrame
                  previewUrl={`/template-previews/${g.id}.html`}
                  label={g.label}
                  frameWidth={220}
                  renderWidth={preview.renderWidth}
                  renderHeight={preview.renderHeight}
                  animation={preview.animation}
                />
                <div className="template-card__copy">
                  <div className="template-card__label">{g.label}</div>
                  <div className="template-card__blurb">{g.blurb}</div>
                </div>
              </label>
            );
          })}
        </div>

        {gallery && (
          <>
            <label className="field" style={{ marginTop: 12 }}>
              <span>Gallery captions</span>
              <select
                value={effectiveCaptionMode ?? gallery.defaultCaptionMode}
                onChange={(e) => setCaptionMode(e.target.value as GalleryCaptionMode)}
              >
                {gallery.supportedCaptionModes.map((m) => (
                  <option key={m} value={m}>
                    {CAPTION_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {CAPTION_MODE_HINTS[effectiveCaptionMode ?? gallery.defaultCaptionMode]}
              </span>
            </label>

            <label className="field" style={{ marginTop: 12 }}>
              <span>Gallery heading (optional)</span>
              <input
                type="text"
                value={galleryHeading}
                maxLength={40}
                onChange={(e) => setGalleryHeading(e.target.value)}
                placeholder="e.g. The work, up close"
              />
              {galleryHeading.trim() && (
                <input
                  type="text"
                  value={galleryIntroLine}
                  maxLength={180}
                  onChange={(e) => setGalleryIntroLine(e.target.value)}
                  placeholder="One line on what the reader is about to see (optional)"
                />
              )}
              <span className="field-hint">
                {effectiveCaptionMode === 'auto'
                  ? 'Leave blank and Claude writes one if the gallery needs an introduction.'
                  : 'Leave blank for no heading — the gallery follows straight on from the text.'}
              </span>
            </label>

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
              {imageRows.length}.
              {!imageCountValid && imageRows.length < gallery.itemMin && (
                <strong> Add at least {gallery.itemMin - imageRows.length} more.</strong>
              )}
              {!imageCountValid && imageRows.length > gallery.itemMax && (
                <strong> Remove {imageRows.length - gallery.itemMax} to fit the limit.</strong>
              )}
            </p>
          </>
        )}

        {!gallery && (
          <p className="field-hint">
            {template.label} — {template.structureRangeLabel}. {template.imagesNote} You've
            uploaded {imageRows.length}
            {template.maxImages > 0 ? ` (up to ${template.maxImages} used inline)` : ''}.
          </p>
        )}
      </fieldset>

      {template.hasHeroImage && (
        <fieldset className="field">
          <legend>Hero photo (optional)</legend>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setHeroFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {heroFile && (
            <p className="field-hint">
              {heroFile.name}{' '}
              <button type="button" className="btn-ghost" onClick={() => setHeroFile(null)}>
                Remove
              </button>
            </p>
          )}
          <span className="field-hint">
            Shown large at the top of the article, and never reused in the gallery. Leave it empty and the article
            has no hero image — no placeholder, and no photo borrowed from the ones below.
          </span>
        </fieldset>
      )}

      <fieldset className="field">
        <legend>{template.hasHeroImage ? 'Other photos' : 'Photos'}</legend>
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

        {imageRows.length > 0 && (
          <ul className="pending-image-list">
            {imageRows.map((r, index) => (
              <li key={r.id} className="pending-image-list__item">
                <div className="pending-image-list__row">
                  <span className="pending-image-list__name">
                    {r.file ? r.file.name : 'Uploaded photo'}
                  </span>
                  <input
                    type="text"
                    placeholder="Optional note for this photo"
                    value={r.note}
                    onChange={(e) => setImageRowField(r.id, 'note', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeImageRow(r.id)}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>

                {/* Only in 'manual' — in the other modes these fields would
                    accept text that never renders anywhere. */}
                {effectiveCaptionMode === 'manual' && gallery && index < gallery.itemMax && (
                  <div className="pending-image-list__captions">
                    <input
                      type="text"
                      placeholder={
                        gallery.id === 'gallery-flipcards-alternating'
                          ? 'Card label (shown on the front)'
                          : 'Caption (shown over the photo)'
                      }
                      value={r.caption}
                      onChange={(e) => setImageRowField(r.id, 'caption', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={
                        gallery.id === 'gallery-flipcards-alternating'
                          ? 'Description (shown on the back)'
                          : 'Second line (optional)'
                      }
                      value={r.captionDetail}
                      onChange={(e) => setImageRowField(r.id, 'captionDetail', e.target.value)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>Video (optional)</legend>
        <div className="video-kind-row" role="radiogroup" aria-label="Video source">
          {(
            [
              ['none', 'No video'],
              ['embed', 'YouTube / Vimeo link'],
              ['upload', 'Upload a file'],
            ] as const
          ).map(([kind, label]) => (
            <label key={kind} className={`video-kind${videoKind === kind ? ' video-kind--selected' : ''}`}>
              <input
                type="radio"
                name="video-kind"
                checked={videoKind === kind}
                onChange={() => setVideoKind(kind)}
              />
              {label}
            </label>
          ))}
        </div>

        {videoKind === 'embed' && (
          <label className="field">
            <span>Video link</span>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
            />
            {videoUrl.trim() && !embed && (
              <span className="field-error">
                That doesn't look like a YouTube or Vimeo video link.
              </span>
            )}
            {embed && (
              <span className="field-hint">
                {embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video found. It plays inside the
                article from {embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}, so the .html stays small.
              </span>
            )}
          </label>
        )}

        {videoKind === 'upload' && (
          <label className="field">
            <span>Video file</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            {videoFileProblem && <span className="field-error">{videoFileProblem}</span>}
            <span className="field-hint">
              MP4, WebM or MOV, up to 200MB. The file isn't packed into the .html — the article links to
              it in Firebase Storage, so it only plays while that project's Storage is live.
            </span>
          </label>
        )}

        {videoKind !== 'none' && (
          <>
            <label className="field">
              <span>Caption (optional)</span>
              <input
                type="text"
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                placeholder="What the video shows"
              />
              <span className="field-hint">
                Claude can't watch the video — if you let it choose the placement, this caption is what it
                matches against the article's sections.
              </span>
            </label>
            <label className="field">
              <span>Placement</span>
              <select
                value={videoPlacement}
                onChange={(e) => setVideoPlacement(e.target.value as VideoPlacement)}
              >
                {(Object.keys(VIDEO_PLACEMENT_LABELS) as VideoPlacement[]).map((p) => (
                  <option key={p} value={p}>
                    {VIDEO_PLACEMENT_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </fieldset>

      {submitError && <p className="field-error">{submitError}</p>}

      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
        {submitting ? submittingLabel : submitLabel}
        {!submitting && <span className="arrow">→</span>}
      </button>
    </form>
  );
}
