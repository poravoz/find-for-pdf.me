
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  CircleAlert,
} from 'lucide-react';
import { SiGoogle, SiGithub } from 'react-icons/si';
import axios from 'axios';

import AuthLayout from '../../components/auth/AuthLayout';
import env from '../../config/env';

import { loginUser } from '../../api/authentication.api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import { TRANSLATIONS } from '../../constants/translations';

function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const { checkAuth } = useAuth();
  const { language } = useLanguage();

  const t = TRANSLATIONS[language];

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await loginUser({
        email: email.trim(),
        password,
        rememberMe,
      });

      await checkAuth();

      navigate('/', { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        setError(
          typeof message === 'string'
            ? message
            : t.loginError,
        );
      } else {
        setError(t.generalError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${env.apiUrl}/authentication/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${env.apiUrl}/authentication/github`;
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h2>{t.welcomeBack}</h2>
        <p>{t.signInDescription}</p>
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {/* Email */}
        <div className="form-field">
          <label htmlFor="email">{t.email}</label>

          <div className="input-wrapper">
            <Mail size={18} />

            <input
              id="email"
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

        {/* Password */}
        <div className="form-field">
          <div className="password-label">
            <label htmlFor="password">{t.password}</label>

            <Link to="/forgot-password">
              {t.forgotPassword}
            </Link>
          </div>

          <div className="input-wrapper">
            <Lock size={18} />

            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t.enterPassword}
              value={password}
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
                showPassword
                  ? t.hidePassword
                  : t.showPassword
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <label className="remember-option">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) =>
              setRememberMe(event.target.checked)
            }
          />

          <span>{t.rememberMe}</span>
        </label>

        {/* Error */}
        {error && (
          <div className="auth-error-box" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
        >
          {loading ? t.signingIn : t.signIn}
        </button>
      </form>

      {/* Social login divider */}
      <div className="auth-divider">
        <span>{t.orContinue}</span>
      </div>

      {/* Social login */}
      <div className="social-buttons">
        <button
          type="button"
          className="social-button"
          onClick={handleGoogleLogin}
        >
          <SiGoogle size={19} />
          <span>Google</span>
        </button>

        <button
          type="button"
          className="social-button"
          onClick={handleGithubLogin}
        >
          <SiGithub size={19} />
          <span>GitHub</span>
        </button>
      </div>

      {/* Registration link */}
      <p className="auth-switch">
        {t.noAccount}{' '}
        <Link to="/signup">{t.signUp}</Link>
      </p>
    </AuthLayout>
  );
}

export default SignInPage;
