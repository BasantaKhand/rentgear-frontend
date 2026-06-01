import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

function BookingCard({ booking }) {
  const {
    bookingId = '#BK-0000',
    equipmentName = 'Equipment',
    dates = '',
    total = 0,
    status = 'pending',
  } = booking || {};

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <h3 className="cart-item-title">{equipmentName}</h3>
        <div className="cart-item-dates">
          {bookingId} · {dates}
        </div>
        <div className="cart-item-price">${total}</div>
      </div>
      <div className="cart-item-actions">
        <StatusBadge status={status} />
        <Button variant="ghost" size="sm">
          View
        </Button>
      </div>
    </div>
  );
}

export default BookingCard;
