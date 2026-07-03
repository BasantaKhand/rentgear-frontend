import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Access token is kept in memory only (not localStorage) for security.
let accessToken = null;
export const setAccessToken = (t) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

// CSRF token (double-submit) is also kept in memory. The matching cookie is set
// by the server; we echo this value in the X-CSRF-Token header on the
// cookie-based refresh endpoint.
let csrfToken = null;
export const setCsrfToken = (t) => {
  csrfToken = t;
};
export const getCsrfToken = () => csrfToken;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the httpOnly refresh cookie
});

// Attach the in-memory access token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Ensure we hold a CSRF token before calling the refresh endpoint. On a cold
// page load the in-memory token is gone, so we fetch a fresh one (which also
// sets the matching cookie).
async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const { data } = await axios.get(`${baseURL}/auth/csrf-token`, {
    withCredentials: true,
  });
  csrfToken = data.csrfToken;
  return csrfToken;
}

// Perform a single refresh, rotating the token. Shared by the interceptor and
// the initial session restore so concurrent callers reuse one in-flight request.
let refreshPromise = null;
export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = await ensureCsrf();
      const { data } = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true, headers: { 'X-CSRF-Token': token } }
      );
      setAccessToken(data.accessToken);
      if (data.csrfToken) setCsrfToken(data.csrfToken);
      return data;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// On 401, try a single refresh, then retry the original request. Concurrent
// 401s share the same refresh (queued) and retry once it resolves.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthPath =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/csrf-token');

    // Rate limited: surface a friendly, actionable message with wait time.
    if (status === 429) {
      const retryAfter =
        Number(error.response?.headers?.['retry-after']) ||
        error.response?.data?.retryAfter;
      const minutes = retryAfter ? Math.ceil(retryAfter / 60) : null;
      error.rateLimited = true;
      error.retryAfterSeconds = retryAfter || null;
      error.friendlyMessage = minutes
        ? `Too many attempts. Please wait about ${minutes} minute(s) and try again.`
        : 'Too many attempts. Please wait a moment and try again.';
      return Promise.reject(error);
    }

    if (status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true;
      try {
        const data = await refreshSession();
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        setAccessToken(null);
        setCsrfToken(null);
        // Let the app know to clear auth state / redirect to login
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
