import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

function processQueue(error: unknown) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(null);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;

        // Don't intercept the refresh endpoint itself to avoid infinite loops
        if (original?.url?.includes("/auth/refresh/")) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            if (isRefreshing) {
                // Queue the request until the refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(original))
                  .catch((err) => Promise.reject(err));
            }

            isRefreshing = true;

            try {
                await api.post("/auth/refresh/");
                processQueue(null);
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError);
                const locale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] ?? "";
                window.location.href = locale === "uk" ? "/uk/login" : "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
