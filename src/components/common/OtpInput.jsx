import { useState, useRef, useEffect, useCallback } from 'react';

// Six-box OTP entry with auto-advance, paste support, auto-submit on completion,
// an expiry countdown, and a resend link with a 60s cooldown.
function OtpInput({ onSubmit, onResend, submitting = false, expirySeconds = 300 }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [expiry, setExpiry] = useState(expirySeconds);
  const [cooldown, setCooldown] = useState(60);
  const inputs = useRef([]);

  // Expiry countdown
  useEffect(() => {
    if (expiry <= 0) return undefined;
    const id = setInterval(() => setExpiry((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [expiry]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const submit = useCallback(
    (code) => {
      if (!submitting) onSubmit(code);
    },
    [onSubmit, submitting]
  );

  const setDigit = (index, value) => {
    const v = value.replace(/\D/g, '');
    setDigits((prev) => {
      const next = [...prev];
      next[index] = v.slice(-1);
      const code = next.join('');
      if (code.length === 6 && !next.includes('')) {
        setTimeout(() => submit(code), 0);
      }
      return next;
    });
    if (v && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = text.split('');
    while (next.length < 6) next.push('');
    setDigits(next);
    if (text.length === 6) setTimeout(() => submit(text), 0);
    else inputs.current[text.length]?.focus();
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await onResend?.();
    setCooldown(60);
    setExpiry(expirySeconds);
    setDigits(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
  };

  const mm = Math.floor(expiry / 60);
  const ss = String(expiry % 60).padStart(2, '0');

  return (
    <div>
      <div
        style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '16px 0' }}
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={i === 0}
            style={{
              width: '44px',
              height: '52px',
              textAlign: 'center',
              fontSize: '22px',
              fontWeight: 600,
              border: '1.5px solid var(--border-light, #d1d5db)',
              borderRadius: '8px',
              background: 'var(--bg-secondary, #fff)',
            }}
          />
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {expiry > 0 ? (
          <>Code expires in {mm}:{ss}</>
        ) : (
          <span style={{ color: 'var(--danger, #dc2626)' }}>Code expired — request a new one</span>
        )}
      </p>

      {onResend && (
        <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '8px' }}>
          {cooldown > 0 ? (
            <span style={{ color: 'var(--text-tertiary)' }}>Resend code in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary, #2563eb)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Resend code
            </button>
          )}
        </p>
      )}
    </div>
  );
}

export default OtpInput;
