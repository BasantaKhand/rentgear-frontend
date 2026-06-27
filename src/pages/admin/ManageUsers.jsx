import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { resolveImageUrl } from '../../utils/equipmentMeta';
import { getErrorMessage } from '../../utils/getErrorMessage';

const TABS = [
  { key: 'all', label: 'All Users' },
  { key: 'verified', label: 'Verified' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'disabled', label: 'Disabled' },
];
const PAGE_SIZE = 10;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const shortBk = (id) => `#BK-${(id || '').slice(-4).toUpperCase()}`;
const initials = (name) => {
  if (!name) return 'U';
  const p = name.trim().split(' ');
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

function userStatus(u) {
  if (u.isActive === false) return { label: 'Disabled', cls: 'cancelled' };
  if (u.verified) return { label: 'Verified', cls: 'active' };
  return { label: 'Unverified', cls: 'pending' };
}

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState(null); // { user, stats }
  const [idDocUser, setIdDocUser] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [bookingsUser, setBookingsUser] = useState(null);
  const [userBookings, setUserBookings] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { limit: 200 } });
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(
    () => ({
      all: users.length,
      verified: users.filter((u) => u.verified && u.isActive !== false).length,
      unverified: users.filter((u) => !u.verified && u.isActive !== false).length,
      disabled: users.filter((u) => u.isActive === false).length,
    }),
    [users]
  );

  const unverifiedWithId = users.filter((u) => !u.verified && u.idDocument).length;

  const filtered = useMemo(() => {
    let list = [...users];
    if (tab === 'verified') list = list.filter((u) => u.verified && u.isActive !== false);
    else if (tab === 'unverified') list = list.filter((u) => !u.verified && u.isActive !== false);
    else if (tab === 'disabled') list = list.filter((u) => u.isActive === false);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, tab, search]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // --- Actions ---
  const openDetail = async (u) => {
    setDetail({ user: u, stats: null });
    try {
      const { data } = await api.get(`/admin/users/${u._id}`);
      setDetail({ user: data.user, stats: data.stats });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load user'));
    }
  };

  const doVerify = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/users/${verifyTarget._id}/verify`);
      toast.success('User verified');
      setVerifyTarget(null);
      setIdDocUser(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not verify user'));
    } finally {
      setBusy(false);
    }
  };

  const doDisable = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/admin/users/${disableTarget._id}/disable`);
      toast.success(data.isActive ? 'User enabled' : 'User disabled');
      setDisableTarget(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update user'));
    } finally {
      setBusy(false);
    }
  };

  const openBookings = async (u) => {
    setBookingsUser(u);
    setUserBookings(null);
    try {
      const { data } = await api.get(`/admin/users/${u._id}/bookings`);
      setUserBookings(data.bookings || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load bookings'));
      setUserBookings([]);
    }
  };

  const idDocUrl = idDocUser ? resolveImageUrl(idDocUser.idDocument) : null;
  const isPdf = idDocUrl && idDocUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">Manage Users</h1>
        </div>

        {unverifiedWithId > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#fef3c7', color: '#92400e', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            <ShieldCheck size={18} />
            <span>{unverifiedWithId} user(s) awaiting verification.</span>
            <button className="btn btn-sm" style={{ color: '#92400e', textDecoration: 'underline' }} onClick={() => { setTab('unverified'); setPage(1); }}>
              Review
            </button>
          </div>
        )}

        {loading ? (
          <Loader message="Loading users..." />
        ) : error ? (
          <div className="empty-state">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadData}>Retry</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => { setTab(t.key); setPage(1); }}>
                  {t.label} <span style={{ opacity: 0.7 }}>({counts[t.key] || 0})</span>
                </button>
              ))}
            </div>

            <div className="data-table-card">
              <div className="table-header">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{ padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '14px', width: '280px' }}
                />
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No users found</td></tr>
                  ) : (
                    pageItems.map((u) => {
                      const st = userStatus(u);
                      return (
                        <tr key={u._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{initials(u.name)}</div>
                              {u.name}
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td>{u.phone || '—'}</td>
                          <td><span className={`status-badge ${u.role === 'admin' ? 'completed' : ''}`}>{u.role}</span></td>
                          <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                          <td>{fmtDate(u.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openDetail(u)}>Details</button>
                              {u.idDocument && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setIdDocUser(u)}>ID</button>
                              )}
                              {!u.verified && u.idDocument && (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-success)' }} onClick={() => setVerifyTarget(u)}>Verify</button>
                              )}
                              <button className="btn btn-ghost btn-sm" onClick={() => openBookings(u)}>Bookings</button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: u.isActive === false ? 'var(--accent-success)' : 'var(--accent-error)' }}
                                onClick={() => setDisableTarget(u)}
                              >
                                {u.isActive === false ? 'Enable' : 'Disable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="pagination" style={{ padding: '16px' }}>
                <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>←</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`pagination-btn ${p === currentPage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>→</button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.user?.name || 'User'}>
        {detail && (
          <div className="rental-summary">
            <div className="summary-row"><span>Email</span><span>{detail.user.email}</span></div>
            <div className="summary-row"><span>Phone</span><span>{detail.user.phone || '—'}</span></div>
            <div className="summary-row"><span>Address</span><span>{detail.user.address || '—'}</span></div>
            <div className="summary-row"><span>Role</span><span style={{ textTransform: 'capitalize' }}>{detail.user.role}</span></div>
            <div className="summary-row"><span>Verified</span><span>{detail.user.verified ? 'Yes' : 'No'}</span></div>
            <div className="summary-row"><span>Registered</span><span>{fmtDate(detail.user.createdAt)}</span></div>
            {detail.stats ? (
              <>
                <div className="summary-row"><span>Total bookings</span><span>{detail.stats.totalBookings}</span></div>
                <div className="summary-row total"><span>Total spent</span><span>${detail.stats.totalSpent?.toFixed(2)}</span></div>
              </>
            ) : (
              <div className="summary-row"><span>Stats</span><span>Loading...</span></div>
            )}
          </div>
        )}
      </Modal>

      {/* ID document modal */}
      <Modal
        isOpen={!!idDocUser}
        onClose={() => setIdDocUser(null)}
        title={idDocUser ? `ID Document - ${idDocUser.name}` : 'ID Document'}
        footer={
          idDocUser && !idDocUser.verified ? (
            <>
              <Button variant="secondary" onClick={() => setIdDocUser(null)}>Close</Button>
              <Button variant="primary" onClick={() => setVerifyTarget(idDocUser)}>Approve &amp; Verify</Button>
            </>
          ) : null
        }
      >
        {idDocUrl ? (
          isPdf ? (
            <iframe title="ID document" src={idDocUrl} style={{ width: '100%', height: '400px', border: 'none' }} />
          ) : (
            <img src={idDocUrl} alt="ID document" style={{ width: '100%', borderRadius: '8px' }} />
          )
        ) : (
          <p>No document available.</p>
        )}
      </Modal>

      {/* Verify confirm */}
      <Modal
        isOpen={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title="Verify User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={doVerify} disabled={busy}>Verify</Button>
          </>
        }
      >
        {verifyTarget && <p>Verify <strong>{verifyTarget.name}</strong>? They will be able to complete bookings and receive a confirmation email.</p>}
      </Modal>

      {/* Disable confirm */}
      <Modal
        isOpen={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        title={disableTarget?.isActive === false ? 'Enable User' : 'Disable User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisableTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={doDisable} disabled={busy}>
              {disableTarget?.isActive === false ? 'Enable' : 'Disable'}
            </Button>
          </>
        }
      >
        {disableTarget && (
          disableTarget.isActive === false ? (
            <p>Re-enable <strong>{disableTarget.name}</strong>? They will be able to log in again.</p>
          ) : (
            <p style={{ color: 'var(--accent-error)' }}>
              Disable <strong>{disableTarget.name}</strong>? They will be logged out and unable to sign in. Their pending bookings will be cancelled.
            </p>
          )
        )}
      </Modal>

      {/* User bookings modal */}
      <Modal isOpen={!!bookingsUser} onClose={() => { setBookingsUser(null); setUserBookings(null); }} title={bookingsUser ? `Bookings - ${bookingsUser.name}` : 'Bookings'}>
        {userBookings === null ? (
          <Loader message="Loading bookings..." />
        ) : userBookings.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No bookings yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Equipment</th><th>Dates</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {userBookings.map((b) => (
                <tr key={b._id}>
                  <td>{shortBk(b._id)}</td>
                  <td>{b.equipment?.name || '—'}</td>
                  <td>{fmtDate(b.startDate)} - {fmtDate(b.endDate)}</td>
                  <td>${b.totalPrice?.toFixed(2)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}

export default ManageUsers;
