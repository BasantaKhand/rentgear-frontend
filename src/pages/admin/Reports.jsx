import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  DollarSign, Calendar, Users, TrendingUp, Printer, Download, ArrowUp, ArrowDown,
} from 'lucide-react';
import api from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { getCategoryMeta } from '../../utils/equipmentMeta';
import { getErrorMessage } from '../../utils/getErrorMessage';

const iso = (d) => d.toISOString().slice(0, 10);
const shortBk = (id) => `#BK-${(id || '').slice(-4).toUpperCase()}`;

function presetRange(preset) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  if (preset === '7') start.setDate(now.getDate() - 7);
  else if (preset === '30') start.setDate(now.getDate() - 30);
  else if (preset === 'thisMonth') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (preset === 'lastMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start: iso(start), end: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
  } else if (preset === 'thisYear') start = new Date(now.getFullYear(), 0, 1);
  return { start: iso(start), end: iso(end) };
}

function Reports() {
  const [range, setRange] = useState(presetRange('30'));
  const [summaryPeriod, setSummaryPeriod] = useState('month');
  const [groupBy, setGroupBy] = useState('day');

  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [users, setUsers] = useState(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = { startDate: range.start, endDate: range.end };
    try {
      const [sumRes, bkRes, rvRes, eqRes, usRes] = await Promise.all([
        api.get('/admin/reports/summary', { params: { period: summaryPeriod } }),
        api.get('/admin/reports/bookings', { params }),
        api.get('/admin/reports/revenue', { params: { ...params, groupBy } }),
        api.get('/admin/reports/equipment', { params }),
        api.get('/admin/reports/users', { params }),
      ]);
      setSummary(sumRes.data);
      setBookings(bkRes.data.bookings || []);
      setRevenue(rvRes.data);
      setEquipment(eqRes.data.equipment || []);
      setUsers(usRes.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load reports'));
    } finally {
      setLoading(false);
    }
  }, [range, summaryPeriod, groupBy]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const applyPreset = (preset) => {
    setRange(presetRange(preset));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/reports/bookings', {
        params: { startDate: range.start, endDate: range.end, format: 'csv' },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-report-${range.start}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const s = summary?.summary;
  const ch = summary?.changes;
  const maxRev = revenue ? Math.max(...revenue.data.map((d) => d.totalRevenue), 1) : 1;

  const Change = ({ value }) => (
    <span className={`stat-card-change ${value >= 0 ? 'positive' : 'negative'}`}>
      {value >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      {Math.abs(value)}%
    </span>
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header no-print">
          <h1 className="admin-title">Reports</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print Report
            </Button>
            <Button variant="primary" onClick={exportCsv} disabled={exporting}>
              <Download size={16} /> {exporting ? 'Exporting...' : 'Export All Reports'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="data-table-card no-print" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Start date</label>
              <input type="date" className="form-input" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>End date</label>
              <input type="date" className="form-input" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
            </div>
            <Button variant="primary" onClick={fetchReports}>Apply</Button>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['thisMonth', 'This Month'], ['lastMonth', 'Last Month'], ['thisYear', 'This Year']].map(([k, label]) => (
                <button key={k} className="btn btn-ghost btn-sm" onClick={() => applyPreset(k)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <Loader message="Loading reports..." />
        ) : (
          <div id="report-printable">
            {/* Summary cards */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '12px' }}>
              {['week', 'month', 'year'].map((p) => (
                <button key={p} className={`btn btn-sm ${summaryPeriod === p ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setSummaryPeriod(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
              ))}
            </div>
            {s && (
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <div className="stat-card-header"><div className="stat-card-icon green"><DollarSign size={20} /></div></div>
                  <div className="stat-card-value">${s.totalRevenue.toFixed(2)}</div>
                  <div className="stat-card-label">Total Revenue</div>
                  <Change value={ch.revenue} />
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><div className="stat-card-icon blue"><Calendar size={20} /></div></div>
                  <div className="stat-card-value">{s.totalBookings}</div>
                  <div className="stat-card-label">Total Bookings</div>
                  <Change value={ch.bookings} />
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><div className="stat-card-icon orange"><Users size={20} /></div></div>
                  <div className="stat-card-value">{s.newUsers}</div>
                  <div className="stat-card-label">New Users</div>
                  <Change value={ch.newUsers} />
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><div className="stat-card-icon blue"><TrendingUp size={20} /></div></div>
                  <div className="stat-card-value">${s.avgBookingValue.toFixed(2)}</div>
                  <div className="stat-card-label">Avg Booking Value</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Most Popular Category</div>
                  <div className="stat-card-value" style={{ fontSize: '22px', textTransform: 'capitalize' }}>{s.mostPopularCategory || '—'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Most Popular Equipment</div>
                  <div className="stat-card-value" style={{ fontSize: '18px' }}>{s.mostPopularEquipment || '—'}</div>
                </div>
              </div>
            )}

            {/* Revenue report */}
            <div className="data-table-card" style={{ marginTop: '32px' }}>
              <div className="table-header">
                <h3 className="table-title">Revenue</h3>
                <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
                  {['day', 'week', 'month'].map((g) => (
                    <button key={g} className={`btn btn-sm ${groupBy === g ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setGroupBy(g)} style={{ textTransform: 'capitalize' }}>{g}</button>
                  ))}
                </div>
              </div>
              {revenue && revenue.data.length > 0 ? (
                <>
                  <div style={{ padding: '20px', display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }} className="no-print">
                    {revenue.data.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <div title={`$${d.totalRevenue}`} style={{ width: '100%', maxWidth: '28px', height: `${(d.totalRevenue / maxRev) * 100}%`, minHeight: d.totalRevenue > 0 ? '4px' : 0, background: 'var(--brand-primary)', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{String(d.period).slice(-5)}</span>
                      </div>
                    ))}
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Period</th><th>Revenue</th><th>Bookings</th><th>Avg Value</th></tr></thead>
                    <tbody>
                      {revenue.data.map((d) => (
                        <tr key={d.period}>
                          <td>{d.period}</td>
                          <td>${d.totalRevenue.toFixed(2)}</td>
                          <td>{d.bookingsCount}</td>
                          <td>${d.avgBookingValue.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700 }}>
                        <td>Total</td>
                        <td>${revenue.total.totalRevenue.toFixed(2)}</td>
                        <td>{revenue.total.bookingsCount}</td>
                        <td>${revenue.total.avgBookingValue.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <p style={{ padding: '24px', color: 'var(--text-tertiary)' }}>No data for selected period.</p>
              )}
            </div>

            {/* Bookings report */}
            <div className="data-table-card" style={{ marginTop: '32px' }}>
              <div className="table-header">
                <h3 className="table-title">Bookings ({bookings.length})</h3>
                <button className="btn btn-secondary btn-sm no-print" onClick={exportCsv} disabled={exporting}>Export CSV</button>
              </div>
              {bookings.length === 0 ? (
                <p style={{ padding: '24px', color: 'var(--text-tertiary)' }}>No data for selected period.</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Booking ID</th><th>Customer</th><th>Equipment</th><th>Dates</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {bookings.slice(0, 50).map((b, i) => (
                      <tr key={i}>
                        <td>{b.bookingId}</td>
                        <td>{b.customerName}</td>
                        <td>{b.equipment}</td>
                        <td>{b.startDate} - {b.endDate}</td>
                        <td>${Number(b.amount).toFixed(2)}</td>
                        <td><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Equipment performance */}
            <div className="data-table-card" style={{ marginTop: '32px' }}>
              <div className="table-header"><h3 className="table-title">Equipment Performance</h3></div>
              <table className="data-table">
                <thead><tr><th>Equipment</th><th>Category</th><th>Times Rented</th><th>Revenue</th><th>Avg Duration</th></tr></thead>
                <tbody>
                  {equipment.slice(0, 15).map((e, i) => (
                    <tr key={i} style={i < 3 && e.revenue > 0 ? { fontWeight: 600 } : undefined}>
                      <td>{e.equipment}</td>
                      <td>{getCategoryMeta(e.category).label}</td>
                      <td>{e.timesRented}</td>
                      <td>${e.revenue.toFixed(2)}</td>
                      <td>{e.avgRentalDuration} day(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User activity */}
            {users && (
              <div className="data-table-card" style={{ marginTop: '32px', marginBottom: '32px' }}>
                <div className="table-header"><h3 className="table-title">User Activity</h3></div>
                <div style={{ padding: '20px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                  <div><div className="stat-card-value">{users.totalRegistrations}</div><div className="stat-card-label">New Registrations</div></div>
                  <div><div className="stat-card-value">{users.activeUsers}</div><div className="stat-card-label">Active Users</div></div>
                  <div><div className="stat-card-value">{users.verificationRate}%</div><div className="stat-card-label">Verification Rate</div></div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Top Customer</th><th>Email</th><th>Bookings</th><th>Total Spent</th></tr></thead>
                  <tbody>
                    {users.topCustomers.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No paid customers in period</td></tr>
                    ) : (
                      users.topCustomers.map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                          <td>{c.bookings}</td>
                          <td>${c.totalSpent.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Reports;
