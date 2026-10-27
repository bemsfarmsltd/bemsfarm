import axios from "axios";

// ─────────────────────────────────────────────
// BASE URL — single source of truth. Every request in this app (including
// the raw fetch() calls in a couple of admin pages) must resolve through
// this constant, so an unset VITE_API_URL can't split traffic across
// different backends depending on which call site made the request.
// ─────────────────────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://api.bemsfarms.com/api");

// ─────────────────────────────────────────────
// BASE AXIOS INSTANCE
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR (Attach token)
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const isAdminRequest =
      config.url?.startsWith("/admin") ||
      (typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin"));

    const adminToken = localStorage.getItem("admin_token");
    const customerToken =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const token = isAdminRequest ? (adminToken || customerToken) : customerToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach client channel (app vs web)
    const isApp = typeof window !== 'undefined' && (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone ||
      document.referrer?.includes('android-app://') ||
      Boolean(window.Capacitor || window.cordova)
    );
    config.headers['X-Channel'] = isApp ? 'app' : 'web';

    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (Refresh token flow & isolated 401s)
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
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest = /\/auth\/(login|register|google|refresh|forgot-password|reset-password)/.test(requestUrl);
    const isAdminRequest =
      requestUrl.startsWith("/admin") ||
      (typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin"));

    const status = error.response?.status;
    const errCode = error.response?.data?.code || "";
    const errMsg = String(error.response?.data?.message || "");

    const isDeactivatedOrSuspended =
      errCode === "ACCOUNT_DEACTIVATED" ||
      errCode === "ACCOUNT_SUSPENDED" ||
      errCode === "USER_NOT_FOUND" ||
      /account (deactivated|suspended|inactive|deleted)/i.test(errMsg) ||
      /user not found/i.test(errMsg);

    if (isDeactivatedOrSuspended && !isAuthRequest) {
      const kickReason = /suspended|banned/i.test(errMsg)
        ? "Your account has been suspended. Please contact customer support."
        : "Your account is not active or has been deactivated. Please contact support.";

      if (isAdminRequest) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("admin_kick_reason", kickReason);
          } catch {}
          if (!window.location.pathname.startsWith("/admin/login")) {
            window.location.href = `/admin/login?reason=deactivated&msg=${encodeURIComponent(kickReason)}`;
          }
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common.Authorization;

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("auth_kick_reason", kickReason);
          } catch {}
          window.dispatchEvent(new CustomEvent("auth:deactivated", { detail: { message: kickReason } }));
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = `/login?reason=deactivated&msg=${encodeURIComponent(kickReason)}`;
          }
        }
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest?._retry) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const isPublicPage = /^\/(login|register|verify-email|forgot-password|reset-password)/.test(currentPath);

      if (isAdminRequest) {
        // Clear only admin session when an admin route fails authentication
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
          window.location.href = "/admin/login";
        }
        return Promise.reject(error);
      }

      if (isPublicPage) {
        // On public pages (like /register), do not trigger a refresh token flow or login redirect
        return Promise.reject(error);
      }

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
          `${API_BASE_URL}/auth/refresh`,
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

        if (typeof window !== "undefined" && !isPublicPage && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }

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
// WISHLIST API
// ─────────────────────────────────────────────
export const wishlistAPI = {
  getAll: () => api.get("/wishlist"),
  add: (productId) => api.post("/wishlist", { productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
};

// ─────────────────────────────────────────────
// CART API (PERSISTENT ACROSS DEVICES)
// ─────────────────────────────────────────────
export const cartAPI = {
  getCart: (params) => api.get("/cart", { params }),
  addItem: (data) => api.post("/cart/items", data),
  updateQuantity: (productId, quantity, data = {}) =>
    api.patch(`/cart/items/${productId}`, { quantity, ...data }),
  removeItem: (productId, params) => api.delete(`/cart/items/${productId}`, { params }),
  clearCart: () => api.delete("/cart"),
  syncCart: (items, sessionId) => api.post("/cart/sync", { items, sessionId }),
};

// ─────────────────────────────────────────────
// EXPORT BASE API (optional but useful)
// ─────────────────────────────────────────────
export default api;
