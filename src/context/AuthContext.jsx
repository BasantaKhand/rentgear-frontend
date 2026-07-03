import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import api, {
  setAccessToken,
  setCsrfToken,
  refreshSession,
} from '../services/api';
import IdleTimeoutModal from '../components/common/IdleTimeoutModal';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

// Idle handling. The server invalidates a session after 30 min of no refresh
// activity, so we warn a bit before that and let the user extend by refreshing.
const IDLE_WARN_MS = 28 * 60 * 1000; // show warning after 28 min idle
const IDLE_COUNTDOWN_S = 120; // then 2 minutes to respond before auto-logout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Idle-timeout UI state
  const [idleOpen, setIdleOpen] = useState(false);
  const [countdown, setCountdown] = useState(IDLE_COUNTDOWN_S);
  const lastActivityRef = useRef(Date.now());
  const warnStartRef = useRef(null);

  // On mount: try to restore the session using the httpOnly refresh cookie.
  useEffect(() => {
    let active = true;

    // Clear any legacy localStorage auth from earlier versions
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const restore = async () => {
      try {
        const data = await refreshSession();
        if (active) setUser(data.user);
      } catch {
        if (active) {
          setAccessToken(null);
          setCsrfToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restore();

    // The api layer dispatches this when a refresh ultimately fails
    const onForcedLogout = () => {
      setAccessToken(null);
      setCsrfToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', onForcedLogout);

    return () => {
      active = false;
      window.removeEventListener('auth:logout', onForcedLogout);
    };
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    setAccessToken(data.accessToken);
    if (data.csrfToken) setCsrfToken(data.csrfToken);
    lastActivityRef.current = Date.now();
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    if (data.csrfToken) setCsrfToken(data.csrfToken);
    lastActivityRef.current = Date.now();
    setUser(data.user);
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore network errors on logout */
    }
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
    setIdleOpen(false);
  }, []);

  // Refresh the in-memory user (e.g. after a profile update)
  const updateUser = (updatedUser) => setUser(updatedUser);

  // --- Idle activity tracking ---
  useEffect(() => {
    if (!user) return undefined;

    const bump = () => {
      // While the warning is up we require an explicit choice; ignore activity.
      if (!idleOpen) lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (!idleOpen && idle >= IDLE_WARN_MS) {
        warnStartRef.current = Date.now();
        setCountdown(IDLE_COUNTDOWN_S);
        setIdleOpen(true);
      } else if (idleOpen) {
        const left = IDLE_COUNTDOWN_S - Math.floor((Date.now() - warnStartRef.current) / 1000);
        if (left <= 0) {
          logout();
        } else {
          setCountdown(left);
        }
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(tick);
    };
  }, [user, idleOpen, logout]);

  const stayLoggedIn = async () => {
    try {
      await refreshSession();
      lastActivityRef.current = Date.now();
      setIdleOpen(false);
    } catch {
      // Session already gone server-side — force logout.
      logout();
    }
  };

  const value = { user, loading, login, register, logout, setUser, updateUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <IdleTimeoutModal
        open={idleOpen}
        secondsLeft={countdown}
        onStay={stayLoggedIn}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
}
