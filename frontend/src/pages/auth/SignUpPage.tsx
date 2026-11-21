
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Circle,
  XCircle,
} from 'lucide-react';
import { SiGoogle, SiGithub } from 'react-icons/si';
import axios from 'axios';

import AuthLayout from '../../components/auth/AuthLayout';
import { registerUser } from '../../api/authentication.api';
import env from '../../config/env';

import {
  validateName,
  validateEmail,
  validatePassword,
  getPasswordRules,
} from '../../utils/auth-validation';

import { useLanguage } from '../../context/LanguageContext';
import { TRANSLATIONS } from '../../constants/translations';

function SignUpPage() {
  const navigate = useNavigate();

  const { language } = useLanguage();
  const t = TRANSLATIONS[language];

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [serverError, setServerError] = useState('');

  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordRules = getPasswordRules(password);

  const formValid =
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePassword(password) &&
    password === confirmPassword &&
    confirmPassword.length > 0;

    const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    setServerError('');

    const currentNameError = validateName(name);
    const currentEmailError = validateEmail(email);
    const currentPasswordError = validatePassword(password);

    const currentConfirmPasswordError =
      password !== confirmPassword
        ? t.passwordsMismatch
        : '';

    setNameError(currentNameError);
    setEmailError(currentEmailError);
    setPasswordError(currentPasswordError);
    setConfirmPasswordError(currentConfirmPasswordError);

    if (
      currentNameError ||
      currentEmailError ||
      currentPasswordError ||
      currentConfirmPasswordError
    ) {
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      navigate('/verify-email', {
        state: { email: email.trim() },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        setServerError(
          Array.isArray(message)
            ? message.join('. ')
            : typeof message === 'string'
              ? message
              : t.generalError,
        );
      } else {
        setServerError(t.generalError);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordRule = (
    passed: boolean,
    label: string,
  ) => (
    <div className={`password-rule ${passed ? 'passed' : ''}`}>
      {passed ? (
        <CheckCircle2 size={14} />
      ) : (
        <Circle size={14} />
      )}

      <span>{label}</span>
    </div>
  );

  const handleGoogleLogin = () => {
    window.location.href = `${env.apiUrl}/authentication/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${env.apiUrl}/authentication/github`;
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h2>{t.createAccount}</h2>
        <p>{t.signUpDescription}</p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Full name */}
        <div className="form-field">
          <label htmlFor="name">{t.fullName}</label>

          <div className={`input-wrapper ${nameError ? 'invalid' : ''}`}>
            <User size={18} />

            <input
              id="name"
              type="text"
              placeholder={t.namePlaceholder}
              value={name}
              maxLength={80}
              onChange={(event) => {
                setName(event.target.value);
                setNameError('');
                setServerError('');
              }}
              onBlur={() => setNameError(validateName(name))}
            />
          </div>

          {nameError && (
            <p className="field-error">
              <XCircle size={13} />
              {nameError}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="email">{t.email}</label>

          <div className={`input-wrapper ${emailError ? 'invalid' : ''}`}>
            <Mail size={18} />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
                setServerError('');
              }}
              onBlur={() => setEmailError(validateEmail(email))}
            />
          </div>

          {emailError && (
            <p className="field-error">
              <XCircle size={13} />
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="form-field">
          <label htmlFor="password">{t.password}</label>

          <div className={`input-wrapper ${passwordError ? 'invalid' : ''}`}>
            <Lock size={18} />

            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t.createPassword}
              value={password}
              maxLength={128}
              onFocus={() => setPasswordTouched(true)}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError('');
                setServerError('');
                setConfirmPasswordError('');
              }}
              onBlur={() => setPasswordError(validatePassword(password))}
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

          {passwordError && (
            <p className="field-error">
              <XCircle size={13} />
              {passwordError}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="form-field">
          <label htmlFor="confirmPassword">
            {t.confirmPassword}
          </label>

          <div
            className={`input-wrapper ${
              confirmPasswordError ? 'invalid' : ''
            }`}
          >
            <Lock size={18} />

            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t.repeatPassword}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setConfirmPasswordError('');
                setServerError('');
              }}
              onBlur={() => {
                if (confirmPassword && password !== confirmPassword) {
                  setConfirmPasswordError(t.passwordsMismatch);
                } else {
                  setConfirmPasswordError('');
                }
              }}
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

          {confirmPasswordError && (
            <p className="field-error">
              <XCircle size={13} />
              {confirmPasswordError}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="auth-error-box" role="alert">
            <XCircle size={17} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="auth-submit"
          disabled={loading || !formValid}
        >
          {loading ? t.creatingAccount : t.createAccountButton}
        </button>
      </form>

      {/* Social registration */}
      <div className="auth-divider">
        <span>{t.orSignUp}</span>
      </div>

      <div className="social-buttons">
        <button
          type="button"
          className="social-button"
          onClick={handleGoogleLogin}
        >
          <SiGoogle size={18} />
          <span>Google</span>
        </button>

        <button
          type="button"
          className="social-button"
          onClick={handleGithubLogin}
        >
          <SiGithub size={18} />
          <span>GitHub</span>
        </button>
      </div>

      {/* Sign in link */}
      <p className="auth-switch">
        {t.alreadyAccount}{' '}
        <Link to="/signin">{t.signInLink}</Link>
      </p>
    </AuthLayout>
  );
}

export default SignUpPage;
