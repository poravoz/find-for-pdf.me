
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';

function Navbar() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const initials = user?.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setProfileOpen(false);
      navigate('/signin', { replace: true });
    }
  };

  return (
    <header className="settings-navbar">
      <Link to="/" className="settings-logo">
        <div className="settings-logo-icon">
          <Sparkles size={21} />
        </div>
        <span>AI Studio</span>
      </Link>

      <div className="settings-navbar-actions">
        {user ? (
          <div className="settings-profile-menu">
           <button
              type="button"
              className="settings-profile-button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
            >
              <div className="settings-user-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <span className="settings-profile-name">
                {user.name}
              </span>

              <ChevronDown size={16} className="profile-chevron" />
            </button>
            {profileOpen && (
              <>
                <button
                  type="button"
                  className="settings-dropdown-backdrop"
                  aria-label={t.close}
                  onClick={() => setProfileOpen(false)}
                />

                <div className="settings-profile-dropdown">
                  <div className="settings-dropdown-user">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>

                  <div className="settings-dropdown-divider" />

                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={17} />
                    {t.settings}
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                  >
                    <LogOut size={17} />
                    {t.logout}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/settings" className="guest-settings-link">
            <Settings size={18} />
            <span>{t.settings}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
