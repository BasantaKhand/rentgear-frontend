import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Calendar,
  Users,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/equipment', label: 'Equipment', icon: Package },
  { to: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="admin-mobile-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle admin menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`admin-sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
      <Link to="/" className="logo" style={{ marginBottom: '24px' }}>
        <div className="logo-icon">R</div>
        RentGear
      </Link>
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Admin Panel
        </h3>
      </div>
      <nav className="admin-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="admin-nav-icon">
              <Icon size={18} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;
