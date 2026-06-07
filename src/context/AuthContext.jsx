import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, validate it by fetching the current user.
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (isMounted) {
          setUser(data.user);
          setToken(storedToken);
        }
      } catch {
        // Token invalid/expired: clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist auth state and update context
  const persistAuth = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  // Login: call API, store token, set user
  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    persistAuth(data.token, data.user);
    return data.user;
  };

  // Register: call API, store token, set user
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persistAuth(data.token, data.user);
    return data.user;
  };

  // Logout: clear token and user
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Refresh the stored user (e.g. after a profile update)
  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    setUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
