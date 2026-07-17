import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Modal from '../common/Modal';
import OtpInput from '../common/OtpInput';
import { getErrorMessage } from '../../utils/getErrorMessage';

// Two-factor (email OTP) management: shows status and runs the
// password-confirm → OTP-confirm flow for enabling/disabling.
function MfaSettings() {
  const { user, enableMfa, disableMfa, verifyMfaSetup } = useAuth();
  const enabled = !!user?.mfaEnabled;

  const [phase, setPhase] = useState(null); // null | 'password' | 'otp'
  const [action, setAction] = useState(null); // 'enable' | 'disable'
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (act) => {
    setAction(act);
    setPassword('');
    setPhase('password');
  };

  const close = () => {
    setPhase(null);
    setAction(null);
    setPassword('');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      if (action === 'enable') await enableMfa(password);
      else await disableMfa(password);
      toast.success('A confirmation code was sent to your email');
      setPhase('otp');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Password confirmation failed'));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      await verifyMfaSetup(code);
      toast.success(
        action === 'enable' ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled'
      );
      close();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid or expired code'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="data-table-card" style={{ marginBottom: '24px' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Two-Factor Authentication</h3>
      </div>
      <div
        style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {enabled ? (
            <ShieldCheck size={22} style={{ color: 'var(--accent-success, #16a34a)' }} />
          ) : (
            <ShieldOff size={22} style={{ color: 'var(--text-tertiary)' }} />
          )}
          <div>
            <div style={{ fontWeight: 500 }}>
              {enabled ? 'Enabled' : 'Disabled'}
              <span
                className={`status-badge ${enabled ? 'active' : 'cancelled'}`}
                style={{ marginLeft: '8px', fontSize: '11px' }}
              >
                {enabled ? '2FA ON' : '2FA OFF'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {enabled
                ? 'A one-time code is emailed each time you log in.'
                : 'Add an extra layer of security with an email code at login.'}
            </div>
          </div>
        </div>
        {enabled ? (
          <Button variant="secondary" onClick={() => open('disable')}>
            Disable 2FA
          </Button>
        ) : (
          <Button variant="primary" onClick={() => open('enable')}>
            Enable 2FA
          </Button>
        )}
      </div>

      {/* Step 1: password confirmation */}
      <Modal
        isOpen={phase === 'password'}
        onClose={close}
        title={action === 'enable' ? 'Enable Two-Factor' : 'Disable Two-Factor'}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={submitPassword} disabled={busy || !password}>
              {busy ? 'Sending code...' : 'Continue'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitPassword}>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Confirm your password to {action === 'enable' ? 'enable' : 'disable'} two-factor
            authentication. We'll email you a code to confirm.
          </p>
          <div className="form-group">
            <label htmlFor="mfa-password">Password</label>
            <input
              id="mfa-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </form>
      </Modal>

      {/* Step 2: OTP confirmation */}
      <Modal
        isOpen={phase === 'otp'}
        onClose={close}
        title="Enter Verification Code"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
          Enter the 6-digit code sent to your email.
        </p>
        <OtpInput onSubmit={submitOtp} submitting={busy} onResend={null} />
      </Modal>
    </div>
  );
}

export default MfaSettings;
