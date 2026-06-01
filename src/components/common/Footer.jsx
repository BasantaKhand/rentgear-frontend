import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="logo">
            <div className="logo-icon">R</div>
            RentGear
          </div>
          <p>
            Professional equipment rental made easy. Quality gear, competitive
            prices, and hassle-free service for all your project needs.
          </p>
        </div>
        <div>
          <h4 className="footer-title">Quick Links</h4>
          <div className="footer-links">
            <Link to="/equipment">Browse Equipment</Link>
            <Link to="/">How It Works</Link>
            <Link to="/">Pricing</Link>
            <Link to="/">FAQs</Link>
          </div>
        </div>
        <div>
          <h4 className="footer-title">Categories</h4>
          <div className="footer-links">
            <Link to="/equipment">Cameras &amp; Photo</Link>
            <Link to="/equipment">Power Tools</Link>
            <Link to="/equipment">Sports &amp; Outdoor</Link>
            <Link to="/equipment">Audio Equipment</Link>
          </div>
        </div>
        <div>
          <h4 className="footer-title">Support</h4>
          <div className="footer-links">
            <Link to="/">Help Center</Link>
            <Link to="/">Contact Us</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Privacy Policy</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 RentGear. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#">Twitter</a>
          <a href="#">Instagram</a>
          <a href="#">Facebook</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
