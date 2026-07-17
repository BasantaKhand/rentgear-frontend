import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import Button from '../components/common/Button';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import { isStrongEnough } from '../utils/passwordStrength';
import { getErrorMessage } from '../utils/getErrorMessage';

function ResetPassword() {
  const { token } = useParams();
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Verify the token on mount
  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-reset-token/${token}`);
        if (active) setTokenValid(data.valid === true);
      } catch {
        if (active) setTokenValid(false);
      } finally {
        if (active) setVerifying(false);
      }
    };
    verify();
    return () => { active = false; };
  }, [token]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!isStrongEnough(form.newPassword)) {
      toast.error('Please choose a stronger password');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        newPassword: form.newPassword,
      });
      setSuccess(true);
      toast.success(data.message || 'Password reset successful!');
    } catch (err) {
      if (err.rateLimited) {
        toast.error(err.friendlyMessage);
      } else {
        toast.error(getErrorMessage(err, 'Failed to reset password. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="main-content">
        <div className="form-card">
          <div className="form-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <div className="logo-icon">R</div>
              RentGear
            </div>
            <h2>Verifying reset link...</h2>
            <p>Please wait while we verify your reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (!tokenValid) {
    return (
      <div className="main-content">
        <div className="form-card">
          <div className="form-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <div className="logo-icon">R</div>
              RentGear
            </div>
            <h2>Invalid or expired link</h2>
            <p>This reset link is invalid or has expired. Please request a new one.</p>
          </div>

          <Link to="/forgot-password" style={{ display: 'block', textAlign: 'center' }}>
            <Button variant="primary" style={{ width: '100%' }}>
              Request New Reset Link
            </Button>
          </Link>

          <p
            style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>
              ← Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="main-content">
        <div className="form-card">
          <div className="form-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <div className="logo-icon">R</div>
              RentGear
            </div>
            <h2>Password reset successful</h2>
            <p>Your password has been changed. All sessions have been logged out.</p>
          </div>

          <Link to="/login" style={{ display: 'block', textAlign: 'center' }}>
            <Button variant="primary" style={{ width: '100%' }}>
              Sign in with new password
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="main-content">
      <div className="form-card">
        <div className="form-header">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <h2>Reset your password</h2>
          <p>Choose a new secure password for your account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              className="form-input"
              type="password"
              name="newPassword"
              placeholder="Enter your new password"
              value={form.newPassword}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <PasswordStrengthMeter password={form.newPassword} />

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              className="form-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your new password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <div
              style={{
                marginBottom: '16px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(220, 38, 38, 0.08)',
                color: 'var(--danger, #dc2626)',
                fontSize: '13px',
              }}
            >
              Passwords do not match
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%' }}
            disabled={
              submitting ||
              !isStrongEnough(form.newPassword) ||
              form.newPassword !== form.confirmPassword
            }
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
