import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { refreshSettings, useSettings } from '../../lib/settings';
import { useI18n } from '../../lib/i18n';
import { safeFileName, amError } from './menu/shared';

const BUCKET = 'product-images';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const DEFAULT_SITE_LOGO = '/brand/logo.png';
const DEFAULT_FAVICON = '/favicon.png';

export default function BrandingSettingsPanel() {
  const { t } = useI18n();
  const currentSettings = useSettings();

  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  const [siteLogo, setSiteLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentSettings) {
      setSiteLogo(currentSettings.site_logo_url || localStorage.getItem('mk_site_logo_url') || '');
      setFavicon(currentSettings.favicon_url || localStorage.getItem('mk_favicon_url') || '');
    } else {
      setSiteLogo(localStorage.getItem('mk_site_logo_url') || '');
      setFavicon(localStorage.getItem('mk_favicon_url') || '');
    }
  }, [currentSettings]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const path = `branding/logo-${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) {
      // Fallback: read as base64 data url
      const reader = new FileReader();
      reader.onload = () => {
        setSiteLogo(reader.result as string);
        setBusy(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setSiteLogo(data.publicUrl);
    setBusy(false);
    if (logoFileRef.current) logoFileRef.current.value = '';
  };

  const handleUploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      setMsg({ kind: 'error', text: t('am.img.notImage') });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg({ kind: 'error', text: t('am.img.tooBig') });
      return;
    }

    setBusy(true);
    setMsg(null);
    const path = `branding/favicon-${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) {
      // Fallback: read as base64 data url
      const reader = new FileReader();
      reader.onload = () => {
        setFavicon(reader.result as string);
        setBusy(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setFavicon(data.publicUrl);
    setBusy(false);
    if (faviconFileRef.current) faviconFileRef.current.value = '';
  };

  const handleSave = async () => {
    setBusy(true);
    setMsg(null);

    // Save to database
    const { error } = await supabase
      .from('restaurant_settings')
      .update({
        site_logo_url: siteLogo.trim(),
        favicon_url: favicon.trim(),
      })
      .eq('id', 1);

    // Always persist to localStorage for instant client view
    localStorage.setItem('mk_site_logo_url', siteLogo.trim());
    localStorage.setItem('mk_favicon_url', favicon.trim());

    if (error && (error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      setMsg({ kind: 'saved', text: `${t('am.set.branding.saved')} (تم الحفظ في المتصفح - يرجى تطبيق كود SQL في Supabase للحفظ الدائم)` });
    } else if (error) {
      setMsg({
        kind: 'error',
        text: `${amError(error, t)} (تم الحفظ محلياً في المتصفح مؤقتاً لحين تشغيل كود SQL في Supabase)`,
      });
    } else {
      setMsg({ kind: 'saved', text: t('am.set.branding.saved') });
    }

    await refreshSettings();
    setBusy(false);
  };

  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row wrap" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t('am.set.branding.title')}</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {t('am.set.branding.desc')}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy}
          onClick={handleSave}
        >
          {busy ? t('common.loading') : t('am.set.branding.saveBtn')}
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.kind === 'error' ? 'alert-error' : 'alert-info'}`}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Main Site Logo Box */}
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 1px 4px rgba(27, 27, 27, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Small Logo Preview */}
            <div
              style={{
                width: 90,
                height: 44,
                borderRadius: '6px',
                background: 'var(--beige)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                flexShrink: 0,
              }}
            >
              <img
                src={siteLogo || DEFAULT_SITE_LOGO}
                alt="Logo"
                style={{ maxHeight: '36px', maxWidth: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_SITE_LOGO;
                }}
              />
            </div>

            {/* Label and Upload Buttons */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <strong style={{ fontSize: '0.88rem' }}>{t('am.set.branding.siteLogo')}</strong>
                {siteLogo && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto' }}
                    onClick={() => setSiteLogo('')}
                    title={t('am.set.branding.reset')}
                  >
                    ↺
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadLogo}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.8rem', minHeight: 28 }}
                  disabled={busy}
                  onClick={() => logoFileRef.current?.click()}
                >
                  📁 {t('am.set.branding.upload')}
                </button>
              </div>
            </div>
          </div>

          {/* Compact URL input */}
          <input
            className="input input-sm"
            type="text"
            dir="ltr"
            placeholder={DEFAULT_SITE_LOGO}
            value={siteLogo}
            onChange={(e) => setSiteLogo(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', height: '30px' }}
          />
        </div>

        {/* Browser Favicon Box */}
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 1px 4px rgba(27, 27, 27, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Small Favicon Preview */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '6px',
                background: 'var(--beige)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                flexShrink: 0,
              }}
            >
              <img
                src={favicon || DEFAULT_FAVICON}
                alt="Favicon"
                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_FAVICON;
                }}
              />
            </div>

            {/* Label and Upload Buttons */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <strong style={{ fontSize: '0.88rem' }}>{t('am.set.branding.favicon')}</strong>
                {favicon && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto' }}
                    onClick={() => setFavicon('')}
                    title={t('am.set.branding.reset')}
                  >
                    ↺
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleUploadFavicon}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.8rem', minHeight: 28 }}
                  disabled={busy}
                  onClick={() => faviconFileRef.current?.click()}
                >
                  📁 {t('am.set.branding.upload')}
                </button>
              </div>
            </div>
          </div>

          {/* Compact URL input */}
          <input
            className="input input-sm"
            type="text"
            dir="ltr"
            placeholder={DEFAULT_FAVICON}
            value={favicon}
            onChange={(e) => setFavicon(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', height: '30px' }}
          />
        </div>
      </div>
    </section>
  );
}
