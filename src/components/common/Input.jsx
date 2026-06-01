function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="form-group">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={`form-input ${error ? 'error' : ''} ${className}`}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default Input;
