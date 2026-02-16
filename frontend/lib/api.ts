import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
    withCredentials: true,
});

// Auth interceptor for token refresh
let isRefreshing = false;

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    await api.post("/auth/refresh/");
                    return api(original);
                } catch {
                    window.location.href = "/login";
                } finally {
                    isRefreshing = false;
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
