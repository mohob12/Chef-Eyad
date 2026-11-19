import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { formatDateTime } from '../../lib/format';
import { amError } from './menu/shared';
import './admin-manage.css';

const DEFAULT_GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place//data=!4m3!3m2!1s0x128e4f5c91f0b36d:0x69fcaca4dcd6d35b!12e1?source=g.page.m.nr._&laa=nmx-review-solicitation-recommendation-card';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  images?: string[];
  is_approved: boolean;
  created_at: string;
}

type Filter = 'all' | 'pending' | 'approved';

export default function ReviewsAdmin() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const rawUrl = settings?.google_maps_review_url || localStorage.getItem('mk_google_maps_review_url');
  const googleMapsUrl = !rawUrl || rawUrl.includes('maps.app.goo.gl') ? DEFAULT_GOOGLE_MAPS_URL : rawUrl;

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('customer_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(amError(err, t));
    else {
      setError('');
      setReviews(data as Review[]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => (reviews ?? []).filter((r) => !r.is_approved).length, [reviews]);
  const shown = useMemo(
    () =>
      (reviews ?? []).filter((r) => (filter === 'all' ? true : filter === 'pending' ? !r.is_approved : r.is_approved)),
    [reviews, filter],
  );

  async function toggle(r: Review) {
    setBusyId(r.id);
    const { error: err } = await supabase.from('customer_reviews').update({ is_approved: !r.is_approved }).eq('id', r.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  async function remove(r: Review) {
    if (!window.confirm(t('am.rev.confirmDelete'))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from('customer_reviews').delete().eq('id', r.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  return (
    <div className="am-page">
      <div className="am-head">
        <h1>{t('am.rev.title')}</h1>
        {pendingCount > 0 && <span className="badge badge-yellow">{t('am.rev.pendingCount', { n: pendingCount })}</span>}
      </div>

      <div className="am-seg">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-dark' : ''}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(`am.rev.filter.${f}`)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!reviews && !error && <div className="muted">{t('common.loading')}</div>}
      {reviews && shown.length === 0 && <div className="panel muted">{t('am.rev.empty')}</div>}

      <div className="am-list">
        {shown.map((r) => (
          <article className="panel am-item" key={r.id}>
            <div className="am-item-head">
              <strong>{r.customer_name}</strong>
              <span className="am-stars" aria-label={`${r.rating}/5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={i <= r.rating ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </span>
              <span className={`badge ${r.is_approved ? 'badge-dark' : 'badge-yellow'}`}>
                {r.is_approved ? t('am.rev.approved') : t('am.rev.pending')}
              </span>
              <span className="spacer" />
              <span className="muted small">{formatDateTime(r.created_at, locale)}</span>
            </div>
            {r.comment ? <p className="am-comment">{r.comment}</p> : <p className="muted">{t('am.rev.noComment')}</p>}

            {/* Review Photos Preview */}
            {r.images && r.images.length > 0 && (
              <div className="review-photos-grid" style={{ marginTop: 6, marginBottom: 8 }}>
                {r.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="review-photo-thumb"
                    style={{ width: 64, height: 64, cursor: 'pointer' }}
                    onClick={() => setLightboxImg(src)}
                    title="تكبير الصورة"
                  />
                ))}
              </div>
            )}

            <div className="row wrap" style={{ gap: 8 }}>
              <button
                className={`btn btn-sm ${r.is_approved ? '' : 'btn-primary'}`}
                disabled={busyId === r.id}
                onClick={() => toggle(r)}
              >
                {r.is_approved ? t('am.rev.unapprove') : t('am.rev.approve')}
              </button>

              {r.comment && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(r.comment);
                      setCopiedId(r.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    } catch {
                      // ignore
                    }
                  }}
                  title="نسخ نص التقييم"
                >
                  📋 {copiedId === r.id ? t('am.rev.textCopied') : t('am.rev.copyText')}
                </button>
              )}

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-ghost"
                title="فتح خرائط Google"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                📍 {t('am.rev.openGoogleMaps')}
              </a>

              <button className="btn btn-sm btn-outline-red" disabled={busyId === r.id} onClick={() => remove(r)}>
                {t('am.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>

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
