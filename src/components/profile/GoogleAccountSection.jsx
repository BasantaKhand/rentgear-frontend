import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Link2, Unlink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Modal from '../common/Modal';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/getErrorMessage';

function GoogleAccountSection() {
  const { user, updateUser } = useAuth();
  const googleLinked = !!user?.googleLinked;

  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Link Google account
  const handleLink = async () => {
    setBusy(true);
    try {
      // Redirect-based: get the auth URL and redirect
      const { data } = await api.get('/auth/google');
      if (data.authUrl) {
        // Add a 'link' hint so callback can handle it (simplified: just redirect to Google)
        window.location.href = data.authUrl;
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not connect Google account'));
    } finally {
      setBusy(false);
    }
  };

  // Unlink Google account
  const handleUnlink = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/google/unlink', { password });
      if (data.user) updateUser(data.user);
      toast.success('Google account unlinked');
      setUnlinkOpen(false);
      setPassword('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not unlink'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="data-table-card" style={{ marginBottom: '24px' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Linked Accounts</h3>
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
          {/* Google icon */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <div>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>Google</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {googleLinked ? 'Connected' : 'Not connected'}
            </div>
          </div>
        </div>
        {googleLinked ? (
          <Button variant="secondary" size="small" onClick={() => setUnlinkOpen(true)}>
            <Unlink size={14} style={{ marginRight: '4px' }} />
            Unlink
          </Button>
        ) : (
          <Button variant="primary" size="small" onClick={handleLink} disabled={busy}>
            <Link2 size={14} style={{ marginRight: '4px' }} />
            {busy ? 'Connecting...' : 'Link Google'}
          </Button>
        )}
      </div>

      {/* Unlink confirmation modal */}
      <Modal
        isOpen={unlinkOpen}
        onClose={() => { setUnlinkOpen(false); setPassword(''); }}
        title="Unlink Google Account"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setUnlinkOpen(false); setPassword(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnlink} disabled={busy || !password}>
              {busy ? 'Unlinking...' : 'Unlink'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUnlink}>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Enter your password to confirm. You'll still be able to log in with email and password.
          </p>
          <div className="form-group">
            <label htmlFor="unlink-password">Password</label>
            <input
              id="unlink-password"
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

export default GoogleAccountSection;
