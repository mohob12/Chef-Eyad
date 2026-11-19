import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { openStatus, useNow } from '../lib/openStatus';
import { loc } from '../lib/format';

/** Full-width 3:1 banner: supports up to 5 custom slider images with auto-rotation. */
export default function HeroBanner() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const now = useNow();
  const status = settings ? openStatus(settings, now) : null;

  const rawHeroLogo = settings?.hero_logo_url !== undefined && settings.hero_logo_url !== null
    ? settings.hero_logo_url
    : localStorage.getItem('mk_hero_logo_url');

  const isHeroLogoHidden = rawHeroLogo === 'none' || rawHeroLogo === 'hide' || rawHeroLogo === 'hidden';
  const heroLogoSrc = isHeroLogoHidden ? null : (rawHeroLogo || '/brand/logo@banner.png');

  const customTagline =
    (settings ? loc(settings, 'hero_tagline', locale) : '') ||
    localStorage.getItem(`mk_hero_tagline_${locale}`) ||
    t('app.tagline');
  const customStatus =
    (settings ? loc(settings, 'hero_status_override', locale) : '') ||
    localStorage.getItem(`mk_hero_status_override_${locale}`);

  const timeLabel = (min: number) => {
    if (min === 0) return t('status.midnight');
    const h = Math.floor(min / 60);
    const m = String(min % 60).padStart(2, '0');
    return t('status.time', { h: String(h).padStart(2, '0'), m });
  };

  // Determine list of banner images (from settings or localStorage fallback or default)
  const bannerList = useMemo(() => {
    if (settings?.banner_images && settings.banner_images.length > 0) {
      return settings.banner_images;
    }
    const local = localStorage.getItem('mk_banner_images');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return ['/brand/banner.jpg'];
  }, [settings?.banner_images]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance slider every 5 seconds if there are multiple banners
  useEffect(() => {
    if (bannerList.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % bannerList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerList.length, isPaused]);

  // Clamp active index if bannerList shrinks
  useEffect(() => {
    if (activeIdx >= bannerList.length) {
      setActiveIdx(0);
    }
  }, [bannerList.length, activeIdx]);

  const prevSlide = () => {
    setActiveIdx((prev) => (prev - 1 + bannerList.length) % bannerList.length);
  };

  const nextSlide = () => {
    setActiveIdx((prev) => (prev + 1) % bannerList.length);
  };

  return (
    <section
      className="hero-banner"
      data-testid="hero-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slides */}
      <div className="hero-slider-track">
        {bannerList.map((src, idx) => (
          <div
            key={src + idx}
            className={`hero-slider-slide ${idx === activeIdx ? 'is-active' : ''}`}
            aria-hidden={idx !== activeIdx}
          >
            <img
              className="hero-banner-photo"
              src={src}
              alt=""
              fetchPriority={idx === 0 ? 'high' : 'auto'}
            />
          </div>
        ))}
      </div>

      {/* Brand block on far left */}
      <div className="hero-banner-brand">
        {heroLogoSrc && (
          <img src={heroLogoSrc} alt="Chef Eyad" width={792} height={240} />
        )}
        <span className="hero-banner-tag">{customTagline}</span>
      </div>

      {/* Open / Closed Status Badge at the bottom center of the banner */}
      <div className="hero-banner-bottom-status">
        {customStatus ? (
          <span
            className={`open-status ${status ? (status.open ? 'is-open' : 'is-closed') : 'is-open'}`}
            data-testid="open-status"
            role="status"
          >
            <span className="open-dot" aria-hidden="true" />
            <span>{customStatus}</span>
          </span>
        ) : status && (
          <span
            className={`open-status ${status.open ? 'is-open' : 'is-closed'}`}
            data-testid="open-status"
            data-open={status.open}
            role="status"
          >
            <span className="open-dot" aria-hidden="true" />
            <span>
              {status.open ? t('status.openNow') : t('status.closedNow')}
              <span className="open-sep" aria-hidden="true">
                {' · '}
              </span>
              {t(status.open ? 'status.closesAt' : 'status.opensAt', { time: timeLabel(status.next) })}
            </span>
          </span>
        )}
      </div>

      {/* Navigation arrows (only if > 1 banner) */}
      {bannerList.length > 1 && (
        <>
          <div className="hero-slider-nav">
            <button
              type="button"
              className="hero-slider-btn prev"
              onClick={prevSlide}
              aria-label="Previous banner"
            >
              ‹
            </button>
            <button
              type="button"
              className="hero-slider-btn next"
              onClick={nextSlide}
              aria-label="Next banner"
            >
              ›
            </button>
          </div>

          <div className="hero-slider-dots">
            {bannerList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`hero-slider-dot ${idx === activeIdx ? 'is-active' : ''}`}
                onClick={() => setActiveIdx(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
