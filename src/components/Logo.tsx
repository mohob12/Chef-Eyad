import { Link } from 'react-router-dom';
import { useSettings } from '../lib/settings';

export default function Logo({ to = '/' }: { to?: string }) {
  const settings = useSettings();
  const logoSrc = settings?.site_logo_url || localStorage.getItem('mk_site_logo_url') || '/brand/logo.png';

  return (
    <Link to={to} className="logo" aria-label="Chef Eyad">
      <img src={logoSrc} alt="Chef Eyad" width={317} height={96} />
    </Link>
  );
}

/** Shown for dishes without a photo yet. */
export function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <span className={`img-ph ${className}`} aria-hidden="true">
      <img className="img-ph-mark" src="/brand/mark.png" alt="" />
    </span>
  );
}
