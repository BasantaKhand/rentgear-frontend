import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Captcha from '../components/common/Captcha';
import { getErrorMessage } from '../utils/getErrorMessage';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Brute-force protection UI state
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [captchaReload, setCaptchaReload] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);

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
      await login(payload);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;

      // Reveal the CAPTCHA whenever the server says it's needed.
      if (data?.captchaRequired) {
        setCaptchaRequired(true);
        setCaptchaReload((n) => n + 1); // force a fresh challenge
      }

      if (err.rateLimited) {
        if (err.retryAfterSeconds) setLockSeconds(err.retryAfterSeconds);
        toast.error(err.friendlyMessage);
      } else if (status === 423) {
        // Account locked — start a countdown if we can compute it.
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

  const locked = lockSeconds > 0;

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
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ fontSize: '14px', color: 'var(--brand-primary)' }}
            >
              Forgot password?
            </a>
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
          <button type="button" className="social-btn">
            <span>G</span> Google
          </button>
          <button type="button" className="social-btn">
            <span>&#63743;</span> Apple
          </button>
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
