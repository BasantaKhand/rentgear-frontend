import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

// Fetches a math CAPTCHA challenge from the backend and reports the current
// { token, answer } up to the parent via onChange. Pass a changing `reloadKey`
// (e.g. increment it after a failed attempt) to force a fresh challenge.
function Captcha({ onChange, reloadKey = 0 }) {
  const [question, setQuestion] = useState('');
  const [token, setToken] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const { data } = await api.get('/auth/captcha');
      setQuestion(data.question);
      setToken(data.token);
      onChange?.({ token: data.token, answer: '' });
    } catch {
      setError('Could not load challenge. Click refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const handleAnswer = (e) => {
    const val = e.target.value;
    setAnswer(val);
    onChange?.({ token, answer: val });
  };

  return (
    <div className="form-group">
      <label htmlFor="captcha-answer">Security check</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-secondary, #f3f4f6)',
            borderRadius: '8px',
            fontWeight: 600,
            minWidth: '120px',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {loading ? 'Loading…' : question || '—'}
        </div>
        <input
          id="captcha-answer"
          className="form-input"
          type="number"
          inputMode="numeric"
          placeholder="Answer"
          value={answer}
          onChange={handleAnswer}
          style={{ flex: 1 }}
          autoComplete="off"
          required
        />
        <button
          type="button"
          className="social-btn"
          onClick={load}
          title="New challenge"
          style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}
        >
          ↻
        </button>
      </div>
      {error && (
        <span style={{ fontSize: '13px', color: 'var(--danger, #dc2626)' }}>{error}</span>
      )}
    </div>
  );
}

export default Captcha;
