import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="main-content">
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

      <div className="placeholder-page">
        <p>More sections coming soon.</p>
      </div>
    </div>
  );
}

export default Home;
