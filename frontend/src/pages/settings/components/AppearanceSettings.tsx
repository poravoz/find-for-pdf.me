
import { Check, Palette } from 'lucide-react';

import { THEMES } from '../../../constants/themes';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { TRANSLATIONS } from '../../../constants/translations';
import { useNotification } from '../../../context/NotificationContext';

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const { showNotification } = useNotification();

  const t = TRANSLATIONS[language];

  const handleThemeChange = (newTheme: typeof theme) => {
    if (newTheme === theme) return;

    setTheme(newTheme);
    showNotification('success', t.themeChanged);
  };

  return (
    <div className="appearance-settings">
      <div className="appearance-section-heading">
        <div>
          <h3>{t.appearanceTitle}</h3>
          <p>{t.appearanceHint}</p>
        </div>

        <Palette
          size={21}
          className="settings-icon settings-icon-accent"
          aria-hidden="true"
        />
      </div>

      <div className="appearance-theme-grid">
        {THEMES.map((item) => {
          const isActive = theme === item;
          const themeName = item.charAt(0).toUpperCase() + item.slice(1);

          return (
            <button
              key={item}
              type="button"
              className={`appearance-theme-card ${isActive ? 'active' : ''}`}
              onClick={() => handleThemeChange(item)}
              aria-pressed={isActive}
              aria-label={`${themeName}${isActive ? ` — ${t.selectedTheme}` : ''}`}
            >
              <div
                className="appearance-theme-preview"
                data-theme={item}
              >
                <div className="appearance-preview-header">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="appearance-preview-content">
                  <div className="appearance-preview-sidebar" />
                  <div className="appearance-preview-main">
                    <div className="appearance-preview-line primary" />
                    <div className="appearance-preview-line" />
                    <div className="appearance-preview-line short" />
                    <div className="appearance-preview-button" />
                  </div>
                </div>
              </div>

              <div className="appearance-theme-info">
                <span>{themeName}</span>

                {isActive && (
                  <Check
                    size={17}
                    className="settings-icon settings-icon-accent"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AppearanceSettings;
