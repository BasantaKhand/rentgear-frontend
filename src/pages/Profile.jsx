import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, FileText, UploadCloud } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import StatusBadge from '../components/common/StatusBadge';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import ActiveSessions from '../components/profile/ActiveSessions';
import { isStrongEnough } from '../utils/passwordStrength';
import { getErrorMessage } from '../utils/getErrorMessage';

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Edit profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // ID upload
  const [uploading, setUploading] = useState(false);

  // Change password form
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPw, setChangingPw] = useState(false);

  // Rental history
  const [rentals, setRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(true);

  // Initialize the edit form from the current user
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // Fetch rental history on mount
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get('/users/rental-history');
        if (active) setRentals(data.bookings || []);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load rental history'));
      } finally {
        if (active) setLoadingRentals(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleProfileChange = (e) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/profile', profileForm);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be 5MB or smaller');
      return;
    }

    const formData = new FormData();
    formData.append('idDocument', file);

    setUploading(true);
    try {
      const { data } = await api.post('/users/upload-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ ...user, idDocument: data.idDocument });
      toast.success('ID document uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePwChange = (e) => {
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (changingPw) return;

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (!isStrongEnough(pwForm.newPassword)) {
      toast.error('Please choose a stronger password');
      return;
    }

    setChangingPw(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change password'));
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) {
    return (
      <div className="main-content">
        <Loader message="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>
        My Profile
      </h1>

      {/* Account overview */}
      <div className="data-table-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
            {(user.name || 'U').trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{user.name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {user.phone || 'No phone'} · {user.address || 'No address'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="data-table-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Edit Profile</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  className="form-input"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="form-input"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  placeholder="Your phone"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                className="form-input"
                name="address"
                value={profileForm.address}
                onChange={handleProfileChange}
                placeholder="Your address"
              />
            </div>
            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>

      {/* ID Verification */}
      <div className="data-table-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>ID Verification</h3>
        </div>
        <div style={{ padding: '24px' }}>
          {user.idDocument ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                className="status-badge active"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle size={14} /> Uploaded
              </span>
              <a
                href={`${API_ORIGIN}${user.idDocument}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--brand-primary)',
                }}
              >
                <FileText size={16} /> View document
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-tertiary)' }}>
                <UploadCloud size={32} />
              </div>
              <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                {uploading ? 'Uploading...' : 'Click to upload your ID'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                JPG, JPEG, PNG or PDF up to 5MB
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Change Password */}
      <div className="data-table-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Change Password</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <form onSubmit={handlePwSubmit}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                className="form-input"
                type="password"
                name="currentPassword"
                value={pwForm.currentPassword}
                onChange={handlePwChange}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  className="form-input"
                  type="password"
                  name="newPassword"
                  value={pwForm.newPassword}
                  onChange={handlePwChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  className="form-input"
                  type="password"
                  name="confirmPassword"
                  value={pwForm.confirmPassword}
                  onChange={handlePwChange}
                  required
                />
              </div>
            </div>
            <PasswordStrengthMeter password={pwForm.newPassword} />
            <Button
              type="submit"
              variant="primary"
              disabled={changingPw || !isStrongEnough(pwForm.newPassword)}
            >
              {changingPw ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </div>

      {/* Active Sessions */}
      <ActiveSessions />

      {/* Rental History */}
      <div className="data-table-card">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Rental History</h3>
        </div>
        {loadingRentals ? (
          <Loader message="Loading rentals..." />
        ) : rentals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No rentals yet</h3>
            <p>You haven't rented any equipment yet.</p>
            <Link to="/equipment" className="btn btn-primary">
              Browse Equipment
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((b) => (
                <tr key={b._id}>
                  <td>{b.equipment?.name || 'Equipment'}</td>
                  <td>
                    {formatDate(b.startDate)} - {formatDate(b.endDate)}
                  </td>
                  <td>${b.totalPrice}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Profile;
