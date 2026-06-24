import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpDown, Plus } from 'lucide-react';
import api from '../../services/api';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { CATEGORIES, getCategoryMeta, resolveImageUrl } from '../../utils/equipmentMeta';
import { getErrorMessage } from '../../utils/getErrorMessage';

const EMPTY_FORM = { name: '', category: 'cameras', description: '', dailyRate: '', quantity: '' };

function statusOf(item, lowStockIds) {
  if (!item.available) return { label: 'Unavailable', cls: 'cancelled' };
  if (lowStockIds.has(item._id)) return { label: 'Low Stock', cls: 'pending' };
  return { label: 'Available', cls: 'active' };
}

function ManageEquipment() {
  const [allItems, setAllItems] = useState([]);
  const [lowStockIds, setLowStockIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState(new Set());

  // Modals
  const [formModal, setFormModal] = useState(null); // { mode, data }
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState(null);
  const [bulkAction, setBulkAction] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, lowRes] = await Promise.all([
        api.get('/admin/equipment', { params: { limit: 100 } }),
        api.get('/admin/equipment/low-stock'),
      ]);
      setAllItems(listRes.data.equipment || []);
      setLowStockIds(new Set((lowRes.data.equipment || []).map((e) => e._id)));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load equipment'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...allItems];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (categoryFilter) list = list.filter((e) => e.category === categoryFilter);

    list.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [allItems, search, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // --- Selection ---
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((e) => selected.has(e._id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((e) => next.delete(e._id));
      else pageItems.forEach((e) => next.add(e._id));
      return next;
    });
  };

  // --- Form (add/edit) ---
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setFormModal({ mode: 'add' });
  };
  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      dailyRate: item.dailyRate,
      quantity: item.quantity,
    });
    setImageFile(null);
    setImagePreview(resolveImageUrl(item.image));
    setFormModal({ mode: 'edit', data: item });
  };
  const onFormChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.name || !form.description || form.dailyRate === '' || form.quantity === '') {
      toast.error('Please fill in all required fields');
      return;
    }
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('dailyRate', form.dailyRate);
    fd.append('quantity', form.quantity);
    if (imageFile) fd.append('image', imageFile);

    setSubmitting(true);
    try {
      if (formModal.mode === 'add') {
        await api.post('/equipment', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Equipment added');
      } else {
        await api.put(`/equipment/${formModal.data._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Equipment updated');
      }
      setFormModal(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save equipment'));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Toggle availability ---
  const toggleAvailability = async (item) => {
    try {
      await api.put(`/equipment/${item._id}/availability`, { available: !item.available });
      toast.success(`Marked ${!item.available ? 'available' : 'unavailable'}`);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update availability'));
    }
  };

  // --- Delete ---
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/equipment/${deleteTarget._id}`);
      toast.success('Equipment deleted');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete equipment'));
    }
  };

  // --- History ---
  const openHistory = async (item) => {
    setHistoryTarget(item);
    setHistory(null);
    try {
      const { data } = await api.get(`/equipment/${item._id}/history`);
      setHistory(data.bookings || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load history'));
      setHistory([]);
    }
  };

  // --- Bulk actions ---
  const runBulk = async () => {
    if (!bulkAction || selected.size === 0) {
      toast.error('Select items and an action');
      return;
    }
    const ids = [...selected];
    try {
      if (bulkAction === 'delete') {
        const { data } = await api.delete('/equipment/bulk-delete', { data: { ids } });
        toast.success(`Deleted ${data.deletedCount}, skipped ${data.skipped.length}`);
      } else {
        const available = bulkAction === 'available';
        await api.post('/equipment/bulk-update', { ids, updates: { available } });
        toast.success(`Updated ${ids.length} item(s)`);
      }
      setSelected(new Set());
      setBulkAction('');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Bulk action failed'));
    }
  };

  const SortHeader = ({ label, k }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(k)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label} <ArrowUpDown size={12} />
      </span>
    </th>
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-title">Manage Equipment</h1>
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} /> Add Equipment
          </Button>
        </div>

        {loading ? (
          <Loader message="Loading equipment..." />
        ) : error ? (
          <div className="empty-state">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadData}>Retry</Button>
          </div>
        ) : allItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No equipment yet</h3>
            <p>Add your first equipment item to get started.</p>
            <Button variant="primary" onClick={openAdd}>Add Equipment</Button>
          </div>
        ) : (
          <div className="data-table-card">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{ padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '14px' }}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  style={{ padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '14px' }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{getCategoryMeta(c).label}</option>
                  ))}
                </select>
              </div>
              {selected.size > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.size} selected</span>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontSize: '13px' }}>
                    <option value="">Bulk action...</option>
                    <option value="available">Mark Available</option>
                    <option value="unavailable">Mark Unavailable</option>
                    <option value="delete">Delete</option>
                  </select>
                  <Button variant="secondary" size="sm" onClick={runBulk}>Apply</Button>
                </div>
              )}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} /></th>
                  <th>Image</th>
                  <SortHeader label="Name" k="name" />
                  <SortHeader label="Category" k="category" />
                  <SortHeader label="Daily Rate" k="dailyRate" />
                  <SortHeader label="Qty" k="quantity" />
                  <th>Status</th>
                  <SortHeader label="Bookings" k="bookingCount" />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const meta = getCategoryMeta(item.category);
                  const img = resolveImageUrl(item.image);
                  const st = statusOf(item, lowStockIds);
                  return (
                    <tr key={item._id}>
                      <td><input type="checkbox" checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} /></td>
                      <td>
                        <div style={{ width: '48px', height: '36px', borderRadius: '6px', overflow: 'hidden' }}>
                          {img ? (
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: meta.gradient }} />
                          )}
                        </div>
                      </td>
                      <td>{item.name}</td>
                      <td>{meta.label}</td>
                      <td>${item.dailyRate}</td>
                      <td>{item.quantity}</td>
                      <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                      <td>{item.bookingCount ?? 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openHistory(item)}>History</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleAvailability(item)}>
                            {item.available ? 'Disable' : 'Enable'}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-error)' }} onClick={() => setDeleteTarget(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Per page:
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '6px 10px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>{filtered.length} items</span>
              </div>
              <div className="pagination" style={{ margin: 0 }}>
                <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>←</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`pagination-btn ${p === currentPage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>→</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit modal */}
      <Modal
        isOpen={!!formModal}
        onClose={() => setFormModal(null)}
        title={formModal?.mode === 'edit' ? 'Edit Equipment' : 'Add Equipment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitForm} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {formModal && (
          <form onSubmit={submitForm}>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" name="name" value={form.name} onChange={onFormChange} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-input" name="category" value={form.category} onChange={onFormChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{getCategoryMeta(c).label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-input" name="description" rows={3} value={form.description} onChange={onFormChange} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Daily Rate ($)</label>
                <input className="form-input" type="number" name="dailyRate" value={form.dailyRate} onChange={onFormChange} />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input className="form-input" type="number" name="quantity" value={form.quantity} onChange={onFormChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Image</label>
              {imagePreview && (
                <img src={imagePreview} alt="preview" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
              )}
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onImageChange} />
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Equipment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        {deleteTarget && (
          <div>
            <p>Delete <strong>{deleteTarget.name}</strong>?</p>
            {deleteTarget.bookingCount > 0 && (
              <p style={{ color: 'var(--accent-warning)', fontSize: '13px', marginTop: '8px' }}>
                This item has {deleteTarget.bookingCount} booking(s) on record. Deletion is blocked if any are currently active.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => { setHistoryTarget(null); setHistory(null); }}
        title={historyTarget ? `History - ${historyTarget.name}` : 'History'}
      >
        {history === null ? (
          <Loader message="Loading history..." />
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No rental history yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Dates</th><th>Status</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b._id}>
                  <td>{b.user?.name || '—'}</td>
                  <td>{new Date(b.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(b.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>${b.totalPrice?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}

export default ManageEquipment;
