// Warning modal shown when the user has been idle. Parent (AuthContext) controls
// visibility and the countdown; "Stay logged in" refreshes the session.
function IdleTimeoutModal({ open, secondsLeft, onStay, onLogout }) {
  if (!open) return null;

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #fff)',
          borderRadius: '12px',
          padding: '28px',
          width: '90%',
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '20px' }}>Still there?</h3>
        <p style={{ margin: '0 0 8px', color: 'var(--text-secondary, #555)' }}>
          You've been inactive for a while. For your security, you'll be signed out
          automatically.
        </p>
        <p
          style={{
            margin: '0 0 20px',
            fontWeight: 600,
            fontSize: '18px',
            textAlign: 'center',
          }}
        >
          Signing out in {mm}:{ss}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onStay}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-primary, #2563eb)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Stay logged in
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border, #ddd)',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default IdleTimeoutModal;
