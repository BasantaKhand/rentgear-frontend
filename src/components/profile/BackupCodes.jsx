import { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';

function BackupCodes({ codes, onDone }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    const text = codes.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Warning */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'rgba(234, 179, 8, 0.08)',
          marginBottom: '16px',
        }}
      >
        <AlertTriangle size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Save these backup codes securely.</strong>{' '}
          They will not be shown again. Each code can only be used once. Use them to access
          your account if you lose your authenticator device.
        </div>
      </div>

      {/* Codes grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '16px',
          padding: '16px',
          background: 'var(--bg-secondary, #f8fafc)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
        }}
      >
        {codes.map((code, i) => (
          <div
            key={i}
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '6px 10px',
              background: 'white',
              borderRadius: '4px',
              textAlign: 'center',
              border: '1px solid var(--border-light)',
            }}
          >
            {code}
          </div>
        ))}
      </div>

      {/* Copy button */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          {copied ? <Check size={14} color="var(--accent-success)" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy all codes'}
        </button>
      </div>

      {/* Confirmation checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        I have saved my backup codes securely
      </label>

      <Button
        variant="primary"
        style={{ width: '100%' }}
        onClick={onDone}
        disabled={!saved}
      >
        Done
      </Button>
    </div>
  );
}

export default BackupCodes;
