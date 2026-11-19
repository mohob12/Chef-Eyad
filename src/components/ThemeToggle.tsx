import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { locale } = useI18n();

  const label =
    locale === 'ar'
      ? isDark
        ? 'التبديل إلى الوضع الفاتح'
        : 'التبديل إلى الوضع الداكن (الفاخر)'
      : locale === 'fr'
        ? isDark
          ? 'Passer au mode clair'
          : 'Passer au mode sombre'
        : isDark
          ? 'Switch to Light mode'
          : 'Switch to Dark mode';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      data-theme-current={theme}
    >
      <div className="theme-toggle-track">
        {/* Luxury animated icon container */}
        <div className="theme-icon-wrap" aria-hidden="true">
          {isDark ? (
            /* Golden Moon with Starlet */
            <svg
              className="theme-icon moon-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.2" />
              {/* Star sparkle accent */}
              <circle cx="18" cy="5" r="1" fill="currentColor" stroke="none" className="theme-star-1" />
              <circle cx="19.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" className="theme-star-2" />
            </svg>
          ) : (
            /* Radiant Luxury Sun */
            <svg
              className="theme-icon sun-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.25" />
              <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
            </svg>
          )}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </button>
  );
}
