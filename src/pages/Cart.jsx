import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getCategoryMeta, resolveImageUrl } from '../utils/equipmentMeta';

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start);
  const e = new Date(end);
  const startStr = s.toLocaleDateString('en-US', opts);
  const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function Cart() {
  const navigate = useNavigate();
  const {
    items,
    removeFromCart,
    updateDates,
    getSubtotal,
    getServiceFee,
    getDeposit,
    getTotal,
  } = useCart();

  const [editing, setEditing] = useState(null); // item being edited
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  const openEdit = (item) => {
    setEditing(item);
    setDraftStart(item.startDate);
    setDraftEnd(item.endDate);
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!draftStart || !draftEnd || new Date(draftEnd) <= new Date(draftStart)) {
      toast.error('Please select a valid date range');
      return;
    }
    updateDates(editing.equipmentId, draftStart, draftEnd);
    toast.success('Dates updated');
    closeEdit();
  };

  const handleRemove = (item) => {
    if (window.confirm(`Remove "${item.equipment.name}" from your cart?`)) {
      removeFromCart(item.equipmentId);
      toast.success('Removed from cart');
    }
  };

  if (items.length === 0) {
    return (
      <div className="main-content">
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>
          Your Cart
        </h1>
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShoppingCart size={32} />
          </div>
          <h3>Your cart is empty</h3>
          <p>Browse our equipment and add items to get started.</p>
          <Link to="/equipment" className="btn btn-primary">
            Browse Equipment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>
        Your Cart
      </h1>

      <div className="cart-page">
        {/* Items */}
        <div className="cart-items">
          {items.map((item) => {
            const meta = getCategoryMeta(item.equipment.category);
            const imageUrl = resolveImageUrl(item.equipment.image);
            return (
              <div className="cart-item" key={item.equipmentId}>
                <div className="cart-item-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.equipment.name} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: meta.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '32px',
                      }}
                    >
                      {meta.icon}
                    </div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h3 className="cart-item-title">{item.equipment.name}</h3>
                  <div className="cart-item-dates">
                    {formatDateRange(item.startDate, item.endDate)} ({item.days}{' '}
                    {item.days === 1 ? 'day' : 'days'})
                  </div>
                  <div className="cart-item-price">${item.price.toFixed(2)}</div>
                </div>
                <div className="cart-item-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-error)' }}
                    onClick={() => handleRemove(item)}
                  >
                    Remove
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEdit(item)}
                  >
                    Edit Dates
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          {items.map((item) => (
            <div className="summary-row" key={item.equipmentId}>
              <span>
                {item.equipment.name} ({item.days}{' '}
                {item.days === 1 ? 'day' : 'days'})
              </span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
          <div className="summary-row">
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
          <Button
            variant="primary"
            style={{ width: '100%', marginTop: '20px' }}
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </Button>
          <Button
            variant="ghost"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={() => navigate('/equipment')}
          >
            Continue Browsing
          </Button>
        </div>
      </div>

      {/* Edit dates modal */}
      <Modal
        isOpen={!!editing}
        onClose={closeEdit}
        title="Edit Rental Dates"
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {editing.equipment.name}
            </p>
            <div className="date-picker-group">
              <div className="date-picker">
                <label>Start Date</label>
                <input
                  type="date"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                />
              </div>
              <div className="date-picker">
                <label>End Date</label>
                <input
                  type="date"
                  value={draftEnd}
                  min={draftStart || undefined}
                  onChange={(e) => setDraftEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Cart;
