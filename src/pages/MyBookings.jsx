import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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

function shortId(id) {
  return `#BK-${(id || '').slice(-4).toUpperCase()}`;
}

function formatRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  const e = new Date(end).toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} - ${e}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Small payment indicator shown under the booking status
function PaymentIndicator({ payment }) {
  if (!payment) return null;
  if (payment.status === 'completed') {
    return (
      <span className="status-badge completed" style={{ marginTop: '6px' }}>
        Paid
      </span>
    );
  }
  if (payment.status === 'refunded') {
    return (
      <span className="status-badge cancelled" style={{ marginTop: '6px' }}>
        Refunded
      </span>
    );
  }
  if (payment.status === 'pending' && payment.method === 'cash') {
    return (
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
        Pay at Pickup
      </span>
    );
  }
  return (
    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
      Payment {payment.status}
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
  const [receipt, setReceipt] = useState(null); // { booking, payment }
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

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
          <Link to="/equipment" className="btn btn-primary">
            Browse Equipment
          </Link>
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
                return (
                  <tr key={b._id}>
                    <td>{shortId(b._id)}</td>
                    <td>
                      {b.equipment ? (
                        <Link to={`/equipment/${b.equipment._id}`} style={{ color: 'var(--brand-primary)' }}>
                          {b.equipment.name}
                        </Link>
                      ) : (
                        'Equipment'
                      )}
                    </td>
                    <td>{formatRange(b.startDate, b.endDate)}</td>
                    <td>${b.totalPrice?.toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <StatusBadge status={b.status} />
                        <PaymentIndicator payment={payment} />
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetail(b)}>
                        View
                      </button>
                      {payment && payment.status === 'completed' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setReceipt({ booking: b, payment })}
                        >
                          Receipt
                        </button>
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
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Keep Booking
            </Button>
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
            {formatRange(cancelTarget.startDate, cancelTarget.endDate)})? This
            cannot be undone.
          </p>
        )}
      </Modal>

      {/* Booking detail modal */}
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? shortId(detail._id) : 'Booking'}
      >
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
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  {detail.equipment?.name}
                </h3>
                <StatusBadge status={detail.status} />
              </div>
            </div>
            <div className="rental-summary">
              <div className="summary-row">
                <span>Dates</span>
                <span>{formatRange(detail.startDate, detail.endDate)}</span>
              </div>
              <div className="summary-row">
                <span>Total price</span>
                <span>${detail.totalPrice?.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Deposit (refundable)</span>
                <span>${detail.deposit?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title="Payment Receipt"
      >
        {receipt && (
          <div className="rental-summary">
            <div className="summary-row">
              <span>Payment ID</span>
              <span>{receipt.payment._id}</span>
            </div>
            <div className="summary-row">
              <span>Booking reference</span>
              <span>{shortId(receipt.booking._id)}</span>
            </div>
            <div className="summary-row">
              <span>Method</span>
              <span style={{ textTransform: 'capitalize' }}>{receipt.payment.method}</span>
            </div>
            <div className="summary-row">
              <span>Transaction ID</span>
              <span>{receipt.payment.transactionId || '—'}</span>
            </div>
            <div className="summary-row">
              <span>Date</span>
              <span>{formatDateTime(receipt.payment.createdAt)}</span>
            </div>
            <div className="summary-row total">
              <span>Amount paid</span>
              <span>${receipt.payment.amount?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyBookings;
