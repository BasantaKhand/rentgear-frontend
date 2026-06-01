import AdminSidebar from '../../components/admin/AdminSidebar';

function ManageUsers() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">Manage Users</h1>
        </div>
        <div className="placeholder-page">
          <p>Coming soon</p>
        </div>
      </main>
    </div>
  );
}

export default ManageUsers;
