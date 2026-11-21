
import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import Navbar from '../layout/Navbar';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];

  return (
    <div className="auth-layout">
      <Navbar />

      <div className="auth-container">
        <div className="auth-form-section">
          <div className="auth-form-content">
            {children}
          </div>

          <div className="auth-footer">
            {t.copyright}
          </div>
        </div>


        <div className="auth-promo-section">
          <div className="promo-content">
            <div className="promo-label">
              <Sparkles size={16} />
              <span>{t.workspaceLabel}</span>
            </div>

            <h1>
              {t.promoTitleFirst}
              <br />
              <span>{t.promoTitleSecond}</span>
            </h1>

            <p>{t.promoDescription}</p>
          </div>

          {/* Decorative spheres */}
          <div className="promo-decoration">
            <div className="promo-orb promo-orb-one" />
            <div className="promo-orb promo-orb-two" />
            <div className="promo-orb promo-orb-three" />
          </div>

          <div className="promo-bottom">
            <span>{t.poweredBy}</span>
            <span>{t.builtFor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
