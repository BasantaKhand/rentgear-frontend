import { Loader2 } from 'lucide-react';

function Loader({ size = 32, message }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px',
        color: 'var(--brand-primary)',
      }}
    >
      <Loader2
        size={size}
        style={{ animation: 'spin 1s linear infinite' }}
      />
      {message && (
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {message}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Loader;
