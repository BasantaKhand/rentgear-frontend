import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Star, MapPin, Heart } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { useCart } from '../hooks/useCart';
import { getCategoryMeta, resolveImageUrl } from '../utils/equipmentMeta';
import { getErrorMessage } from '../utils/getErrorMessage';

const SERVICE_FEE = 15;

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [favorite, setFavorite] = useState(false);

  const [availability, setAvailability] = useState(null); // null | {available, quantityAvailable}
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/equipment/${id}`);
        if (active) setEquipment(data.equipment);
      } catch (err) {
        if (active) {
          if (err.response?.status === 404) setNotFound(true);
          else setError(getErrorMessage(err, 'Could not load equipment'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  // Check availability when both dates are chosen
  useEffect(() => {
    if (!startDate || !endDate || daysBetween(startDate, endDate) <= 0) {
      setAvailability(null);
      return;
    }
    let active = true;
    const check = async () => {
      setCheckingAvail(true);
      try {
        const { data } = await api.get(`/equipment/${id}/availability`, {
          params: { startDate, endDate },
        });
        if (active) setAvailability(data);
      } catch {
        if (active) setAvailability(null);
      } finally {
        if (active) setCheckingAvail(false);
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [id, startDate, endDate]);

  if (loading) {
    return (
      <div className="main-content">
        <Loader message="Loading equipment..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Equipment not found</h3>
          <p>The item you're looking for doesn't exist or was removed.</p>
          <Link to="/equipment" className="btn btn-primary">
            Back to Equipment
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const meta = getCategoryMeta(equipment.category);
  const imageUrl = resolveImageUrl(equipment.image);
  const days = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const subtotal = days * equipment.dailyRate;
  const deposit = equipment.dailyRate * 2;
  const total = days > 0 ? subtotal + SERVICE_FEE + deposit : 0;

  const isAvailable = availability ? availability.available : equipment.available;
  const canAddToCart = days > 0 && isAvailable;

  const handleAddToCart = () => {
    addToCart(equipment, startDate, endDate);
    toast.success('Added to cart');
    navigate('/cart');
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/equipment')}>
          ← Back to Equipment
        </button>
      </div>

      <div className="equipment-detail">
        {/* Gallery */}
        <div className="equipment-gallery">
          <div className="gallery-main">
            {imageUrl ? (
              <img src={imageUrl} alt={equipment.name} />
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
                  fontSize: '80px',
                }}
              >
                {meta.icon}
              </div>
            )}
          </div>
          <div className="gallery-thumbs">
            <div className="gallery-thumb active">
              {imageUrl ? (
                <img src={imageUrl} alt="" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: meta.gradient }} />
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="equipment-info">
          <div className="card-category">{meta.label}</div>
          <h1>{equipment.name}</h1>
          <div className="equipment-meta">
            <div className="meta-item">
              <Star size={15} fill="var(--accent-warning)" color="var(--accent-warning)" /> 4.8 (placeholder)
            </div>
            <div className="meta-item">
              <MapPin size={15} /> Available for pickup
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.8 }}>
            {equipment.description || 'No description provided.'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            <span style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
              {meta.label}
            </span>
            <span style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
              {equipment.quantity} in stock
            </span>
            <span style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
              {equipment.available ? 'In service' : 'Out of service'}
            </span>
          </div>

          <div className="equipment-price-box">
            <div className="price-label">Daily rental rate</div>
            <div className="price-value">
              ${equipment.dailyRate} <span>/ day</span>
            </div>
          </div>

          <div className="date-picker-group">
            <div className="date-picker">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="date-picker">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {days > 0 && (
            <div className="rental-summary">
              <div className="summary-row">
                <span>
                  ${equipment.dailyRate} x {days} {days === 1 ? 'day' : 'days'}
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Service fee</span>
                <span>${SERVICE_FEE.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Deposit (refundable)</span>
                <span>${deposit.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {days > 0 && (
            <p
              style={{
                marginBottom: '16px',
                fontSize: '14px',
                color: isAvailable ? 'var(--accent-success)' : 'var(--accent-error)',
              }}
            >
              {checkingAvail
                ? 'Checking availability...'
                : isAvailable
                ? `Available for these dates${
                    availability ? ` (${availability.quantityAvailable} left)` : ''
                  }`
                : 'Not available for the selected dates'}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              size="lg"
              style={{ flex: 1 }}
              disabled={!canAddToCart}
              onClick={handleAddToCart}
            >
              {days > 0 ? 'Add to Cart' : 'Select dates to book'}
            </Button>
            <button
              className={`btn btn-outline btn-icon btn-lg ${favorite ? 'active' : ''}`}
              onClick={() => setFavorite((f) => !f)}
              aria-label="Toggle favorite"
            >
              <Heart size={20} fill={favorite ? 'var(--accent-error)' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquipmentDetail;
