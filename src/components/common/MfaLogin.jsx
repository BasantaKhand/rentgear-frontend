import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';
import OtpInput from './OtpInput';
import api from '../../services/api';
import { setAccessToken, setCsrfToken } from '../../services/api';
import { getErrorMessage } from '../../utils/getErrorMessage';

// Handles the login MFA step for both TOTP and Email methods,
// including "lost access?" recovery options.
function MfaLogin({ email, mfaMethod, onSuccess, onBack }) {
  const { verifyOtp, resendOtp, updateUser } = useAuth();

  const [view, setView] = useState('main'); // 'main' | 'backup' | 'email-recovery'
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Apply auth data from a successful MFA response
  const applyAuth = (data) => {
    setAccessToken(data.accessToken);
    if (data.csrfToken) setCsrfToken(data.csrfToken);
    if (updateUser) updateUser(data.user);
    onSuccess();
  };

  // --- TOTP verification ---
  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    if (submitting || totpCode.length !== 6) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/verify-totp', { email, token: totpCode });
      applyAuth(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid code'));
      setTotpCode('');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Email OTP verification (existing flow) ---
  const handleEmailOtpSubmit = async (code) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await verifyOtp(email, code);
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid or expired code'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      toast.success('A new code has been sent');
    } catch {
      toast.error('Could not resend code. Please wait a moment.');
    }
  };

  // --- Backup code ---
  const handleBackupSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !backupCode.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/mfa/use-backup-code', {
        email,
        backupCode: backupCode.trim(),
      });
      if (data.codesRemaining !== undefined && data.codesRemaining <= 3) {
        toast.success(`Logged in. Only ${data.codesRemaining} backup codes remaining.`);
      }
      applyAuth(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid backup code'));
      setBackupCode('');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Email recovery (for TOTP users who lost their device) ---
  const handleSendEmailRecovery = async () => {
    setSubmitting(true);
    try {
      await api.post('/auth/mfa/send-email-recovery', { email });
      toast.success('Recovery code sent to your email');
      setView('email-recovery');
    } catch (err) {
      if (err.rateLimited) {
        toast.error(err.friendlyMessage);
      } else {
        toast.error(getErrorMessage(err, 'Could not send recovery code'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailRecoverySubmit = async (code) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/verify-email-recovery', { email, otp: code });
      applyAuth(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid or expired code'));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---
  const header = (
    <div className="form-header">
      <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
        <div className="logo-icon">R</div>
        RentGear
      </div>
    </div>
  );

  const backButton = (target = 'main') => (
    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
      <button
        type="button"
        onClick={() => (target === 'login' ? onBack() : setView('main'))}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        ← {target === 'login' ? 'Back to login' : 'Back'}
      </button>
    </p>
  );

  // Backup code entry
  if (view === 'backup') {
    return (
      <div className="main-content">
        <div className="form-card">
          {header}
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Use a backup code</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Enter one of your saved backup codes.
          </p>
          <form onSubmit={handleBackupSubmit}>
            <div className="form-group">
              <input
                className="form-input"
                type="text"
                placeholder="Enter backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                autoFocus
                style={{ textAlign: 'center', fontFamily: 'monospace', letterSpacing: '2px' }}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              style={{ width: '100%' }}
              disabled={submitting || !backupCode.trim()}
            >
              {submitting ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          {backButton('main')}
        </div>
      </div>
    );
  }

  // Email recovery OTP entry (for TOTP users)
  if (view === 'email-recovery') {
    return (
      <div className="main-content">
        <div className="form-card">
          {header}
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Email recovery</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Enter the 6-digit code sent to your email.
          </p>
          <OtpInput onSubmit={handleEmailRecoverySubmit} submitting={submitting} onResend={null} />
          {backButton('main')}
        </div>
      </div>
    );
  }

  // Main MFA view: TOTP or Email
  if (mfaMethod === 'totp') {
    return (
      <div className="main-content">
        <div className="form-card">
          {header}
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Two-factor verification</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Enter the 6-digit code from your authenticator app.
          </p>

          <form onSubmit={handleTotpSubmit}>
            <div className="form-group" style={{ maxWidth: '220px', margin: '0 auto 16px' }}>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', fontSize: '22px', letterSpacing: '6px' }}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              style={{ width: '100%' }}
              disabled={totpCode.length !== 6 || submitting}
            >
              {submitting ? 'Verifying...' : 'Verify'}
            </Button>
          </form>

          {/* Lost access options */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setView('_lostAccess')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Lost access to your authenticator?
            </button>
            {view === '_lostAccess' && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setView('backup')}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Use a backup code
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailRecovery}
                  disabled={submitting}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Sending...' : 'Send code to email instead'}
                </button>
              </div>
            )}
          </div>

          {backButton('login')}
        </div>
      </div>
    );
  }

  // Email OTP method (existing behavior)
  return (
    <div className="main-content">
      <div className="form-card">
        {header}
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Two-factor verification</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Enter the 6-digit code sent to your email.
        </p>
        <OtpInput onSubmit={handleEmailOtpSubmit} onResend={handleResend} submitting={submitting} />
        {backButton('login')}
      </div>
    </div>
  );
}

export default MfaLogin;
