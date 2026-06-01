import AdminSidebar from '../../components/admin/AdminSidebar';

function ManageBookings() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">Manage Bookings</h1>
        </div>
        <div className="placeholder-page">
          <p>Coming soon</p>
        </div>
      </main>
    </div>
  );
}

export default ManageBookings;
