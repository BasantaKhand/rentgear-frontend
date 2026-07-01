import { Check, X } from 'lucide-react';
import { rules, evaluate } from '../../utils/passwordStrength';

// Real-time password strength bar + requirement checklist.
function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const { score, label, color, met } = evaluate(password);

  return (
    <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: i < score ? color : 'var(--border-light)',
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: '12px', color, fontWeight: 600, marginBottom: '8px' }}>
        {label}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {rules.map((r) => {
          const ok = met.includes(r.key);
          return (
            <li
              key={r.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: ok ? 'var(--accent-success)' : 'var(--text-tertiary)',
              }}
            >
              {ok ? <Check size={13} /> : <X size={13} />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;
