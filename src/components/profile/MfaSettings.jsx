import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff, Smartphone, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Modal from '../common/Modal';
import OtpInput from '../common/OtpInput';
import TotpSetup from './TotpSetup';
import BackupCodes from './BackupCodes';
import { getErrorMessage } from '../../utils/getErrorMessage';
import api from '../../services/api';

function MfaSettings() {
  const { user, enableMfa, disableMfa, verifyMfaSetup, updateUser } = useAuth();
  const mfaMethod = user?.mfaMethod || 'none';
  const enabled = mfaMethod !== 'none';

  // Email OTP flow states
  const [phase, setPhase] = useState(null); // null | 'password' | 'otp'
  const [action, setAction] = useState(null); // 'enable-email' | 'disable-email'
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // TOTP flow states
  const [totpPhase, setTotpPhase] = useState(null); // null | 'password' | 'setup' | 'backup' | 'disable-password'
  const [totpQr, setTotpQr] = useState('');
  const [totpManualKey, setTotpManualKey] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  // --- Email OTP handlers ---
  const openEmail = (act) => {
    setAction(act);
    setPassword('');
    setPhase('password');
  };

  const closeEmail = () => {
    setPhase(null);
    setAction(null);
    setPassword('');
  };

  const submitEmailPassword = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      if (action === 'enable-email') await enableMfa(password);
      else await disableMfa(password);
      toast.success('A confirmation code was sent to your email');
      setPhase('otp');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Password confirmation failed'));
    } finally {
      setBusy(false);
    }
  };

  const submitEmailOtp = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      await verifyMfaSetup(code);
      toast.success(
        action === 'enable-email'
          ? 'Email two-factor authentication enabled'
          : 'Two-factor authentication disabled'
      );
      closeEmail();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid or expired code'));
    } finally {
      setBusy(false);
    }
  };

  // --- TOTP handlers ---
  const openTotpSetup = () => {
    setPassword('');
    setTotpPhase('password');
  };

  const closeTotpSetup = () => {
    setTotpPhase(null);
    setTotpQr('');
    setTotpManualKey('');
    setBackupCodes([]);
    setPassword('');
  };

  const submitTotpPassword = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/mfa/totp/setup', { password });
      setTotpQr(data.qrCodeUrl);
      setTotpManualKey(data.manualEntryKey);
      setTotpPhase('setup');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start setup'));
    } finally {
      setBusy(false);
    }
  };

  const submitTotpVerify = async (code) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/mfa/totp/verify-setup', { token: code });
      setBackupCodes(data.backupCodes);
      setTotpPhase('backup');
      // Update user state
      if (updateUser && user) {
        updateUser({ ...user, mfaEnabled: true, mfaMethod: 'totp', totpEnabled: true });
      }
      toast.success('Authenticator app enabled!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid code. Check your authenticator app.'));
    } finally {
      setBusy(false);
    }
  };

  const openTotpDisable = () => {
    setPassword('');
    setTotpPhase('disable-password');
  };

  const submitTotpDisable = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/mfa/totp/disable', { password });
      if (updateUser && user) {
        updateUser({ ...user, mfaEnabled: false, mfaMethod: 'none', totpEnabled: false });
      }
      toast.success('Authenticator app disabled');
      closeTotpSetup();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to disable'));
    } finally {
      setBusy(false);
    }
  };

  // Status display
  const statusLabel =
    mfaMethod === 'totp' ? 'Authenticator App' : mfaMethod === 'email' ? 'Email OTP' : 'Not enabled';
  const statusDesc =
    mfaMethod === 'totp'
      ? 'You use an authenticator app (e.g. Google Authenticator) for login verification.'
      : mfaMethod === 'email'
        ? 'A one-time code is emailed each time you log in.'
        : 'Add an extra layer of security to your account.';

  return (
    <div className="data-table-card" style={{ marginBottom: '24px' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Two-Factor Authentication</h3>
      </div>
      <div style={{ padding: '24px' }}>
        {/* Current status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '20px',
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
                {statusLabel}
                <span
                  className={`status-badge ${enabled ? 'active' : 'cancelled'}`}
                  style={{ marginLeft: '8px', fontSize: '11px' }}
                >
                  {enabled ? '2FA ON' : '2FA OFF'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {statusDesc}
              </div>
            </div>
          </div>
        </div>

        {/* Method options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Authenticator App option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              background: mfaMethod === 'totp' ? 'rgba(99, 102, 241, 0.04)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Smartphone size={20} style={{ color: 'var(--brand-primary)' }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>Authenticator App</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Google Authenticator, Authy, etc.
                </div>
              </div>
            </div>
            {mfaMethod === 'totp' ? (
              <Button variant="secondary" size="small" onClick={openTotpDisable}>
                Disable
              </Button>
            ) : (
              <Button
                variant="primary"
                size="small"
                onClick={openTotpSetup}
                disabled={mfaMethod === 'email'}
              >
                Enable
              </Button>
            )}
          </div>

          {/* Email OTP option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              background: mfaMethod === 'email' ? 'rgba(99, 102, 241, 0.04)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={20} style={{ color: 'var(--brand-primary)' }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>Email OTP</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Receive a code via email on each login
                </div>
              </div>
            </div>
            {mfaMethod === 'email' ? (
              <Button variant="secondary" size="small" onClick={() => openEmail('disable-email')}>
                Disable
              </Button>
            ) : (
              <Button
                variant="primary"
                size="small"
                onClick={() => openEmail('enable-email')}
                disabled={mfaMethod === 'totp'}
              >
                Enable
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Email OTP: password confirmation modal */}
      <Modal
        isOpen={phase === 'password'}
        onClose={closeEmail}
        title={action === 'enable-email' ? 'Enable Email OTP' : 'Disable Email OTP'}
        footer={
          <>
            <Button variant="secondary" onClick={closeEmail}>Cancel</Button>
            <Button variant="primary" onClick={submitEmailPassword} disabled={busy || !password}>
              {busy ? 'Sending code...' : 'Continue'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitEmailPassword}>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Confirm your password to {action === 'enable-email' ? 'enable' : 'disable'} email
            OTP. We'll send a code to confirm.
          </p>
          <div className="form-group">
            <label htmlFor="mfa-email-password">Password</label>
            <input
              id="mfa-email-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </form>
      </Modal>

      {/* Email OTP: code confirmation modal */}
      <Modal isOpen={phase === 'otp'} onClose={closeEmail} title="Enter Verification Code">
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
          Enter the 6-digit code sent to your email.
        </p>
        <OtpInput onSubmit={submitEmailOtp} submitting={busy} onResend={null} />
      </Modal>

      {/* TOTP: password confirmation modal */}
      <Modal
        isOpen={totpPhase === 'password'}
        onClose={closeTotpSetup}
        title="Enable Authenticator App"
        footer={
          <>
            <Button variant="secondary" onClick={closeTotpSetup}>Cancel</Button>
            <Button variant="primary" onClick={submitTotpPassword} disabled={busy || !password}>
              {busy ? 'Setting up...' : 'Continue'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitTotpPassword}>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Confirm your password to set up authenticator app.
          </p>
          <div className="form-group">
            <label htmlFor="mfa-totp-password">Password</label>
            <input
              id="mfa-totp-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </form>
      </Modal>

      {/* TOTP: QR code + verify modal */}
      <Modal isOpen={totpPhase === 'setup'} onClose={closeTotpSetup} title="Scan QR Code">
        <TotpSetup
          qrCodeUrl={totpQr}
          manualEntryKey={totpManualKey}
          onVerify={submitTotpVerify}
          submitting={busy}
        />
      </Modal>

      {/* TOTP: backup codes display */}
      <Modal isOpen={totpPhase === 'backup'} onClose={closeTotpSetup} title="Backup Codes">
        <BackupCodes codes={backupCodes} onDone={closeTotpSetup} />
      </Modal>

      {/* TOTP: disable confirmation */}
      <Modal
        isOpen={totpPhase === 'disable-password'}
        onClose={closeTotpSetup}
        title="Disable Authenticator App"
        footer={
          <>
            <Button variant="secondary" onClick={closeTotpSetup}>Cancel</Button>
            <Button variant="danger" onClick={submitTotpDisable} disabled={busy || !password}>
              {busy ? 'Disabling...' : 'Disable'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitTotpDisable}>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            This will remove authenticator app protection from your account. Enter your password
            to confirm.
          </p>
          <div className="form-group">
            <label htmlFor="mfa-totp-disable-password">Password</label>
            <input
              id="mfa-totp-disable-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MfaSettings;
