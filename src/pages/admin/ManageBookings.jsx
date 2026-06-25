import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { getCategoryMeta, resolveImageUrl } from '../../utils/equipmentMeta';
import { getErrorMessage } from '../../utils/getErrorMessage';

const TABS = ['all', 'pending', 'approved', 'active', 'completed', 'cancelled'];
const MS_DAY = 1000 * 60 * 60 * 24;
const PAGE_SIZE = 10;

const shortId = (id) => `#BK-${(id || '').slice(-4).toUpperCase()}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysBetween = (a, b) => Math.max(Math.round((new Date(b) - new Date(a)) / MS_DAY), 1);
const initials = (name) => {
  if (!name) return 'U';
  const p = name.trim().split(' ');
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

function ManageBookings() {
  const [all, setAll] = useState([]);
  const [overdueMap, setOverdueMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Action modals
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pickupTarget, setPickupTarget] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [lateFeeTarget, setLateFeeTarget] = useState(null);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailPayment, setDetailPayment] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, ovRes] = await Promise.all([
        api.get('/admin/bookings', { params: { limit: 200, sort: 'newest' } }),
        api.get('/admin/bookings/overdue'),
      ]);
      setAll(listRes.data.bookings || []);
      const map = {};
      (ovRes.data.overdue || []).forEach((o) => {
        map[o.booking._id] = { daysOverdue: o.daysOverdue, lateFee: o.lateFee };
      });
      setOverdueMap(map);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load bookings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const c = { all: all.length };
    TABS.slice(1).forEach((s) => {
      c[s] = all.filter((b) => b.status === s).length;
    });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab !== 'all') list = list.filter((b) => b.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.user?.name?.toLowerCase().includes(q) ||
          b.equipment?.name?.toLowerCase().includes(q) ||
          shortId(b._id).toLowerCase().includes(q)
      );
    }
    if (fromDate) list = list.filter((b) => new Date(b.startDate) >= new Date(fromDate));
    if (toDate) list = list.filter((b) => new Date(b.endDate) <= new Date(toDate));

    if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'amount') list.sort((a, b) => b.totalPrice - a.totalPrice);
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [all, tab, search, fromDate, toDate, sort]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const overdueCount = Object.keys(overdueMap).length;

  // --- Actions ---
  const doAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      await loadData();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Action failed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const approve = (b) =>
    doAction(() => api.put(`/admin/bookings/${b._id}/approve`), 'Booking approved');

  const confirmReject = async () => {
    const ok = await doAction(
      () => api.put(`/admin/bookings/${rejectTarget._id}/reject`, { reason: rejectReason }),
      'Booking rejected'
    );
    if (ok) {
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const confirmPickup = async () => {
    const ok = await doAction(
      () => api.put(`/admin/bookings/${pickupTarget._id}/pickup`),
      'Marked as picked up'
    );
    if (ok) setPickupTarget(null);
  };

  const confirmReturn = async () => {
    const ok = await doAction(
      () => api.put(`/admin/bookings/${returnTarget._id}/return`),
      'Marked as returned'
    );
    if (ok) setReturnTarget(null);
  };

  const openLateFee = (b) => {
    setLateFeeTarget(b);
    setLateFeeAmount(String(overdueMap[b._id]?.lateFee ?? b.lateFee ?? 0));
  };
  const confirmLateFee = async () => {
    const ok = await doAction(
      () => api.put(`/admin/bookings/${lateFeeTarget._id}/late-fee`, { amount: Number(lateFeeAmount) }),
      'Late fee applied'
    );
    if (ok) setLateFeeTarget(null);
  };

  const openDetail = async (b) => {
    setDetail(b);
    setDetailPayment(null);
    try {
      const { data } = await api.get(`/payments/${b._id}`);
      setDetailPayment(data.payment);
    } catch {
      setDetailPayment(null);
    }
  };

  const rowActions = (b) => {
    const isOverdue = !!overdueMap[b._id];
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(b)}>View</button>
        {b.status === 'pending' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-success)' }} onClick={() => approve(b)}>Approve</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-error)' }} onClick={() => setRejectTarget(b)}>Reject</button>
          </>
        )}
        {b.status === 'approved' && (
          <button className="btn btn-ghost btn-sm" onClick={() => setPickupTarget(b)}>Mark Picked Up</button>
        )}
        {b.status === 'active' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setReturnTarget(b)}>Mark Returned</button>
            {isOverdue && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-warning)' }} onClick={() => openLateFee(b)}>Late Fee</button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">Manage Bookings</h1>
        </div>

        {/* Overdue banner */}
        {overdueCount > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
              background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '20px',
            }}
          >
            <AlertTriangle size={18} />
            <span>{overdueCount} booking(s) overdue.</span>
            <button className="btn btn-sm" style={{ color: '#991b1b', textDecoration: 'underline' }} onClick={() => { setTab('active'); setPage(1); }}>
              View active
            </button>
          </div>
        )}

        {loading ? (
          <Loader message="Loading bookings..." />
        ) : error ? (
          <div className="empty-state">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadData}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`btn btn-sm ${tab === t ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => { setTab(t); setPage(1); }}
                  style={{ textTransform: 'capitalize', ...(t === 'pending' && counts.pending > 0 ? { color: 'var(--accent-warning)' } : {}) }}
                >
                  {t} <span style={{ opacity: 0.7 }}>({counts[t] || 0})</span>
                </button>
              ))}
            </div>

            {/* Search + filters */}
            <div className="data-table-card">
              <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Search id / customer / equipment..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{ padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '14px' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} title="From start date"
                    style={{ padding: '8px 10px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }} />
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} title="To end date"
                    style={{ padding: '8px 10px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }} />
                  <select value={sort} onChange={(e) => setSort(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Equipment</th>
                    <th>Dates</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No bookings found</td></tr>
                  ) : (
                    pageItems.map((b) => {
                      const meta = getCategoryMeta(b.equipment?.category);
                      const img = resolveImageUrl(b.equipment?.image);
                      return (
                        <tr key={b._id}>
                          <td>{shortId(b._id)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{initials(b.user?.name)}</div>
                              {b.user?.name || 'Unknown'}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '36px', height: '28px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: meta.gradient }} />}
                              </div>
                              {b.equipment ? (
                                <Link to={`/equipment/${b.equipment._id}`} style={{ color: 'var(--brand-primary)' }}>{b.equipment.name}</Link>
                              ) : 'Equipment'}
                            </div>
                          </td>
                          <td>
                            {fmtDate(b.startDate)} - {fmtDate(b.endDate)}
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{daysBetween(b.startDate, b.endDate)} days</div>
                          </td>
                          <td>
                            ${((b.totalPrice || 0) + (b.lateFee || 0)).toFixed(2)}
                            {b.lateFee > 0 && <div style={{ fontSize: '11px', color: 'var(--accent-error)' }}>+${b.lateFee.toFixed(2)} late</div>}
                          </td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>{rowActions(b)}</td>
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

      {/* Reject modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmReject} disabled={busy}>Reject</Button>
          </>
        }
      >
        {rejectTarget && (
          <div>
            <p style={{ marginBottom: '12px' }}>Reject booking {shortId(rejectTarget._id)} for <strong>{rejectTarget.user?.name}</strong>?</p>
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea className="form-input" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Shown to the customer" />
            </div>
          </div>
        )}
      </Modal>

      {/* Pickup modal */}
      <Modal
        isOpen={!!pickupTarget}
        onClose={() => setPickupTarget(null)}
        title="Mark Picked Up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickupTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmPickup} disabled={busy}>Confirm</Button>
          </>
        }
      >
        {pickupTarget && <p>Confirm that {shortId(pickupTarget._id)} ({pickupTarget.equipment?.name}) has been picked up? This activates the rental.</p>}
      </Modal>

      {/* Return modal */}
      <Modal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        title="Mark Returned"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmReturn} disabled={busy}>Confirm Return</Button>
          </>
        }
      >
        {returnTarget && (
          <div>
            <p style={{ marginBottom: '12px' }}>Confirm return of {shortId(returnTarget._id)} ({returnTarget.equipment?.name})?</p>
            {overdueMap[returnTarget._id] ? (
              <div className="rental-summary">
                <div className="summary-row" style={{ color: 'var(--accent-error)' }}>
                  <span>Overdue by</span><span>{overdueMap[returnTarget._id].daysOverdue} day(s)</span>
                </div>
                <div className="summary-row total" style={{ color: 'var(--accent-error)' }}>
                  <span>Late fee to apply</span><span>${overdueMap[returnTarget._id].lateFee.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--accent-success)', fontSize: '14px' }}>On time — no late fee.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Late fee modal */}
      <Modal
        isOpen={!!lateFeeTarget}
        onClose={() => setLateFeeTarget(null)}
        title="Apply Late Fee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLateFeeTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmLateFee} disabled={busy}>Apply</Button>
          </>
        }
      >
        {lateFeeTarget && (
          <div>
            {overdueMap[lateFeeTarget._id] && (
              <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Calculated: {overdueMap[lateFeeTarget._id].daysOverdue} day(s) overdue = ${overdueMap[lateFeeTarget._id].lateFee.toFixed(2)}
              </p>
            )}
            <div className="form-group">
              <label>Late fee amount ($)</label>
              <input type="number" className="form-input" value={lateFeeAmount} onChange={(e) => setLateFeeAmount(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? shortId(detail._id) : 'Booking'}>
        {detail && (
          <div>
            <div className="rental-summary" style={{ marginBottom: '16px' }}>
              <div className="summary-row"><span>Customer</span><span>{detail.user?.name} ({detail.user?.email})</span></div>
              <div className="summary-row"><span>Equipment</span><span>{detail.equipment?.name}</span></div>
              <div className="summary-row"><span>Dates</span><span>{fmtDate(detail.startDate)} - {fmtDate(detail.endDate)}</span></div>
              <div className="summary-row"><span>Status</span><span><StatusBadge status={detail.status} /></span></div>
              <div className="summary-row"><span>Rental total</span><span>${detail.totalPrice?.toFixed(2)}</span></div>
              {detail.lateFee > 0 && <div className="summary-row" style={{ color: 'var(--accent-error)' }}><span>Late fee</span><span>+${detail.lateFee.toFixed(2)}</span></div>}
              {detailPayment && (
                <div className="summary-row"><span>Payment</span><span style={{ textTransform: 'capitalize' }}>{detailPayment.status} ({detailPayment.method})</span></div>
              )}
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Timeline</h4>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Booked: {fmtDate(detail.createdAt)}</li>
              {['approved', 'active', 'completed'].includes(detail.status) && <li>Approved</li>}
              <li>Picked up: {fmtDate(detail.pickedUpAt)}</li>
              <li>Return due: {fmtDate(detail.endDate)}</li>
              <li>Returned: {fmtDate(detail.returnedAt)}</li>
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ManageBookings;
