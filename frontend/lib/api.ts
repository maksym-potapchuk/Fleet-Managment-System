import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor — silent token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(null);
  });
  failedQueue = [];
}

// These endpoints must never trigger a refresh retry to avoid loops:
// - /auth/refresh/ — is the refresh endpoint itself
// - /auth/me/     — called on mount; a 401 means "not logged in", not "expired"
// - /auth/login/  — bad credentials should surface directly to the UI
const NO_RETRY_URLS = ['/auth/refresh/', '/auth/me/', '/auth/login/', '/auth/unset-session/'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (NO_RETRY_URLS.some((url) => original?.url?.includes(url))) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        await api.post('/auth/refresh/');
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        // Clear HttpOnly cookies server-side before redirecting.
        // Without this the Next.js middleware still sees the stale access_token
        // cookie (session cookie alive in browser, but JWT expired/blacklisted)
        // and redirects back to /dashboard — creating an infinite redirect loop.
        try {
          await axios.post(
            `${api.defaults.baseURL}/auth/unset-session/`,
            {},
            { withCredentials: true },
          );
        } catch {
          // best-effort — proceed to login regardless
        }
        const loginPath = window.location.pathname.startsWith('/uk')
          ? '/uk/login'
          : '/login';
        window.location.replace(loginPath);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
