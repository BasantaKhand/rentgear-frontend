import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Captcha from '../components/common/Captcha';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import { isStrongEnough } from '../utils/passwordStrength';
import { isValidEmail, isValidPhone, isValidName } from '../utils/validators';
import { getErrorMessage } from '../utils/getErrorMessage';

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [captchaReload, setCaptchaReload] = useState(0);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Frontend validation (defense in depth) — name, email, phone, then password
    if (!isValidName(`${form.firstName} ${form.lastName}`.trim())) {
      toast.error('Please enter a valid name (letters and spaces, 2-50 chars)');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isValidPhone(form.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!isStrongEnough(form.password)) {
      toast.error('Please choose a stronger password');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!agreed) {
      toast.error('Please accept the Terms of Service to continue');
      return;
    }
    if (!captcha.answer) {
      toast.error('Please complete the security check');
      return;
    }

    const payload = {
      name: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      phone: form.phone,
      password: form.password,
      captchaToken: captcha.token,
      captchaAnswer: captcha.answer,
    };

    setSubmitting(true);
    try {
      await register(payload);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      // A fresh challenge on any failure (captcha tokens are single-use in spirit).
      setCaptchaReload((n) => n + 1);
      if (err.rateLimited) {
        toast.error(err.friendlyMessage);
      } else {
        toast.error(getErrorMessage(err, 'Registration failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2>Create an account</h2>
          <p>Start renting equipment today</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <div className="form-group">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                className="form-input"
                type="text"
                name="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                className="form-input"
                type="text"
                name="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              name="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="form-input"
              type="tel"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
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
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <PasswordStrengthMeter password={form.password} />

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              className="form-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <Captcha reloadKey={captchaReload} onChange={setCaptcha} />

          <label
            className="filter-option"
            style={{ gap: '8px', marginBottom: '24px' }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              I agree to the{' '}
              <a href="#" style={{ color: 'var(--brand-primary)' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" style={{ color: 'var(--brand-primary)' }}>
                Privacy Policy
              </a>
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%' }}
            disabled={
              submitting ||
              !isStrongEnough(form.password) ||
              !agreed ||
              !captcha.answer
            }
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="form-divider">or sign up with</div>
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
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--brand-primary)', fontWeight: 500 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
