
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleAlert,
} from 'lucide-react';
import axios from 'axios';

import AuthLayout from '../../components/auth/AuthLayout';
import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';

import {
  getPasswordRules,
  validatePassword,
} from '../../utils/auth-validation';

import {
  requestPasswordReset,
  resetPassword,
} from '../../api/authentication.api';

function ForgotPasswordPage() {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];

  const [step, setStep] = useState('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordRules = getPasswordRules(password);

  const renderPasswordRule = (passed: boolean, label: string) => (
    <div className={`password-rule ${passed ? 'passed' : ''}`}>
      {passed ? (
        <CheckCircle2 size={14} />
      ) : (
        <Circle size={14} />
      )}

      <span>{label}</span>
    </div>
  );

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;

      if (typeof message === 'string') return message;

      if (Array.isArray(message)) return message.join('. ');
    }

    return fallback;
  };

  const handleRequestCode = async () => {
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(t.invalidEmail);
      return;
    }

    try {
      setLoading(true);

      await requestPasswordReset(normalizedEmail);

      setEmail(normalizedEmail);
      setStep('reset');
      setSuccess(t.codeSent);
    } catch (error: unknown) {
      setError(getErrorMessage(error, t.sendCodeError));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(code)) {
      setError(t.invalidCode);
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      setError(t.passwordRequirementsError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email,
        code,
        newPassword: password,
      });

      setStep('success');
    } catch (error: unknown) {
      setError(getErrorMessage(error, t.resetPasswordError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <div className="forgot-password-icon">
          {step === 'success' ? (
            <CheckCircle2 size={27} />
          ) : (
            <Lock size={27} />
          )}
        </div>

        <h2>
          {step === 'success'
            ? t.passwordResetSuccess
            : t.forgotPasswordTitle}
        </h2>

        <p>
          {step === 'email' && t.forgotPasswordDescription}
          {step === 'reset' && t.verificationCodeHint}
          {step === 'success' && t.passwordResetSuccessDescription}
        </p>
      </div>

      {step === 'email' && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRequestCode();
          }}
        >
          <div className="form-field">
            <label htmlFor="reset-email">{t.email}</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                required
              />
            </div>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              <CircleAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? t.sending : t.sendCode}
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleResetPassword();
          }}
        >
          <div className="form-field">
            <label htmlFor="reset-code">
              {t.enterVerificationCode}
            </label>

            <div className="input-wrapper">
              <KeyRound size={18} />

              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  );
                  setError('');
                }}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="new-password">{t.newPassword}</label>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.createPassword}
                value={password}
                maxLength={128}
                onFocus={() => setPasswordTouched(true)}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={
                  showPassword ? t.hidePassword : t.showPassword
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {passwordTouched && (
              <div className="password-rules">
                {renderPasswordRule(
                  passwordRules.minLength,
                  t.passwordMinLength,
                )}

                {renderPasswordRule(
                  passwordRules.uppercase,
                  t.passwordUppercase,
                )}

                {renderPasswordRule(
                  passwordRules.lowercase,
                  t.passwordLowercase,
                )}

                {renderPasswordRule(
                  passwordRules.number,
                  t.passwordNumber,
                )}

                {renderPasswordRule(
                  passwordRules.special,
                  t.passwordSpecial,
                )}

                {renderPasswordRule(
                  passwordRules.noSpaces,
                  t.passwordNoSpaces,
                )}
              </div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="confirm-password">
              {t.confirmPassword}
            </label>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.repeatPassword}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError('');
                }}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword ? t.hidePassword : t.showPassword
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              <CircleAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-box" role="status">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? t.resettingPassword : t.resetPassword}
          </button>

          <button
            type="button"
            className="forgot-back-button"
            onClick={() => {
              setStep('email');
              setCode('');
              setPassword('');
              setConfirmPassword('');
              setPasswordTouched(false);
              setError('');
              setSuccess('');
            }}
          >
            <ArrowLeft size={16} />
            {t.changeEmail}
          </button>
        </form>
      )}

      {step === 'success' && (
        <div className="forgot-success-content">
          <Link to="/signin" className="auth-submit">
            {t.goToSignIn}
          </Link>
        </div>
      )}

      {step !== 'success' && (
        <p className="auth-switch">
          <Link to="/signin">
            <ArrowLeft size={15} />
            {t.backToSignIn}
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
