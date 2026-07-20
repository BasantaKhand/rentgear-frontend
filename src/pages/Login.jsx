import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Captcha from '../components/common/Captcha';
import MfaLogin from '../components/common/MfaLogin';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import { getErrorMessage } from '../utils/getErrorMessage';
import { setAccessToken, setCsrfToken, refreshSession } from '../services/api';

function Login() {
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Brute-force protection UI state
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [captchaReload, setCaptchaReload] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);

  // MFA step state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('email'); // 'email' | 'totp'
  const [mfaEmail, setMfaEmail] = useState('');

  // Handle Google OAuth callback (redirect returns with query params)
  useEffect(() => {
    const googleSuccess = searchParams.get('google_success');
    const accessToken = searchParams.get('access_token');
    const csrfToken = searchParams.get('csrf_token');
    const mfaRequired = searchParams.get('mfa_required');
    const mfaMethodParam = searchParams.get('mfa_method');
    const emailParam = searchParams.get('email');
    const error = searchParams.get('error');

    // Clean URL params
    if (googleSuccess || mfaRequired || error) {
      const url = new URL(window.location);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }

    if (error) {
      const messages = {
        oauth_failed: 'Google sign-in failed. Please try again.',
        no_email: 'Could not get email from Google account.',
        account_disabled: 'Your account has been disabled.',
      };
      toast.error(messages[error] || 'Sign-in failed.');
      return;
    }

    if (googleSuccess && accessToken) {
      setAccessToken(accessToken);
      if (csrfToken) setCsrfToken(csrfToken);
      // Restore user from session
      refreshSession()
        .then((data) => {
          if (updateUser) updateUser(data.user);
          toast.success('Welcome back!');
          navigate(from, { replace: true });
        })
        .catch(() => {
          toast.error('Session could not be established. Please try again.');
        });
      return;
    }

    if (mfaRequired === 'true' && emailParam) {
      setMfaEmail(decodeURIComponent(emailParam));
      setMfaMethod(mfaMethodParam || 'email');
      setMfaStep(true);
      toast.success(
        mfaMethodParam === 'totp'
          ? 'Enter the code from your authenticator app'
          : 'Enter the code sent to your email'
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Countdown timer while the account is locked.
  useEffect(() => {
    if (lockSeconds <= 0) return undefined;
    const id = setInterval(() => setLockSeconds((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  const formatLock = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || lockSeconds > 0) return;

    setSubmitting(true);
    try {
      const payload = { email: form.email, password: form.password };
      if (captchaRequired) {
        payload.captchaToken = captcha.token;
        payload.captchaAnswer = captcha.answer;
      }
      const res = await login(payload);
      // Two-factor enabled: move to the MFA step.
      if (res?.mfaRequired) {
        setMfaEmail(res.email || form.email);
        setMfaMethod(res.mfaMethod || 'email');
        setMfaStep(true);
        if (res.mfaMethod === 'totp') {
          toast.success('Enter the code from your authenticator app');
        } else {
          toast.success('Enter the code sent to your email');
        }
        return;
      }
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;

      if (data?.captchaRequired) {
        setCaptchaRequired(true);
        setCaptchaReload((n) => n + 1);
      }

      if (err.rateLimited) {
        if (err.retryAfterSeconds) setLockSeconds(err.retryAfterSeconds);
        toast.error(err.friendlyMessage);
      } else if (status === 423) {
        if (data?.lockUntil) {
          const secs = Math.max(
            Math.ceil((new Date(data.lockUntil).getTime() - Date.now()) / 1000),
            0
          );
          setLockSeconds(secs);
        }
        toast.error(data?.message || 'Account locked. Try again later.');
      } else if (status === 400 && data?.captchaRequired) {
        toast.error(data?.message || 'Please complete the security check.');
      } else if (data?.attemptsRemaining !== undefined) {
        const n = data.attemptsRemaining;
        if (n <= 2) {
          toast.error(`Invalid credentials. ${n} attempt(s) remaining before lockout.`);
        } else {
          toast.error('Invalid credentials');
        }
      } else {
        toast.error(getErrorMessage(err, 'Login failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSuccess = () => {
    toast.success('Welcome back!');
    navigate(from, { replace: true });
  };

  const locked = lockSeconds > 0;

  // Step 2: MFA verification (handles both TOTP and email)
  if (mfaStep) {
    return (
      <MfaLogin
        email={mfaEmail}
        mfaMethod={mfaMethod}
        onSuccess={handleMfaSuccess}
        onBack={() => {
          setMfaStep(false);
          setForm((f) => ({ ...f, password: '' }));
        }}
      />
    );
  }

  return (
    <div className="main-content">
      <div className="form-card">
        <div className="form-header">
          <div
            className="logo"
            style={{ justifyContent: 'center', marginBottom: '24px' }}
          >
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {captchaRequired && (
            <Captcha reloadKey={captchaReload} onChange={setCaptcha} />
          )}

          {locked && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(220, 38, 38, 0.08)',
                color: 'var(--danger, #dc2626)',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              Too many attempts. Please wait {formatLock(lockSeconds)} before trying
              again.
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <label className="filter-option" style={{ gap: '8px' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              style={{ fontSize: '14px', color: 'var(--brand-primary)' }}
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%' }}
            disabled={submitting || locked}
          >
            {locked
              ? `Locked (${formatLock(lockSeconds)})`
              : submitting
                ? 'Signing in...'
                : 'Sign In'}
          </Button>
        </form>

        <div className="form-divider">or continue with</div>
        <div className="social-login">
          <GoogleSignInButton label="Sign in with Google" />
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--brand-primary)', fontWeight: 500 }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
