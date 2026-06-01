import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

function EquipmentCard({ item }) {
  const navigate = useNavigate();

  const {
    _id,
    id,
    name = 'Equipment Item',
    category = 'General',
    description = '',
    dailyRate = 0,
    available = true,
    rating,
    gradient = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    icon = '',
  } = item || {};

  const equipmentId = _id || id;

  return (
    <div className="card" onClick={() => navigate(`/equipment/${equipmentId}`)}>
      <div className="card-image">
        <div
          style={{
            width: '100%',
            height: '100%',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '48px',
          }}
        >
          {icon}
        </div>
        <span className={`card-badge ${available ? 'available' : 'limited'}`}>
          {available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <div className="card-body">
        <div className="card-category">{category}</div>
        <h3 className="card-title">{name}</h3>
        {description && <p className="card-description">{description}</p>}
        <div className="card-footer">
          <div className="card-price">
            ${dailyRate} <span>/day</span>
          </div>
          {rating != null && (
            <div className="card-rating">
              <Star size={14} fill="currentColor" /> {rating}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EquipmentCard;
