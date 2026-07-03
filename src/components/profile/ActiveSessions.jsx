import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Monitor, LogOut } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { getErrorMessage } from '../../utils/getErrorMessage';

// Turn a raw User-Agent string into a short human label.
function describeDevice(ua = '') {
  const browser =
    /edg/i.test(ua) ? 'Edge'
    : /chrome|crios/i.test(ua) ? 'Chrome'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /safari/i.test(ua) ? 'Safari'
    : 'Browser';
  const os =
    /windows/i.test(ua) ? 'Windows'
    : /mac os|macintosh/i.test(ua) ? 'macOS'
    : /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ios/i.test(ua) ? 'iOS'
    : /linux/i.test(ua) ? 'Linux'
    : 'Unknown OS';
  return `${browser} on ${os}`;
}

function timeAgo(value) {
  if (!value) return '-';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(value).toLocaleDateString();
}

function ActiveSessions() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load active sessions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id, current) => {
    if (current) {
      // Revoking the current session is effectively logging out here.
      await logout();
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast.success('Session revoked');
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not revoke session'));
    } finally {
      setBusy(false);
    }
  };

  const logoutEverywhere = async () => {
    setBusy(true);
    try {
      await api.post('/auth/logout-all');
      toast.success('Logged out from all devices');
      await logout();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not log out from all devices'));
      setBusy(false);
    }
  };

  return (
    <div className="data-table-card" style={{ marginBottom: '24px' }}>
      <div
        style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Active Sessions</h3>
        {sessions.length > 0 && (
          <Button variant="secondary" size="sm" onClick={logoutEverywhere} disabled={busy}>
            <LogOut size={14} style={{ marginRight: '6px' }} />
            Log out all devices
          </Button>
        )}
      </div>
      <div style={{ padding: '24px' }}>
        {loading ? (
          <Loader message="Loading sessions..." />
        ) : sessions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No active sessions.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Monitor size={20} style={{ color: 'var(--text-tertiary)' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {describeDevice(s.userAgent)}
                      {s.current && (
                        <span
                          className="status-badge active"
                          style={{ marginLeft: '8px', fontSize: '11px' }}
                        >
                          This device
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      IP {s.ip || 'unknown'} · active {timeAgo(s.lastActivity)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => revoke(s.id, s.current)}
                  disabled={busy}
                >
                  {s.current ? 'Log out' : 'Revoke'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActiveSessions;
