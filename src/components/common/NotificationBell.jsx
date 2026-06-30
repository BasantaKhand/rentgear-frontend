import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../../services/api';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnread(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 15 } });
      setItems(data.notifications || []);
    } catch {
      /* ignore */
    }
  }, []);

  // Poll the unread count
  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const openItem = async (n) => {
    if (!n.read) {
      try {
        await api.put(`/notifications/${n._id}/read`);
        setUnread((u) => Math.max(u - 1, 0));
        setItems((list) => list.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnread(0);
      setItems((list) => list.map((i) => ({ ...i, read: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="cart-btn" onClick={toggle} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="cart-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '340px',
            maxHeight: '420px',
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <strong style={{ fontSize: '14px' }}>Notifications</strong>
            {items.some((i) => !i.read) && (
              <button
                onClick={markAll}
                style={{ fontSize: '12px', color: 'var(--brand-primary)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No notifications
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n._id}
                onClick={() => openItem(n)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'var(--bg-hover)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{n.title}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                {n.message && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {n.message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
