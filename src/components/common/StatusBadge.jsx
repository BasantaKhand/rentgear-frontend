function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : 'Unknown';

  return <span className={`status-badge ${normalized}`}>{label}</span>;
}

export default StatusBadge;
