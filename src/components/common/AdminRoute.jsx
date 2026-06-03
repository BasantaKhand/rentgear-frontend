import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from './Loader';

// Guards routes that require an authenticated admin user.
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader message="Checking authentication..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
