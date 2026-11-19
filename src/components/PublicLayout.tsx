import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import LanguageSelect from './LanguageSelect';
import CartDrawer from './CartDrawer';
import SocialLinks from './SocialLinks';
import { useI18n } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { useSettings } from '../lib/settings';
import { loc } from '../lib/format';

export default function PublicLayout() {
  const { t, locale } = useI18n();
  const { count, setOpen } = useCart();
  const settings = useSettings();

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Logo />
          <nav className="site-nav">
            <NavLink to="/" end>
              {t('nav.menu')}
            </NavLink>
            <NavLink to="/reviews">{t('nav.reviews')}</NavLink>
            <NavLink to="/careers">{t('nav.careers')}</NavLink>
          </nav>
          <div className="spacer" />
          <LanguageSelect />
          <button
            className="btn btn-primary cart-btn"
            onClick={() => setOpen(true)}
            aria-label={t('nav.cart')}
            data-testid="open-cart"
          >
            <CartIcon />
            <span className="hide-sm">{t('nav.cart')}</span>
            {count > 0 && (
              <span className="cart-count" data-testid="cart-count">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer" data-testid="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand stack">
            <Logo />
            <p className="footer-tagline">{t('app.tagline')}</p>
            <nav className="row wrap small mobile-only footer-nav">
              <NavLink to="/reviews">{t('nav.reviews')}</NavLink>
              <NavLink to="/careers">{t('nav.careers')}</NavLink>
            </nav>
          </div>
          {settings && (
            <>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPinIcon />
                  {t('footer.address')}
                </h4>
                <p>{loc(settings, 'address', locale)}</p>
              </div>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClockIcon />
                  {t('footer.hours')}
                </h4>
                <p>{loc(settings, 'opening_hours', locale)}</p>
              </div>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PhoneIcon />
                  {t('footer.phone')}
                </h4>
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="num footer-phone">
                  {settings.phone}
                </a>
              </div>
              {(settings.facebook_url || settings.instagram_url || settings.tiktok_url) && (
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShareIcon />
                    {t('footer.follow')}
                  </h4>
                  <SocialLinks
                    links={{
                      facebook: settings.facebook_url,
                      instagram: settings.instagram_url,
                      tiktok: settings.tiktok_url,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </footer>

      <CartDrawer />
    </>
  );
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--yellow)' }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--yellow)' }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--yellow)' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--yellow)' }}>
      <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
