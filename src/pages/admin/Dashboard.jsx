import AdminSidebar from '../../components/admin/AdminSidebar';

function Dashboard() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Welcome back, Admin
            </p>
          </div>
        </div>
        <div className="placeholder-page">
          <p>Coming soon</p>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
