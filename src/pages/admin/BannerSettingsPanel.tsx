import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { refreshSettings, useSettings } from '../../lib/settings';
import { useI18n } from '../../lib/i18n';
import { safeFileName, amError } from './menu/shared';

const BUCKET = 'product-images';
const MAX_BANNERS = 5;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_HERO_LOGO = '/brand/logo@banner.png';

export default function BannerSettingsPanel() {
  const { t } = useI18n();
  const currentSettings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const heroLogoFileRef = useRef<HTMLInputElement>(null);

  const [banners, setBanners] = useState<string[]>([]);
  const [heroLogo, setHeroLogo] = useState('');
  const [taglineAr, setTaglineAr] = useState('');
  const [taglineFr, setTaglineFr] = useState('');
  const [taglineEn, setTaglineEn] = useState('');
  const [statusAr, setStatusAr] = useState('');
  const [statusFr, setStatusFr] = useState('');
  const [statusEn, setStatusEn] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.banner_images) setBanners(currentSettings.banner_images);
      const savedHeroLogo = currentSettings.hero_logo_url !== undefined && currentSettings.hero_logo_url !== null
        ? currentSettings.hero_logo_url
        : (localStorage.getItem('mk_hero_logo_url') || '');
      setHeroLogo(savedHeroLogo);
      setTaglineAr(currentSettings.hero_tagline_ar || localStorage.getItem('mk_hero_tagline_ar') || '');
      setTaglineFr(currentSettings.hero_tagline_fr || localStorage.getItem('mk_hero_tagline_fr') || '');
      setTaglineEn(currentSettings.hero_tagline_en || localStorage.getItem('mk_hero_tagline_en') || '');
      setStatusAr(currentSettings.hero_status_override_ar || localStorage.getItem('mk_hero_status_override_ar') || '');
      setStatusFr(currentSettings.hero_status_override_fr || localStorage.getItem('mk_hero_status_override_fr') || '');
      setStatusEn(currentSettings.hero_status_override_en || localStorage.getItem('mk_hero_status_override_en') || '');
    } else {
      const local = localStorage.getItem('mk_banner_images');
      if (local) {
        try {
          setBanners(JSON.parse(local));
        } catch {
          // ignore
        }
      }
      setHeroLogo(localStorage.getItem('mk_hero_logo_url') || '');
      setTaglineAr(localStorage.getItem('mk_hero_tagline_ar') || '');
      setTaglineFr(localStorage.getItem('mk_hero_tagline_fr') || '');
      setTaglineEn(localStorage.getItem('mk_hero_tagline_en') || '');
      setStatusAr(localStorage.getItem('mk_hero_status_override_ar') || '');
      setStatusFr(localStorage.getItem('mk_hero_status_override_fr') || '');
      setStatusEn(localStorage.getItem('mk_hero_status_override_en') || '');
    }
  }, [currentSettings]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (banners.length >= MAX_BANNERS) {
      setMsg({ kind: 'error', text: t('am.set.banners.maxReached') });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMsg({ kind: 'error', text: t('am.img.notImage') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg({ kind: 'error', text: t('am.img.tooBig') });
      return;
    }

    setBusy(true);
    setMsg(null);

    const path = `banners/${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });

    if (upErr) {
      setMsg({ kind: 'error', text: amError(upErr, t) });
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const newBanners = [...banners, data.publicUrl].slice(0, MAX_BANNERS);
    setBanners(newBanners);
    setBusy(false);

    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUploadHeroLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({ kind: 'error', text: t('am.img.notImage') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg({ kind: 'error', text: t('am.img.tooBig') });
      return;
    }

    setBusy(true);
    setMsg(null);

    const path = `branding/hero-logo-${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) {
      const reader = new FileReader();
      reader.onload = () => {
        setHeroLogo(reader.result as string);
        setBusy(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setHeroLogo(data.publicUrl);
    setBusy(false);
    if (heroLogoFileRef.current) heroLogoFileRef.current.value = '';
  };

  const handleAddUrl = () => {
    const v = urlInput.trim();
    if (!v || !/^(https?:\/\/|\/)\S+$/i.test(v)) {
      setMsg({ kind: 'error', text: t('am.img.badUrl') });
      return;
    }
    if (banners.length >= MAX_BANNERS) {
      setMsg({ kind: 'error', text: t('am.set.banners.maxReached') });
      return;
    }
    setBanners((prev) => [...prev, v].slice(0, MAX_BANNERS));
    setUrlInput('');
    setMsg(null);
  };

  const handleRemove = (index: number) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
    setMsg(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= banners.length) return;
    setBanners((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
    setMsg(null);
  };

  const handleSave = async () => {
    setBusy(true);
    setMsg(null);

    const payload = {
      banner_images: banners,
      hero_logo_url: heroLogo.trim(),
      hero_tagline_ar: taglineAr.trim(),
      hero_tagline_fr: taglineFr.trim(),
      hero_tagline_en: taglineEn.trim(),
      hero_status_override_ar: statusAr.trim(),
      hero_status_override_fr: statusFr.trim(),
      hero_status_override_en: statusEn.trim(),
    };

    // Save to database
    const { error } = await supabase
      .from('restaurant_settings')
      .update(payload)
      .eq('id', 1);

    // Also persist to localStorage for instant local preview
    localStorage.setItem('mk_banner_images', JSON.stringify(banners));
    localStorage.setItem('mk_hero_logo_url', heroLogo.trim());
    localStorage.setItem('mk_hero_tagline_ar', taglineAr.trim());
    localStorage.setItem('mk_hero_tagline_fr', taglineFr.trim());
    localStorage.setItem('mk_hero_tagline_en', taglineEn.trim());
    localStorage.setItem('mk_hero_status_override_ar', statusAr.trim());
    localStorage.setItem('mk_hero_status_override_fr', statusFr.trim());
    localStorage.setItem('mk_hero_status_override_en', statusEn.trim());

    if (error && (error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      // Try saving at least banner_images if that column exists
      const retry = await supabase.from('restaurant_settings').update({ banner_images: banners }).eq('id', 1);
      if (!retry.error) {
        setMsg({ kind: 'saved', text: `${t('am.set.banners.saved')} (تم الحفظ في المتصفح - يرجى تشغيل كود SQL في Supabase للحفظ الدائم)` });
      } else {
        setMsg({ kind: 'saved', text: `${t('am.set.banners.saved')} (تم الحفظ محلياً في المتصفح بنجاح)` });
      }
    } else if (error) {
      setMsg({
        kind: 'error',
        text: `${amError(error, t)} (تم الحفظ محلياً في المتصفح مؤقتاً لحين تشغيل كود SQL في Supabase)`,
      });
    } else {
      setMsg({ kind: 'saved', text: t('am.set.banners.saved') });
    }

    await refreshSettings();
    setBusy(false);
  };

  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row wrap" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t('am.set.banners.title')}</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {t('am.set.banners.desc')} ({banners.length}/{MAX_BANNERS})
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy}
          onClick={handleSave}
        >
          {busy ? t('common.loading') : t('am.set.banners.saveBtn')}
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.kind === 'saved' ? 'alert-success' : 'alert-error'}`}>
          {msg.text}
        </div>
      )}

      {/* Upload & Add URL controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row wrap" style={{ gap: 10, alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={busy || banners.length >= MAX_BANNERS}
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || banners.length >= MAX_BANNERS}
            onClick={() => fileRef.current?.click()}
          >
            📁 {t('am.set.banners.upload')}
          </button>
          <span className="muted small">
            {banners.length >= MAX_BANNERS ? t('am.set.banners.maxReached') : `(PNG, JPG, WEBP — الحد الأقصى 5MB)`}
          </span>
        </div>

        <div className="am-url-row" style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="url"
            placeholder={t('am.set.banners.urlPh')}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={busy || banners.length >= MAX_BANNERS}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || !urlInput.trim() || banners.length >= MAX_BANNERS}
            onClick={handleAddUrl}
          >
            + {t('am.set.banners.addUrl')}
          </button>
        </div>
      </div>

      {/* Banner Cards Grid */}
      {banners.length === 0 ? (
        <p className="muted small" style={{ fontStyle: 'italic', padding: '12px 0' }}>
          {t('am.set.banners.empty')}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {banners.map((imgUrl, idx) => (
            <div
              key={idx}
              className="am-card"
              style={{
                padding: 10,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'var(--white)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  background: '#141414',
                }}
              >
                <img
                  src={imgUrl}
                  alt={`Banner ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    insetInlineStart: 6,
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  #{idx + 1}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={idx === 0 || busy}
                    onClick={() => handleMove(idx, 'up')}
                    title="تحريك لأول الترتيب"
                    style={{ padding: '2px 8px', minHeight: 28 }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={idx === banners.length - 1 || busy}
                    onClick={() => handleMove(idx, 'down')}
                    title="تحريك لآخر الترتيب"
                    style={{ padding: '2px 8px', minHeight: 28 }}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-red"
                  disabled={busy}
                  onClick={() => handleRemove(idx)}
                  title={t('am.delete')}
                  style={{ padding: '2px 8px', minHeight: 28 }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner Overlay Elements (Logo, Tagline, Schedule/Status) */}
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 1px 4px rgba(27, 27, 27, 0.03)',
          marginTop: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>{t('am.set.heroLogo.title')}</h3>
            <p className="muted small" style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>{t('am.set.heroLogo.hint')}</p>
          </div>
        </div>

        {/* Compact Hero Logo Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Dark sleek preview matching the hero banner */}
          <div
            style={{
              width: 120,
              height: 48,
              borderRadius: '6px',
              background: '#1a1815',
              border: heroLogo === 'none' ? '1px dashed #e74c3c' : '1px solid rgba(212, 175, 55, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            {heroLogo === 'none' ? (
              <span style={{ fontSize: '0.74rem', color: '#e74c3c', fontWeight: 700 }}>
                🚫 {t('am.set.heroLogo.removedBadge')}
              </span>
            ) : (
              <img
                src={heroLogo || DEFAULT_HERO_LOGO}
                alt="Hero Logo"
                style={{ maxHeight: '38px', maxWidth: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_HERO_LOGO;
                }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                ref={heroLogoFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleUploadHeroLogo}
              />
              <button
                type="button"
                className="btn btn-sm"
                style={{ padding: '3px 10px', fontSize: '0.8rem', minHeight: 28 }}
                disabled={busy}
                onClick={() => heroLogoFileRef.current?.click()}
              >
                📁 {t('am.set.branding.upload')}
              </button>

              {heroLogo !== 'none' ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-red"
                  style={{ padding: '3px 10px', fontSize: '0.8rem', minHeight: 28, color: '#e74c3c', borderColor: '#e74c3c' }}
                  disabled={busy}
                  onClick={() => setHeroLogo('none')}
                  title="إزالة الشعار كلياً من فوق البنر"
                >
                  🚫 {t('am.set.heroLogo.removeBtn')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ padding: '3px 10px', fontSize: '0.8rem', minHeight: 28 }}
                  disabled={busy}
                  onClick={() => setHeroLogo('')}
                  title="استعادة الشعار الافتراضي"
                >
                  ↺ {t('am.set.heroLogo.restoreBtn')}
                </button>
              )}

              {heroLogo && heroLogo !== 'none' && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: 28 }}
                  onClick={() => setHeroLogo('')}
                  title={t('am.set.branding.reset')}
                >
                  ↺
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <input
                className="input input-sm"
                type="text"
                dir="ltr"
                placeholder={DEFAULT_HERO_LOGO}
                value={heroLogo}
                onChange={(e) => setHeroLogo(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px', height: '30px' }}
              />
              {heroLogo === 'none' && (
                <span className="small" style={{ color: '#e74c3c', fontSize: '0.74rem', fontWeight: 600 }}>
                  ✓ تم إلغاء الشعار كلياً (لن يظهر أي شعار فوق البنر عند الحفظ).
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tagline under Logo ("مطعم و فاست فود") */}
        <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <strong style={{ fontSize: '0.88rem' }}>{t('am.set.heroTagline.title')}</strong>
          <p className="muted small" style={{ margin: 0, fontSize: '0.78rem' }}>{t('am.set.heroTagline.hint')}</p>
          <div className="am-form-grid">
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.ar')}</span>
              <input
                className="input input-sm"
                dir="rtl"
                placeholder="مطعم و فاست فود"
                value={taglineAr}
                onChange={(e) => setTaglineAr(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.fr')}</span>
              <input
                className="input input-sm"
                dir="ltr"
                placeholder="Restaurant & Fast-Food"
                value={taglineFr}
                onChange={(e) => setTaglineFr(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.en')}</span>
              <input
                className="input input-sm"
                dir="ltr"
                placeholder="Restaurant & Fast-Food"
                value={taglineEn}
                onChange={(e) => setTaglineEn(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Status / Schedule Text ("مفتوح الآن · يغلق عند منتصف الليل") */}
        <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <strong style={{ fontSize: '0.88rem' }}>{t('am.set.heroStatus.title')}</strong>
          <p className="muted small" style={{ margin: 0, fontSize: '0.78rem' }}>{t('am.set.heroStatus.hint')}</p>
          <div className="am-form-grid">
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.ar')}</span>
              <input
                className="input input-sm"
                dir="rtl"
                placeholder="مفتوح الآن · يغلق عند منتصف الليل"
                value={statusAr}
                onChange={(e) => setStatusAr(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.fr')}</span>
              <input
                className="input input-sm"
                dir="ltr"
                placeholder="Ouvert · Ferme à minuit"
                value={statusFr}
                onChange={(e) => setStatusFr(e.target.value)}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="muted small">{t('am.lang.en')}</span>
              <input
                className="input input-sm"
                dir="ltr"
                placeholder="Open now · Closes at midnight"
                value={statusEn}
                onChange={(e) => setStatusEn(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
