import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { formatDateTime } from '../lib/format';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  images?: string[];
  created_at: string;
}

const DEFAULT_GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place//data=!4m3!3m2!1s0x128e4f5c91f0b36d:0x69fcaca4dcd6d35b!12e1?source=g.page.m.nr._&laa=nmx-review-solicitation-recommendation-card';
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ReviewsPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [submittedReview, setSubmittedReview] = useState<{ name: string; rating: number; comment: string } | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawUrl = settings?.google_maps_review_url || localStorage.getItem('mk_google_maps_review_url');
  const googleMapsUrl = !rawUrl || rawUrl.includes('maps.app.goo.gl') ? DEFAULT_GOOGLE_MAPS_URL : rawUrl;

  useEffect(() => {
    supabase
      .from('customer_reviews')
      .select('id, customer_name, rating, comment, images, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        setPhotoError(t('rev.photoTooBig'));
        return;
      }
    }

    const valid = files.filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS - selectedFiles.length);
    const updated = [...selectedFiles, ...valid].slice(0, MAX_PHOTOS);
    setSelectedFiles(updated);
    setFilePreviews(updated.map((f) => URL.createObjectURL(f)));

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    const nextFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(nextFiles);
    setFilePreviews(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  // Helper to compress image in browser if storage bucket is not writable directly
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  async function uploadPhoto(file: File): Promise<string> {
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      return data.publicUrl;
    }
    // Fallback: compress to high quality compact data url
    return compressImage(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setStatus('sending');

    try {
      const uploadedImages: string[] = [];
      for (const f of selectedFiles) {
        const url = await uploadPhoto(f);
        uploadedImages.push(url);
      }

      const { error } = await supabase
        .from('customer_reviews')
        .insert({
          customer_name: name.trim(),
          rating,
          comment: comment.trim(),
          images: uploadedImages,
        });

      if (!error) {
        setSubmittedReview({
          name: name.trim(),
          rating,
          comment: comment.trim(),
        });
        setStatus('done');
        setName('');
        setComment('');
        setSelectedFiles([]);
        setFilePreviews([]);
        setCopiedToClipboard(false);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="page page-narrow stack" style={{ gap: 20 }}>
      <h1>{t('rev.title')}</h1>
      <div className="stack">
        {reviews.length === 0 && <p className="muted">{t('rev.none')}</p>}
        {reviews.map((r) => (
          <article key={r.id} className="card card-pad stack" style={{ gap: 6 }}>
            <div className="row">
              <strong>{r.customer_name}</strong>
              <span className="stars" aria-label={`${r.rating}/5`}>
                {'★'.repeat(r.rating)}
              </span>
              <div className="spacer" />
              <span className="muted small num">{formatDateTime(r.created_at, locale)}</span>
            </div>
            {r.comment && <p>{r.comment}</p>}
            {r.images && r.images.length > 0 && (
              <div className="review-photos-grid">
                {r.images.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt=""
                    className="review-photo-thumb"
                    onClick={() => setLightboxImg(src)}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <form className="card card-pad stack" onSubmit={submit}>
        {status === 'done' && submittedReview ? (
          submittedReview.rating >= 4 ? (
            <div className="review-booster-card">
              <div className="review-booster-stars">
                {'★'.repeat(submittedReview.rating)}
              </div>
              <h3 className="review-booster-title">{t('rev.booster.title')}</h3>
              <p className="review-booster-desc">{t('rev.booster.desc')}</p>

              {submittedReview.comment && (
                <blockquote className="review-booster-quote">
                  "{submittedReview.comment}"
                </blockquote>
              )}

              {copiedToClipboard && (
                <div className="review-booster-copied-alert">
                  {t('rev.booster.copied')}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  className="review-booster-btn"
                  onClick={async () => {
                    const textToCopy = submittedReview.comment || 'مطعم رائع وأكل لذيذ جداً! أنصح به بشدة ⭐⭐⭐⭐⭐';
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      setCopiedToClipboard(true);
                    } catch {
                      // ignore clipboard
                    }
                    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  {t('rev.booster.btn')}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setStatus('idle');
                    setSubmittedReview(null);
                    setCopiedToClipboard(false);
                  }}
                >
                  {t('rev.booster.writeAnother')}
                </button>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ textAlign: 'center', padding: '16px 8px', gap: 12 }}>
              <div style={{ fontSize: '1.6rem' }}>🙏</div>
              <p style={{ fontWeight: 600, color: 'var(--black)' }}>
                {t('rev.booster.lowRatingThanks')}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'center', marginTop: 6 }}
                onClick={() => {
                  setStatus('idle');
                  setSubmittedReview(null);
                }}
              >
                {t('rev.booster.writeAnother')}
              </button>
            </div>
          )
        ) : (
          <>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('rev.write')}</h2>
            <label className="field">
              <span>{t('rev.name')}</span>
              <input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="field">
              <span>{t('rev.rating')}</span>
              <div className="star-input" role="radiogroup" aria-label={t('rev.rating')}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={n <= rating ? 'on' : ''}
                    onClick={() => setRating(n)}
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n}/5`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>{t('rev.comment')}</span>
              <textarea className="textarea" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>

            {/* Photo Attachment Section */}
            <div className="field">
              <span>{t('rev.addPhotos')}</span>
              <p className="muted small" style={{ margin: '2px 0 6px' }}>{t('rev.photosHint')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={status === 'sending' || selectedFiles.length >= MAX_PHOTOS}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ alignSelf: 'flex-start', border: '1px solid var(--line)' }}
                disabled={status === 'sending' || selectedFiles.length >= MAX_PHOTOS}
                onClick={() => fileInputRef.current?.click()}
              >
                📷 {t('rev.addPhotos')} ({selectedFiles.length}/{MAX_PHOTOS})
              </button>

              {photoError && <p className="alert alert-error" style={{ margin: '6px 0 0', padding: 6 }}>{photoError}</p>}

              {filePreviews.length > 0 && (
                <div className="review-upload-preview">
                  {filePreviews.map((src, i) => (
                    <div key={i} className="review-upload-item">
                      <img src={src} alt="" />
                      <button
                        type="button"
                        className="review-upload-remove"
                        onClick={() => removeFile(i)}
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {status === 'error' && <div className="alert alert-error">{t('common.error')}</div>}
            <button className="btn btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? t('common.saving') : t('rev.submit')}
            </button>
          </>
        )}
      </form>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="review-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="review-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImg} alt="Review attachment" />
            <button
              type="button"
              className="review-lightbox-close"
              onClick={() => setLightboxImg(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
