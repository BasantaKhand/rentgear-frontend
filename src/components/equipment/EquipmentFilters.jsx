import Button from '../common/Button';

const CATEGORIES = [
  'Cameras & Photo',
  'Power Tools',
  'Sports & Outdoor',
  'Electronics',
  'Audio Equipment',
];

function EquipmentFilters() {
  return (
    <aside className="filters-sidebar">
      <div className="filter-group">
        <div className="filter-title">
          Category
          <span style={{ color: 'var(--brand-primary)', fontSize: '12px', cursor: 'pointer' }}>
            Clear
          </span>
        </div>
        <div className="filter-options">
          {CATEGORIES.map((cat, i) => (
            <label className="filter-option" key={cat}>
              <input type="checkbox" defaultChecked={i === 0} />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-title">Price Range</div>
        <div className="price-range">
          <input type="text" className="price-input" placeholder="Min" defaultValue="$0" />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input type="text" className="price-input" placeholder="Max" defaultValue="$200" />
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-title">Availability</div>
        <div className="filter-options">
          <label className="filter-option">
            <input type="checkbox" defaultChecked />
            <span>Available Now</span>
          </label>
          <label className="filter-option">
            <input type="checkbox" />
            <span>Coming Soon</span>
          </label>
        </div>
      </div>

      <Button variant="primary" style={{ width: '100%', marginTop: '8px' }}>
        Apply Filters
      </Button>
    </aside>
  );
}

export default EquipmentFilters;
