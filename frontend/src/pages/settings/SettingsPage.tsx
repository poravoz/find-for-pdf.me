import { useEffect, useState } from 'react';
import {
  UserRound,
  ShieldCheck,
  Palette,
  Languages,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';

import Navbar from '../../components/layout/Navbar';
import ProfileSettings from './components/ProfileSettings';
import SecuritySettings from './components/SecuritySettings';
import AppearanceSettings from './components/AppearanceSettings';

import './settings.css';
import type { SettingsTab } from '../../types/settings.types';
import { useNotification } from '../../context/NotificationContext';


function LanguageSettings() {
  const { language, setLanguage } = useLanguage();
  const t = TRANSLATIONS[language];

  const {
    showNotification,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useNotification();

  const handleLanguageChange = (newLanguage: 'uk' | 'en') => {
    if (newLanguage === language) return;

    setLanguage(newLanguage);

    const notificationText = newLanguage === 'uk'
      ? TRANSLATIONS.uk.languageChanged
      : TRANSLATIONS.en.languageChanged;

    showNotification('success', notificationText);
  };

  return (
    <div className="appearance-settings">
      <div className="appearance-section-heading">
        <div>
          <h3>{t.applicationLanguage}</h3>
          <p>{t.languageHint}</p>
        </div>

        <Languages
          size={21}
          className="settings-icon settings-icon-accent"
          aria-hidden="true"
        />
      </div>

      <div className="language-options">
        <button
          type="button"
          className={`language-option ${
            language === 'uk' ? 'active' : ''
          }`}
          onClick={() => handleLanguageChange('uk')}
          aria-pressed={language === 'uk'}
        >
          <span>Українська</span>
          <small>{t.ukrainian}</small>
        </button>

        <button
          type="button"
          className={`language-option ${
            language === 'en' ? 'active' : ''
          }`}
          onClick={() => handleLanguageChange('en')}
          aria-pressed={language === 'en'}
        >
          <span>English</span>
          <small>{t.english}</small>
        </button>
      </div>

      <div className="appearance-notification-setting">
        <div>
          <strong>{t.notificationsTitle}</strong>
          <p>{t.notificationsDescription}</p>
        </div>

        <button
          type="button"
          className={`appearance-notification-toggle ${
            notificationsEnabled ? 'active' : ''
          }`}
          role="switch"
          aria-checked={notificationsEnabled}
          aria-label={t.notificationsTitle}
          onClick={() =>
            setNotificationsEnabled(!notificationsEnabled)
          }
        >
          <span />
        </button>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();

  const t = TRANSLATIONS[language];

  const [activeTab, setActiveTab] =
    useState<SettingsTab>('appearance');

  useEffect(() => {
    if (!isLoading) {
      setActiveTab(user ? 'profile' : 'appearance');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <div className="home-loading">{t.homeLoading}</div>;
  }

  const settingsTabs = user
    ? [
        {
          id: 'profile' as const,
          label: t.profile,
          description: t.profileDescription,
          icon: UserRound,
        },
        {
          id: 'security' as const,
          label: t.security,
          description: t.securityDescription,
          icon: ShieldCheck,
        },
        {
          id: 'appearance' as const,
          label: t.appearance,
          description: t.appearanceDescription,
          icon: Palette,
        },
        {
          id: 'preferences' as const,
          label: t.preferences,
          description: t.preferencesDescription,
          icon: Languages,
        },
      ]
    : [
        {
          id: 'appearance' as const,
          label: t.appearance,
          description: t.appearanceDescription,
          icon: Palette,
        },
        {
          id: 'preferences' as const,
          label: t.language,
          description: t.languageDescription,
          icon: Languages,
        },
      ];

  const activeTabInfo = settingsTabs.find(
    (tab) => tab.id === activeTab,
  );

  return (
    <div className="settings-page">
      <Navbar />

      <main className="settings-container">
        <div className="settings-heading">
          <div>
            <h1>{t.settingsTitle}</h1>
            <p>
              {user
                ? t.settingsDescription
                : t.settingsGuestDescription}
            </p>
          </div>
        </div>

        <div className="settings-layout">
          <aside className="settings-sidebar">
            <span className="settings-sidebar-title">
              {t.general}
            </span>

            <nav className="settings-navigation">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`settings-nav-item ${
                      activeTab === tab.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon
                      size={19}
                      className="settings-icon settings-nav-icon"
                      aria-hidden="true"
                    />

                    <span className="settings-nav-text">
                      <strong>{tab.label}</strong>
                      <small>{tab.description}</small>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section
            className={`settings-content ${
              activeTab === 'preferences' ? 'preferences-content' : ''
            }`}
          >            
            <div className="settings-content-heading">
              <h2>{activeTabInfo?.label}</h2>
              <p>{activeTabInfo?.description}</p>
            </div>

            {user && activeTab === 'profile' && (
              <ProfileSettings />
            )}

            {user && activeTab === 'security' && (
              <SecuritySettings />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSettings />
            )}

            {activeTab === 'preferences' && (
              <LanguageSettings />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
