import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { getCategoryMeta } from '../../utils/equipmentMeta';
import { getErrorMessage } from '../../utils/getErrorMessage';

function shortId(id) {
  return `#BK-${(id || '').slice(-4).toUpperCase()}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function initials(name) {
  if (!name) return 'U';
  const p = name.trim().split(' ');
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadData = async (p = period) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/overview', { params: { period: p } });
      setData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const markReturned = async (id) => {
    try {
      await api.put(`/bookings/${id}/return`);
      toast.success('Booking marked as returned');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update booking'));
    }
  };

  const exportCSV = () => {
    const bookings = data?.recentBookings || [];
    const rows = [['Booking ID', 'Customer', 'Equipment', 'Start', 'End', 'Amount', 'Status']];
    bookings.forEach((b) =>
      rows.push([
        shortId(b._id),
        b.user?.name || '',
        b.equipment?.name || '',
        fmtDate(b.startDate),
        fmtDate(b.endDate),
        b.totalPrice,
        b.status,
      ])
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recent-bookings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = data?.stats;
  const recentBookings = data?.recentBookings || [];
  const revenueChart = data?.revenueChart || [];
  const categoryStats = data?.categoryStats || [];

  const filteredBookings = recentBookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.user?.name?.toLowerCase().includes(q) ||
      b.equipment?.name?.toLowerCase().includes(q) ||
      shortId(b._id).toLowerCase().includes(q)
    );
  });

  const maxRevenue = Math.max(...revenueChart.map((d) => d.revenue), 1);
  const maxCatRevenue = Math.max(...categoryStats.map((c) => c.revenue), 1);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Welcome back, Admin
              {lastUpdated && (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  {'  ·  '}Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={exportCSV}>Export Report</Button>
            <Link to="/admin/equipment" className="btn btn-primary">+ Add Equipment</Link>
          </div>
        </div>

        {error ? (
          <div className="empty-state">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={() => loadData()}>Retry</Button>
          </div>
        ) : loading && !data ? (
          <Loader message="Loading dashboard..." />
        ) : (
          <>
            {/* Stats cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon blue"><Calendar size={20} /></div>
                </div>
                <div className="stat-card-value">{stats.bookingsToday}</div>
                <div className="stat-card-label">Bookings Today</div>
                <div className="stat-card-change" style={{ color: 'var(--text-tertiary)' }}>
                  {stats.bookingsThisWeek} this week
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon green"><DollarSign size={20} /></div>
                </div>
                <div className="stat-card-value">${stats.revenueThisMonth.toFixed(2)}</div>
                <div className="stat-card-label">Revenue This Month</div>
                <div className={`stat-card-change ${stats.revenueChangePercent >= 0 ? 'positive' : 'negative'}`}>
                  {stats.revenueChangePercent >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(stats.revenueChangePercent)}% from last month
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon orange"><Package size={20} /></div>
                </div>
                <div className="stat-card-value">{stats.equipmentRented}</div>
                <div className="stat-card-label">Equipment Rented</div>
                <div className="stat-card-change" style={{ color: 'var(--text-tertiary)' }}>
                  of {stats.totalEquipment} items
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon red"><AlertTriangle size={20} /></div>
                </div>
                <div className="stat-card-value">{stats.overdueReturns}</div>
                <div className="stat-card-label">Overdue Returns</div>
                <div className={`stat-card-change ${stats.overdueReturns > 0 ? 'negative' : 'positive'}`}>
                  {stats.overdueReturns > 0 ? 'Needs attention' : 'All on track'}
                </div>
              </div>
            </div>

            {/* Revenue chart */}
            <div className="data-table-card" style={{ marginBottom: '32px' }}>
              <div className="table-header">
                <h3 className="table-title">Revenue</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['week', 'month', 'year'].map((p) => (
                    <button
                      key={p}
                      className={`btn btn-sm ${period === p ? 'btn-secondary' : 'btn-ghost'}`}
                      onClick={() => setPeriod(p)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '24px', display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px' }}>
                {revenueChart.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      title={`$${d.revenue}`}
                      style={{
                        width: '100%',
                        maxWidth: '32px',
                        height: `${(d.revenue / maxRevenue) * 100}%`,
                        minHeight: d.revenue > 0 ? '4px' : '0',
                        background: 'var(--brand-primary)',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {String(d.date).slice(-5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent bookings */}
            <div className="data-table-card" style={{ marginBottom: '32px' }}>
              <div className="table-header">
                <h3 className="table-title">Recent Bookings</h3>
                <div className="table-actions">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '14px' }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                  <Link to="/admin/bookings" className="btn btn-ghost btn-sm">View All</Link>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Equipment</th>
                    <th>Dates</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b._id}>
                        <td>{shortId(b._id)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              {initials(b.user?.name)}
                            </div>
                            {b.user?.name || 'Unknown'}
                          </div>
                        </td>
                        <td>{b.equipment?.name || 'Equipment'}</td>
                        <td>{fmtDate(b.startDate)} - {fmtDate(b.endDate)}</td>
                        <td>${b.totalPrice?.toFixed(2)}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDetail(b)}>View</button>
                            {b.status === 'active' && (
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-success)' }} onClick={() => markReturned(b._id)}>
                                Mark Returned
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Category breakdown */}
            <div className="data-table-card">
              <div className="table-header">
                <h3 className="table-title">Category Breakdown</h3>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {categoryStats.map((c) => {
                  const meta = getCategoryMeta(c.category);
                  return (
                    <div key={c.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>{meta.icon} {meta.label} ({c.equipmentCount} items, {c.bookingCount} bookings)</span>
                        <span style={{ fontWeight: 600 }}>${c.revenue.toFixed(2)}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${(c.revenue / maxCatRevenue) * 100}%`, height: '100%', background: 'var(--brand-primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Booking detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? shortId(detail._id) : 'Booking'}>
        {detail && (
          <div className="rental-summary">
            <div className="summary-row"><span>Customer</span><span>{detail.user?.name}</span></div>
            <div className="summary-row"><span>Equipment</span><span>{detail.equipment?.name}</span></div>
            <div className="summary-row"><span>Dates</span><span>{fmtDate(detail.startDate)} - {fmtDate(detail.endDate)}</span></div>
            <div className="summary-row"><span>Status</span><span><StatusBadge status={detail.status} /></span></div>
            <div className="summary-row total"><span>Amount</span><span>${detail.totalPrice?.toFixed(2)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Dashboard;
