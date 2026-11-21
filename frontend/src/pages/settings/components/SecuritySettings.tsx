
import { useState } from 'react';
import {
  LockKeyhole,
  Mail,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import axios from 'axios';

import {
  requestPasswordChange,
  verifyPasswordChange,
  requestEmailChange,
  verifyEmailChange,
} from '../../../api/security.api';

import { useLanguage } from '../../../context/LanguageContext';
import { TRANSLATIONS } from '../../../constants/translations';
import { useNotification } from '../../../context/NotificationContext';

function SecuritySettings() {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const { showNotification } = useNotification();
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;

      return Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : t.securityGeneralError;
    }

    return t.securityGeneralError;
  };

  const handlePasswordRequest = async () => {
    setPasswordError('');

    try {
      setPasswordLoading(true);

      await requestPasswordChange();

      setPasswordCodeSent(true);
    } catch (error: unknown) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!/^\d{6}$/.test(passwordCode)) {
      setPasswordError(t.validCode);
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError(t.passwordLength);
      return;
    }

    if (
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setPasswordError(t.passwordRequirements);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch);
      return;
    }

    try {
      setPasswordLoading(true);

      await verifyPasswordChange(passwordCode, newPassword);

      setPasswordCodeSent(false);
      setPasswordCode('');
      setNewPassword('');
      setConfirmPassword('');

      showNotification('success', t.passwordChanged);
    } catch (error: unknown) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailRequest = async () => {
    setEmailError('');

    const email = newEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t.invalidEmail);
      return;
    }

    try {
      setEmailLoading(true);

      await requestEmailChange(email);

      setEmailCodeSent(true);
    } catch (error: unknown) {
      setEmailError(getErrorMessage(error));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailVerify = async () => {
    setEmailError('');

    if (!/^\d{6}$/.test(emailCode)) {
      setEmailError(t.validCode);
      return;
    }

    try {
      setEmailLoading(true);

      await verifyEmailChange(emailCode);

      setEmailCodeSent(false);
      setEmailCode('');
      setNewEmail('');

      showNotification('success', t.emailChanged);
    } catch (error: unknown) {
      setEmailError(getErrorMessage(error));
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="security-settings">
      <section className="security-card">
        <div className="security-card-heading">
          <div className="security-card-icon">
            <LockKeyhole size={21} />
          </div>

          <div>
            <h3>{t.changePassword}</h3>
            <p>{t.changePasswordDescription}</p>
          </div>
        </div>

        {!passwordCodeSent ? (
          <button
            type="button"
            className="security-primary-button"
            onClick={handlePasswordRequest}
            disabled={passwordLoading}
          >
            <Send size={16} />
            {passwordLoading ? t.sending : t.sendVerificationCode}
          </button>
        ) : (
          <div className="security-form-animation">
            <div className="security-info">
              {t.verificationCodeSent}
            </div>

            <div className="security-form-field">
              <label htmlFor="password-code">{t.verificationCode}</label>
              <input
                id="password-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={passwordCode}
                onChange={(event) =>
                  setPasswordCode(event.target.value.replace(/\D/g, ''))
                }
                placeholder="000000"
              />
            </div>

            <div className="security-form-field">
              <label htmlFor="new-password">{t.newPassword}</label>
              <div className="security-password-input">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={t.newPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t.togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="security-form-field">
              <label htmlFor="confirm-password">
                {t.confirmNewPassword}
              </label>
              <div className="security-password-input">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t.confirmNewPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={t.togglePasswordVisibility}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="security-form-actions">
              <button
                type="button"
                className="security-secondary-button"
                onClick={() => {
                  setPasswordCodeSent(false);
                  setPasswordCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                disabled={passwordLoading}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="security-primary-button"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
              >
                {passwordLoading ? t.updating : t.updatePassword}
              </button>
            </div>
          </div>
        )}

        {passwordError && (
          <div className="profile-message error">{passwordError}</div>
        )}
      </section>

      <section className="security-card">
        <div className="security-card-heading">
          <div className="security-card-icon">
            <Mail size={21} />
          </div>

          <div>
            <h3>{t.changeEmail}</h3>
            <p>{t.changeEmailDescription}</p>
          </div>
        </div>

        {!emailCodeSent ? (
          <div className="security-form-animation">
            <div className="security-form-field">
              <label htmlFor="new-email">{t.newEmail}</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder={t.enterNewEmail}
              />
            </div>

            <button
              type="button"
              className="security-primary-button"
              onClick={handleEmailRequest}
              disabled={emailLoading}
            >
              <Send size={16} />
              {emailLoading ? t.sending : t.sendVerificationCode}
            </button>
          </div>
        ) : (
          <div className="security-form-animation">
            <div className="security-info">
              {t.codeSentTo} {newEmail}.
            </div>

            <div className="security-form-field">
              <label htmlFor="email-code">{t.verificationCode}</label>
              <input
                id="email-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailCode}
                onChange={(event) =>
                  setEmailCode(event.target.value.replace(/\D/g, ''))
                }
                placeholder="000000"
              />
            </div>

            <div className="security-form-actions">
              <button
                type="button"
                className="security-secondary-button"
                onClick={() => {
                  setEmailCodeSent(false);
                  setEmailCode('');
                  setEmailError('');
                }}
                disabled={emailLoading}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="security-primary-button"
                onClick={handleEmailVerify}
                disabled={emailLoading}
              >
                {emailLoading ? t.verifying : t.verifyEmail}
              </button>
            </div>
          </div>
        )}

        {emailError && (
          <div className="profile-message error">{emailError}</div>
        )}
      </section>
    </div>
  );
}

export default SecuritySettings;
