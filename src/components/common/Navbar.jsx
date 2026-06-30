import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, ShoppingCart, User, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import NotificationBell from './NotificationBell';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close the user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.success('Logged out');
    navigate('/login');
  };

  const cartCount = items.length;
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">
          <div className="logo-icon">R</div>
          RentGear
        </Link>

        {/* On admin routes, navigation happens via the admin sidebar */}
        {!isAdminRoute && (
          <div className="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/equipment"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Equipment
            </NavLink>
            <NavLink
              to="/my-bookings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              My Bookings
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                Admin
              </NavLink>
            )}
          </div>
        )}

        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notification bell for logged-in users */}
          {user && <NotificationBell />}

          {/* Cart is visible for logged-in users on non-admin pages */}
          {user && !isAdminRoute && (
            <button
              className="cart-btn"
              onClick={() => navigate('/cart')}
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}

          {user ? (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <div
                className="user-menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <div className="user-avatar">{getInitials(user.name)}</div>
                <span className="user-name">{user.name}</span>
              </div>

              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    minWidth: '180px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '8px',
                    zIndex: 200,
                  }}
                >
                  <button
                    className="admin-nav-item"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <span className="admin-nav-icon">
                      <User size={18} />
                    </span>
                    Profile
                  </button>
                  <button
                    className="admin-nav-item"
                    style={{ width: '100%' }}
                    onClick={handleLogout}
                  >
                    <span className="admin-nav-icon">
                      <LogOut size={18} />
                    </span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
