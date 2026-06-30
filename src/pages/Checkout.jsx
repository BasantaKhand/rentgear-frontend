import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, UploadCloud } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getCategoryMeta, resolveImageUrl } from '../utils/equipmentMeta';
import { getErrorMessage } from '../utils/getErrorMessage';

// --- Card input formatters ---
const formatCardNumber = (v) =>
  v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatCvv = (v) => v.replace(/\D/g, '').slice(0, 3);

function Checkout() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const {
    items,
    getSubtotal,
    getServiceFee,
    getDeposit,
    getTotal,
    clearCart,
  } = useCart();

  const fileInputRef = useRef(null);

  const [contact, setContact] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // { bookings, payments, method }

  const handleContactChange = (e) =>
    setContact((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === 'number') formatted = formatCardNumber(value);
    else if (name === 'expiry') formatted = formatExpiry(value);
    else if (name === 'cvv') formatted = formatCvv(value);
    setCard((p) => ({ ...p, [name]: formatted }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be 5MB or smaller');
      return;
    }
    const formData = new FormData();
    formData.append('idDocument', file);
    setUploading(true);
    try {
      const { data } = await api.post('/users/upload-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ ...user, idDocument: data.idDocument });
      toast.success('ID document uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const validateCard = () => {
    if (card.number.replace(/\s/g, '').length !== 16) {
      toast.error('Enter a valid 16-digit card number');
      return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
      toast.error('Enter expiry as MM/YY');
      return false;
    }
    if (card.cvv.length !== 3) {
      toast.error('Enter a valid 3-digit CVV');
      return false;
    }
    if (!card.name.trim()) {
      toast.error('Enter the cardholder name');
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (submitting) return;

    if (!contact.name || !contact.email || !contact.phone || !contact.address) {
      toast.error('Please fill in all contact fields');
      return;
    }
    if (!user?.idDocument) {
      toast.error('Please upload your ID document to continue');
      return;
    }
    if (paymentMethod === 'card' && !validateCard()) {
      return;
    }

    const payloadItems = items.map((it) => ({
      equipmentId: it.equipmentId,
      startDate: it.startDate,
      endDate: it.endDate,
    }));

    setSubmitting(true);
    try {
      // Simulate card payment processing time for a realistic UX
      if (paymentMethod === 'card') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      // Backend creates bookings AND a payment per booking for the given method
      const { data } = await api.post('/bookings/checkout', {
        items: payloadItems,
        paymentMethod,
      });
      // Only clear the cart once everything succeeded
      clearCart();
      setConfirmation({
        bookings: data.bookings || [],
        payments: data.payments || [],
        method: paymentMethod,
      });
      toast.success('Booking confirmed!');
    } catch (err) {
      // Cart is preserved so the user can retry
      toast.error(getErrorMessage(err, 'Could not complete booking'));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !confirmation) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some equipment before checking out.</p>
          <Link to="/equipment" className="btn btn-primary">
            Browse Equipment
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = confirmation
    ? confirmation.payments[0]?.status ||
      (confirmation.method === 'card' ? 'completed' : 'pending')
    : null;
  const confirmationTotal = confirmation
    ? confirmation.payments.reduce((s, p) => s + (p.amount || 0), 0)
    : 0;

  return (
    <div className="main-content">
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>
        Checkout
      </h1>

      <div className="cart-page">
        <div>
          {/* Contact Information */}
          <div className="data-table-card" style={{ marginBottom: '24px' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Contact Information</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-input" name="name" value={contact.name} onChange={handleContactChange} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-input" name="email" type="email" value={contact.email} onChange={handleContactChange} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input className="form-input" name="phone" value={contact.phone} onChange={handleContactChange} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input className="form-input" name="address" value={contact.address} onChange={handleContactChange} placeholder="Pickup address" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="data-table-card" style={{ marginBottom: '24px' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Payment Method</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#1a1f71', color: 'white' }}>VISA</span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#eb001b', color: 'white' }}>MC</span>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label
                  className="filter-option"
                  style={{
                    padding: '16px',
                    border: `1.5px solid ${paymentMethod === 'card' ? 'var(--brand-primary)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: paymentMethod === 'card' ? 'var(--brand-light)' : 'transparent',
                  }}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} style={{ display: 'none' }} />
                  <span style={{ fontWeight: 500 }}>💳 Credit / Debit Card</span>
                </label>
                <label
                  className="filter-option"
                  style={{
                    padding: '16px',
                    border: `1.5px solid ${paymentMethod === 'cash' ? 'var(--brand-primary)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: paymentMethod === 'cash' ? 'var(--brand-light)' : 'transparent',
                  }}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} style={{ display: 'none' }} />
                  <span>💵 Pay at Pickup (Cash)</span>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Cardholder Name</label>
                    <input className="form-input" name="name" placeholder="Name on card" value={card.name} onChange={handleCardChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Card Number</label>
                    <input className="form-input" name="number" placeholder="1234 5678 9012 3456" value={card.number} onChange={handleCardChange} inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input className="form-input" name="expiry" placeholder="MM/YY" value={card.expiry} onChange={handleCardChange} inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input className="form-input" name="cvv" placeholder="123" value={card.cvv} onChange={handleCardChange} inputMode="numeric" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ID Verification */}
          <div className="data-table-card">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>ID Verification</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {user?.idDocument ? (
                <span className="status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} /> ID Verified
                </span>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Please upload a valid government ID to proceed.
                  </p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      padding: '40px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-tertiary)' }}>
                      <UploadCloud size={32} />
                    </div>
                    <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                      {uploading ? 'Uploading...' : 'Click to upload your ID'}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      JPG, JPEG, PNG or PDF up to 5MB
                    </p>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          {items.map((item) => {
            const meta = getCategoryMeta(item.equipment.category);
            const imageUrl = resolveImageUrl(item.equipment.image);
            return (
              <div key={item.equipmentId} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: '60px', height: '45px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.equipment.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: meta.gradient }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.equipment.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{item.days} {item.days === 1 ? 'day' : 'days'}</div>
                </div>
                <div style={{ fontWeight: 500 }}>${item.price.toFixed(2)}</div>
              </div>
            );
          })}
          <div className="summary-row" style={{ marginTop: '16px' }}>
            <span>Subtotal</span>
            <span>${getSubtotal().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Service fee</span>
            <span>${getServiceFee().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Deposit (refundable)</span>
            <span>${getDeposit().toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${getTotal().toFixed(2)}</span>
          </div>
          <Button variant="primary" style={{ width: '100%', marginTop: '20px' }} onClick={handleComplete} disabled={submitting}>
            {submitting ? 'Processing...' : 'Complete Booking'}
          </Button>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '12px' }}>
            By completing this booking, you agree to our Terms of Service and Rental Agreement.
          </p>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={!!confirmation}
        onClose={() => navigate('/my-bookings')}
        title="Booking Confirmed"
        footer={
          <Button variant="primary" onClick={() => navigate('/my-bookings')}>
            View My Bookings
          </Button>
        }
      >
        {confirmation && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--accent-success)' }}>
                <CheckCircle size={48} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Thank you!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {confirmation.bookings.length}{' '}
                {confirmation.bookings.length === 1 ? 'booking' : 'bookings'} created.
              </p>
            </div>
            <div className="rental-summary">
              <div className="summary-row">
                <span>Payment method</span>
                <span style={{ textTransform: 'capitalize' }}>{confirmation.method}</span>
              </div>
              <div className="summary-row">
                <span>Payment status</span>
                <span>
                  <span className={`status-badge ${paymentStatus}`}>
                    {paymentStatus === 'completed' ? 'Paid' : 'Pay at Pickup'}
                  </span>
                </span>
              </div>
              <div className="summary-row total">
                <span>Amount</span>
                <span>${confirmationTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Checkout;
