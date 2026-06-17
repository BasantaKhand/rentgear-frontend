import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import api from '../services/api';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import { getCategoryMeta, resolveImageUrl } from '../utils/equipmentMeta';
import { getErrorMessage } from '../utils/getErrorMessage';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TAB_STATUSES = {
  all: null,
  active: ['pending', 'approved', 'active'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const MS_DAY = 1000 * 60 * 60 * 24;

function shortId(id) {
  return `#BK-${(id || '').slice(-4).toUpperCase()}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  const e = new Date(end).toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} - ${e}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Days until (positive) or overdue (negative) the end date, from today
function dueMeta(endDate) {
  const diff = Math.round((startOfDay(endDate) - startOfDay(new Date())) / MS_DAY);
  return {
    daysUntil: diff,
    isOverdue: diff < 0,
    daysOverdue: diff < 0 ? -diff : 0,
    dueSoon: diff >= 0 && diff <= 2,
  };
}

function PaymentIndicator({ payment }) {
  if (!payment) return null;
  if (payment.status === 'completed') return <span className="status-badge completed" style={{ marginTop: '6px' }}>Paid</span>;
  if (payment.status === 'refunded') return <span className="status-badge cancelled" style={{ marginTop: '6px' }}>Refunded</span>;
  if (payment.status === 'pending' && payment.method === 'cash')
    return <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Pay at Pickup</span>;
  return <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Payment {payment.status}</span>;
}

// Return-due indicator shown for active bookings
function ReturnDueIndicator({ booking }) {
  if (booking.status !== 'active') return null;
  const { isOverdue, daysOverdue, dueSoon } = dueMeta(booking.endDate);
  if (isOverdue) {
    return (
      <span className="status-badge cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <AlertTriangle size={12} /> {daysOverdue}d overdue
      </span>
    );
  }
  if (dueSoon) {
    return (
      <span className="status-badge pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={12} /> Due {formatDate(booking.endDate)}
      </span>
    );
  }
  return (
    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
      Due {formatDate(booking.endDate)}
    </span>
  );
}

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [detail, setDetail] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Return info modal
  const [returnInfo, setReturnInfo] = useState(null);
  const [returnInfoLoading, setReturnInfoLoading] = useState(false);

  // Extension modal
  const [extendTarget, setExtendTarget] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [extending, setExtending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/bookings/my'),
        api.get('/payments/my'),
      ]);
      setBookings(bRes.data.bookings || []);
      const map = {};
      (pRes.data.payments || []).forEach((p) => {
        const bId = p.booking?._id || p.booking;
        if (bId) map[bId] = p;
      });
      setPaymentsByBooking(map);
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

  const filtered = bookings.filter((b) => {
    const statuses = TAB_STATUSES[activeTab];
    return !statuses || statuses.includes(b.status);
  });

  const confirmCancel = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      await api.put(`/bookings/${cancelTarget._id}/cancel`);
      toast.success('Booking cancelled');
      setCancelTarget(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel booking'));
    } finally {
      setCancelling(false);
    }
  };

  const openReturnInfo = async (booking) => {
    setReturnInfo({ booking, data: null });
    setReturnInfoLoading(true);
    try {
      const { data } = await api.get(`/bookings/${booking._id}/return-info`);
      setReturnInfo({ booking, data });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load return info'));
      setReturnInfo(null);
    } finally {
      setReturnInfoLoading(false);
    }
  };

  const openExtend = (booking) => {
    setExtendTarget(booking);
    setNewEndDate('');
  };

  // Extension calculations
  const extInfo = (() => {
    if (!extendTarget || !newEndDate) return null;
    const curEnd = startOfDay(extendTarget.endDate);
    const next = startOfDay(newEndDate);
    if (next <= curEnd) return { invalid: true };
    const additionalDays = Math.ceil((next - curEnd) / MS_DAY);
    const rate = extendTarget.equipment?.dailyRate || 0;
    return { additionalDays, additionalCost: additionalDays * rate };
  })();

  const confirmExtend = async () => {
    if (!extendTarget || extending) return;
    if (!extInfo || extInfo.invalid) {
      toast.error('New end date must be after the current end date');
      return;
    }
    setExtending(true);
    try {
      const { data } = await api.put(`/bookings/${extendTarget._id}/extend`, {
        newEndDate,
      });
      toast.success(`Extended! New total $${data.booking.totalPrice.toFixed(2)}`);
      setExtendTarget(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not extend booking'));
    } finally {
      setExtending(false);
    }
  };

  // min date for extension picker = day after current end
  const minNewEnd = extendTarget
    ? new Date(startOfDay(extendTarget.endDate).getTime() + MS_DAY)
        .toISOString()
        .slice(0, 10)
    : undefined;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>My Bookings</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`btn btn-sm ${activeTab === tab.key ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader message="Loading bookings..." />
      ) : error ? (
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h3>No bookings yet</h3>
          <p>You haven't made any bookings. Browse equipment to get started.</p>
          <Link to="/equipment" className="btn btn-primary">Browse Equipment</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No {activeTab} bookings</h3>
          <p>Try a different filter.</p>
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Equipment</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const payment = paymentsByBooking[b._id];
                const finalTotal = (b.totalPrice || 0) + (b.lateFee || 0);
                return (
                  <tr key={b._id}>
                    <td>{shortId(b._id)}</td>
                    <td>
                      {b.equipment ? (
                        <Link to={`/equipment/${b.equipment._id}`} style={{ color: 'var(--brand-primary)' }}>
                          {b.equipment.name}
                        </Link>
                      ) : 'Equipment'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span>{formatRange(b.startDate, b.endDate)}</span>
                        <ReturnDueIndicator booking={b} />
                      </div>
                    </td>
                    <td>
                      ${finalTotal.toFixed(2)}
                      {b.lateFee > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-error)' }}>
                          incl. ${b.lateFee.toFixed(2)} late fee
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <StatusBadge status={b.status} />
                        <PaymentIndicator payment={payment} />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetail(b)}>View</button>

                        {b.status === 'active' && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openReturnInfo(b)}>Return Info</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openExtend(b)}>Extend</button>
                          </>
                        )}

                        {payment && payment.status === 'completed' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setReceipt({ booking: b, payment })}>Receipt</button>
                        )}

                        {['pending', 'approved'].includes(b.status) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-error)' }}
                            onClick={() => setCancelTarget(b)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>Keep Booking</Button>
            <Button variant="primary" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p>
            Are you sure you want to cancel your booking for{' '}
            <strong>{cancelTarget.equipment?.name}</strong> (
            {formatRange(cancelTarget.startDate, cancelTarget.endDate)})? This cannot be undone.
          </p>
        )}
      </Modal>

      {/* Booking detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? shortId(detail._id) : 'Booking'}>
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '100px', height: '75px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                {resolveImageUrl(detail.equipment?.image) ? (
                  <img src={resolveImageUrl(detail.equipment.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: getCategoryMeta(detail.equipment?.category).gradient }} />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{detail.equipment?.name}</h3>
                <StatusBadge status={detail.status} />
              </div>
            </div>
            <div className="rental-summary">
              <div className="summary-row">
                <span>Dates</span>
                <span>{formatRange(detail.startDate, detail.endDate)}</span>
              </div>
              <div className="summary-row">
                <span>Rental total</span>
                <span>${detail.totalPrice?.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Deposit (refundable)</span>
                <span>${detail.deposit?.toFixed(2)}</span>
              </div>
              {detail.lateFee > 0 && (
                <>
                  <div className="summary-row" style={{ color: 'var(--accent-error)' }}>
                    <span>Late fee</span>
                    <span>+${detail.lateFee.toFixed(2)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Final amount</span>
                    <span>${(detail.totalPrice + detail.lateFee).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal isOpen={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt">
        {receipt && (
          <div className="rental-summary">
            <div className="summary-row"><span>Payment ID</span><span>{receipt.payment._id}</span></div>
            <div className="summary-row"><span>Booking reference</span><span>{shortId(receipt.booking._id)}</span></div>
            <div className="summary-row"><span>Method</span><span style={{ textTransform: 'capitalize' }}>{receipt.payment.method}</span></div>
            <div className="summary-row"><span>Transaction ID</span><span>{receipt.payment.transactionId || '—'}</span></div>
            <div className="summary-row"><span>Date</span><span>{formatDateTime(receipt.payment.createdAt)}</span></div>
            <div className="summary-row total"><span>Amount paid</span><span>${receipt.payment.amount?.toFixed(2)}</span></div>
          </div>
        )}
      </Modal>

      {/* Return info + instructions modal */}
      <Modal
        isOpen={!!returnInfo}
        onClose={() => setReturnInfo(null)}
        title="Return Information"
      >
        {returnInfoLoading || !returnInfo?.data ? (
          <Loader message="Loading return info..." />
        ) : (
          <div>
            <div className="rental-summary" style={{ marginBottom: '20px' }}>
              <div className="summary-row">
                <span>Return due date</span>
                <span>{formatDate(returnInfo.data.dueDate)}</span>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <span style={{ color: returnInfo.data.isOverdue ? 'var(--accent-error)' : 'var(--accent-success)' }}>
                  {returnInfo.data.isOverdue ? `Overdue by ${returnInfo.data.daysOverdue} day(s)` : 'On time'}
                </span>
              </div>
              {returnInfo.data.isOverdue && (
                <div className="summary-row total" style={{ color: 'var(--accent-error)' }}>
                  <span>Late fee</span>
                  <span>${returnInfo.data.lateFee.toFixed(2)}</span>
                </div>
              )}
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Return Instructions
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {returnInfo.data.returnInstructions.location}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              Hours: {returnInfo.data.returnInstructions.hours}
            </p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {returnInfo.data.returnInstructions.conditionRequirements.map((c, i) => (
                <li key={`c${i}`}>{c}</li>
              ))}
              {returnInfo.data.returnInstructions.checklist.map((c, i) => (
                <li key={`k${i}`}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {/* Extension modal */}
      <Modal
        isOpen={!!extendTarget}
        onClose={() => setExtendTarget(null)}
        title="Request Extension"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExtendTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmExtend} disabled={extending || !extInfo || extInfo.invalid}>
              {extending ? 'Extending...' : 'Confirm Extension'}
            </Button>
          </>
        }
      >
        {extendTarget && (
          <div>
            <div className="rental-summary" style={{ marginBottom: '16px' }}>
              <div className="summary-row">
                <span>Equipment</span>
                <span>{extendTarget.equipment?.name}</span>
              </div>
              <div className="summary-row">
                <span>Current end date</span>
                <span>{formatDate(extendTarget.endDate)}</span>
              </div>
            </div>
            <div className="form-group">
              <label>New End Date</label>
              <input
                type="date"
                className="form-input"
                value={newEndDate}
                min={minNewEnd}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
            {extInfo && !extInfo.invalid && (
              <div className="rental-summary">
                <div className="summary-row">
                  <span>Additional days</span>
                  <span>{extInfo.additionalDays}</span>
                </div>
                <div className="summary-row total">
                  <span>Additional cost</span>
                  <span>${extInfo.additionalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
            {extInfo && extInfo.invalid && (
              <p style={{ color: 'var(--accent-error)', fontSize: '13px' }}>
                New end date must be after the current end date.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyBookings;
