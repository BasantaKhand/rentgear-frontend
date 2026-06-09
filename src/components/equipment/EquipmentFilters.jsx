import { useState, useEffect } from 'react';
import Button from '../common/Button';
import { CATEGORIES, getCategoryMeta } from '../../utils/equipmentMeta';

// Controlled filters sidebar. Receives the current filter values and callbacks
// to apply or clear them. Local draft state lets the user adjust before applying.
function EquipmentFilters({ value, onApply, onClear }) {
  const [categories, setCategories] = useState(value.categories || []);
  const [minPrice, setMinPrice] = useState(value.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(value.maxPrice || '');
  const [availableOnly, setAvailableOnly] = useState(value.availableOnly || false);

  // Sync draft when external value changes (e.g. cleared or from URL)
  useEffect(() => {
    setCategories(value.categories || []);
    setMinPrice(value.minPrice || '');
    setMaxPrice(value.maxPrice || '');
    setAvailableOnly(value.availableOnly || false);
  }, [value]);

  const toggleCategory = (cat) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleApply = () => {
    onApply({ categories, minPrice, maxPrice, availableOnly });
  };

  return (
    <aside className="filters-sidebar">
      <div className="filter-group">
        <div className="filter-title">
          Category
          <span
            style={{ color: 'var(--brand-primary)', fontSize: '12px', cursor: 'pointer' }}
            onClick={onClear}
          >
            Clear
          </span>
        </div>
        <div className="filter-options">
          {CATEGORIES.map((cat) => (
            <label className="filter-option" key={cat}>
              <input
                type="checkbox"
                checked={categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <span>{getCategoryMeta(cat).label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-title">Price Range</div>
        <div className="price-range">
          <input
            type="number"
            className="price-input"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          <input
            type="number"
            className="price-input"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-title">Availability</div>
        <div className="filter-options">
          <label className="filter-option">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            <span>Available Now</span>
          </label>
        </div>
      </div>

      <Button variant="primary" style={{ width: '100%', marginTop: '8px' }} onClick={handleApply}>
        Apply Filters
      </Button>
    </aside>
  );
}

export default EquipmentFilters;
