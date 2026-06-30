import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="main-content">
      <div className="empty-state" style={{ padding: '80px 24px' }}>
        <div className="empty-state-icon" style={{ fontSize: '40px' }}>404</div>
        <h3>Page not found</h3>
        <p>The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}

export default NotFound;
