import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';
import EquipmentCard from '../components/equipment/EquipmentCard';
import EquipmentFilters from '../components/equipment/EquipmentFilters';
import { getErrorMessage } from '../utils/getErrorMessage';

const PAGE_SIZE = 9;

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Sort by: Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

function Equipment() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the catalogue once; filtering/sorting/paging happen client-side so
  // that multi-category selection and price sorting all work together.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/equipment', { params: { limit: 100 } });
        if (active) setAllItems(data.equipment || []);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Could not load equipment'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Current filters read from URL
  const categories = (searchParams.get('category') || '')
    .split(',')
    .filter(Boolean);
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const availableOnly = searchParams.get('available') === 'true';
  const sort = searchParams.get('sort') || 'recommended';
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);

  // Apply filters + sort
  const filtered = useMemo(() => {
    let list = [...allItems];

    if (categories.length) {
      list = list.filter((i) => categories.includes(i.category));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    if (minPrice !== '') list = list.filter((i) => i.dailyRate >= Number(minPrice));
    if (maxPrice !== '') list = list.filter((i) => i.dailyRate <= Number(maxPrice));
    if (availableOnly) list = list.filter((i) => i.available && i.quantity > 0);

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.dailyRate - b.dailyRate);
        break;
      case 'price-desc':
        list.sort((a, b) => b.dailyRate - a.dailyRate);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, searchParams]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Update a set of params (and reset page unless page is being set)
  const updateParams = (updates, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined || val === false) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    if (resetPage) next.delete('page');
    setSearchParams(next);
  };

  const handleApply = ({ categories, minPrice, maxPrice, availableOnly }) => {
    updateParams({
      category: categories.join(','),
      minPrice,
      maxPrice,
      available: availableOnly ? 'true' : '',
    });
  };

  const handleClear = () => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    setSearchParams(next);
  };

  const goToPage = (p) => updateParams({ page: String(p) }, false);

  return (
    <div className="main-content">
      <div className="page-with-sidebar">
        <EquipmentFilters
          value={{ categories, minPrice, maxPrice, availableOnly }}
          onApply={handleApply}
          onClear={handleClear}
        />

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                Equipment
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {loading ? 'Loading...' : `Showing ${filtered.length} results`}
              </p>
            </div>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <Loader message="Loading equipment..." />
          ) : error ? (
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No equipment found</h3>
              <p>Try adjusting your filters or search.</p>
            </div>
          ) : (
            <>
              <div className="equipment-grid">
                {pageItems.map((item) => (
                  <EquipmentCard key={item._id} item={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Equipment;
