import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { getCategoryMeta, resolveImageUrl } from '../../utils/equipmentMeta';

function EquipmentCard({ item }) {
  const navigate = useNavigate();
  const [favorite, setFavorite] = useState(false);

  const {
    _id,
    id,
    name = 'Equipment Item',
    category = 'general',
    description = '',
    dailyRate = 0,
    quantity = 0,
    available = true,
    rating = 4.8,
  } = item || {};

  const equipmentId = _id || id;
  const meta = getCategoryMeta(category);
  const imageUrl = resolveImageUrl(item?.image);

  // Availability badge logic
  let badgeClass = 'available';
  let badgeText = 'Available';
  if (!available || quantity <= 0) {
    badgeClass = 'limited';
    badgeText = 'Unavailable';
  } else if (quantity <= 3) {
    badgeClass = 'limited';
    badgeText = `${quantity} left`;
  }

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setFavorite((f) => !f);
  };

  return (
    <div className="card" onClick={() => navigate(`/equipment/${equipmentId}`)}>
      <div className="card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={name} />
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
              fontSize: '48px',
            }}
          >
            {meta.icon}
          </div>
        )}
        <span className={`card-badge ${badgeClass}`}>{badgeText}</span>
        <button
          className={`card-favorite ${favorite ? 'active' : ''}`}
          onClick={toggleFavorite}
          aria-label="Toggle favorite"
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-category">{meta.label}</div>
        <h3 className="card-title">{name}</h3>
        {description && <p className="card-description">{description}</p>}
        <div className="card-footer">
          <div className="card-price">
            ${dailyRate} <span>/day</span>
          </div>
          <div className="card-rating">
            <Star size={14} fill="currentColor" /> {rating}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquipmentCard;
