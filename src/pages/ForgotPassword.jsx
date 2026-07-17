import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import Button from '../components/common/Button';
import { getErrorMessage } from '../utils/getErrorMessage';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      toast.success('Check your email for the reset link');
    } catch (err) {
      if (err.rateLimited) {
        toast.error(err.friendlyMessage);
      } else {
        toast.error(getErrorMessage(err, 'Something went wrong. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="main-content">
        <div className="form-card">
          <div className="form-header">
            <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <div className="logo-icon">R</div>
              RentGear
            </div>
            <h2>Check your email</h2>
            <p>If that email exists, you'll receive a reset link shortly.</p>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--text-secondary)',
              fontSize: '14px',
            }}
          >
            <p style={{ marginBottom: '8px' }}>
              Didn't receive an email? Check your spam folder or try again.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              Try another email
            </button>
          </div>

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

  return (
    <div className="main-content">
      <div className="form-card">
        <div className="form-header">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <h2>Forgot your password?</h2>
          <p>Enter your email and we'll send you a link to reset it.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%' }}
            disabled={submitting || !email.trim()}
          >
            {submitting ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
