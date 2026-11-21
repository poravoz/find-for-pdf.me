
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import axios from 'axios';
import AuthLayout from '../../components/auth/AuthLayout';
import { verifyEmail } from '../../api/authentication.api';
import { useAuth } from '../../context/AuthContext';

function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();

  const email = location.state?.email as string | undefined;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!email) {
    return (
      <AuthLayout>
        <div className="auth-heading">
          <h2>Email not found</h2>
          <p>Please register your account first.</p>
        </div>

        <p className="auth-switch">
          <Link to="/signup">Back to registration</Link>
        </p>
      </AuthLayout>
    );
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);

      await verifyEmail({
        email,
        code,
      });

      await checkAuth();
      navigate('/');

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        setError(
          typeof message === 'string'
            ? message
            : 'Invalid or expired verification code.',
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <div className="verification-icon">
          <Mail size={28} />
        </div>

        <h2>Verify your email</h2>
        <p>
          We sent a verification code to:
          <br />
          <strong>{email}</strong>
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="verificationCode">
            Verification code
          </label>

          <div className="input-wrapper">
            <input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6);

                setCode(value);
              }}
              maxLength={6}
              required
            />
          </div>
        </div>

        {error && (
          <p className="auth-error">{error}</p>
        )}

        {success && (
          <p className="auth-success">{success}</p>
        )}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <p className="auth-switch">
        Entered the wrong email?{' '}
        <Link to="/signup">Register again</Link>
      </p>
    </AuthLayout>
  );
}

export default VerifyEmailPage;
