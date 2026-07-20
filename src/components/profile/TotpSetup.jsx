import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Button from '../common/Button';

function TotpSetup({ qrCodeUrl, manualEntryKey, onVerify, submitting }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(manualEntryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6 && !submitting) {
      onVerify(code);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
      </p>

      {/* QR Code */}
      {qrCodeUrl && (
        <div style={{ marginBottom: '16px' }}>
          <img
            src={qrCodeUrl}
            alt="TOTP QR Code"
            style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }}
          />
        </div>
      )}

      {/* Manual entry key */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
          Can't scan? Enter this key manually:
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-secondary, #f1f5f9)',
            padding: '8px 14px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            letterSpacing: '1px',
            wordBreak: 'break-all',
          }}
        >
          <span>{manualEntryKey}</span>
          <button
            type="button"
            onClick={handleCopy}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            title="Copy key"
          >
            {copied ? <Check size={14} color="var(--accent-success)" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Verification input */}
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Enter the 6-digit code from your app to verify:
        </p>
        <div className="form-group" style={{ maxWidth: '200px', margin: '0 auto 16px' }}>
          <input
            className="form-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          style={{ width: '100%' }}
          disabled={code.length !== 6 || submitting}
        >
          {submitting ? 'Verifying...' : 'Verify & Enable'}
        </Button>
      </form>
    </div>
  );
}

export default TotpSetup;
