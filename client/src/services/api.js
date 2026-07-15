import axios from "axios";

// ─────────────────────────────────────────────
// BASE AXIOS INSTANCE
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api.bemsfarms.com/api",
  timeout: 60000,
  withCredentials: true,
});

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR (Attach token)
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (Refresh token flow)
// ─────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:5000/api"
          }/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = res.data.token;

        localStorage.setItem("token", newToken);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────
// ORDERS API (FIXED)
// ─────────────────────────────────────────────
export const ordersAPI = {
  getAll: (params) => api.get("/orders", { params }),

  getById: (id) => api.get(`/orders/${id}`),

  create: (data) => api.post("/orders", data),

  cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),

  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

// ─────────────────────────────────────────────
// EXPORT BASE API (optional but useful)
// ─────────────────────────────────────────────
export default api;
