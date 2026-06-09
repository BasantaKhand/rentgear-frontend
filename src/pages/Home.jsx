import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import EquipmentCard from '../components/equipment/EquipmentCard';
import { CATEGORIES, getCategoryMeta } from '../utils/equipmentMeta';
import { getErrorMessage } from '../utils/getErrorMessage';

function Home() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get('/equipment', { params: { limit: 4 } });
        if (active) setFeatured(data.equipment || []);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Could not load featured equipment'));
      } finally {
        if (active) setLoadingFeatured(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchText.trim()) params.set('search', searchText.trim());
    if (searchCategory) params.set('category', searchCategory);
    navigate(`/equipment?${params.toString()}`);
  };

  return (
    <div className="main-content">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <Zap size={16} /> Over 500+ Equipment Available
        </div>
        <h1 className="hero-title">
          Rent Professional<br />
          <span>Equipment</span> with Ease
        </h1>
        <p className="hero-subtitle">
          From cameras to construction tools, find everything you need for your
          next project. Quality equipment, competitive prices, hassle-free
          rentals.
        </p>
        <div className="hero-actions">
          <Button variant="primary" size="lg" onClick={() => navigate('/equipment')}>
            Browse Equipment <ArrowRight size={18} />
          </Button>
          <Button variant="outline" size="lg">
            How It Works
          </Button>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-value">500+</div>
            <div className="stat-label">Equipment Items</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">2,500+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">98%</div>
            <div className="stat-label">Satisfaction Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="search-section">
        <div className="search-form">
          <div className="search-field">
            <label>What do you need?</label>
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="search-field">
            <label>Category</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryMeta(cat).label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" className="search-btn" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Categories */}
      <section className="categories-section">
        <div className="section-header">
          <h2 className="section-title">Browse by Category</h2>
          <a className="section-link" onClick={() => navigate('/equipment')} style={{ cursor: 'pointer' }}>
            View All →
          </a>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((cat) => {
            const meta = getCategoryMeta(cat);
            return (
              <div
                key={cat}
                className="category-card"
                onClick={() => navigate(`/equipment?category=${cat}`)}
              >
                <div className="category-icon">{meta.icon}</div>
                <div className="category-name">{meta.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured equipment */}
      <section className="equipment-section">
        <div className="section-header">
          <h2 className="section-title">Featured Equipment</h2>
          <a className="section-link" onClick={() => navigate('/equipment')} style={{ cursor: 'pointer' }}>
            View All →
          </a>
        </div>
        {loadingFeatured ? (
          <Loader message="Loading featured equipment..." />
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : featured.length === 0 ? (
          <div className="empty-state">
            <h3>No equipment yet</h3>
            <p>Check back soon.</p>
          </div>
        ) : (
          <div className="equipment-grid">
            {featured.map((item) => (
              <EquipmentCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
