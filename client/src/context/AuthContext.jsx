import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";

/*
  ROOT CAUSE OF LOGIN REDIRECT BUG:
  The old login() function took (userData, authToken) — but LoginPage
  was calling login(email, password), storing the email string as the
  user object and the password string as the token. isLoggedIn became
  truthy immediately (both strings are truthy), but every subsequent
  API call failed with 401 because the Authorization header was set to
  "Bearer yourpassword" instead of a real JWT.

  FIX: Added loginWithCredentials(email, password) which:
  1. POSTs to /api/auth/login
  2. Gets back { user, token } from the server
  3. Calls the internal _storeSession() to save properly

  Also added:
  - registerWithCredentials(name, email, password) — same pattern
  - loginWithGoogle(googleCredential) — for Google OAuth
  - The old login() is kept as _storeSession() for internal use
*/

const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff"];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Customer Session (Synchronous init from localStorage for zero flicker)
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      return (typeof parsed === "object" && parsed?.id) ? parsed : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      return !savedToken || !savedUser;
    } catch {
      return false;
    }
  });

  // Admin / Staff Session (Completely isolated)
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const savedAdminUser = localStorage.getItem("admin_user");
      return savedAdminUser ? JSON.parse(savedAdminUser) : null;
    } catch {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem("admin_token") || null;
    } catch {
      return null;
    }
  });

  // Restore Customer session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!savedToken || !savedUser) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (typeof parsed === "string" || !parsed?.id) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLoading(false);
        return;
      }

      api
        .get("/auth/me", { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((res) => {
          const freshUser = res.data.user || parsed;
          setToken(savedToken);
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLoading(false);
    }
  }, []);

  // Restore Admin session on mount
  useEffect(() => {
    const savedAdminToken = localStorage.getItem("admin_token");
    const savedAdminUser = localStorage.getItem("admin_user");

    if (!savedAdminToken || !savedAdminUser) return;

    try {
      const parsedAdmin = JSON.parse(savedAdminUser);
      if (typeof parsedAdmin === "string" || !parsedAdmin?.id || !STAFF_ROLES.includes(parsedAdmin?.role)) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        return;
      }

      api
        .get("/auth/me", { headers: { Authorization: `Bearer ${savedAdminToken}` } })
        .then((res) => {
          const freshAdmin = res.data.user || parsedAdmin;
          if (STAFF_ROLES.includes(freshAdmin?.role)) {
            setAdminToken(savedAdminToken);
            setAdminUser(freshAdmin);
            localStorage.setItem("admin_user", JSON.stringify(freshAdmin));
          } else {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
          }
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
          }
        });
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
  }, []);

  // Internal: store customer session
  const _storeSession = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  // ── CUSTOMER EMAIL/PASSWORD LOGIN ────────────────────────────
  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = data;
      if (!userData?.id || !authToken) throw new Error('Invalid login response');
      
      _storeSession(userData, authToken);
      return userData;
    },
    [_storeSession],
  );

  // ── ADMIN / STAFF EMAIL/PASSWORD LOGIN ────────────────────────
  const adminLogin = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      const { user: staffData, token: staffAuthToken } = data;
      if (!staffData?.id || !staffAuthToken) throw new Error('Invalid login response');

      if (!STAFF_ROLES.includes(staffData.role)) {
        throw new Error('Access Denied: This portal is strictly restricted to Bems Farms staff and administrators.');
      }

      setAdminUser(staffData);
      setAdminToken(staffAuthToken);
      localStorage.setItem("admin_token", staffAuthToken);
      localStorage.setItem("admin_user", JSON.stringify(staffData));
      return staffData;
    },
    [],
  );

  // ── ADMIN / STAFF ONE-CLICK BYPASS LOGIN ──────────────────────
  const adminBypassLogin = useCallback(async () => {
    const { data } = await api.post('/auth/admin-bypass');
    const { user: staffData, token: staffAuthToken } = data;
    if (!staffData?.id || !staffAuthToken) throw new Error('Invalid bypass response');

    setAdminUser(staffData);
    setAdminToken(staffAuthToken);
    localStorage.setItem("admin_token", staffAuthToken);
    localStorage.setItem("admin_user", JSON.stringify(staffData));
    return staffData;
  }, []);

  // ── ADMIN / STAFF LOGOUT ──────────────────────────────────────
  const adminLogout = useCallback(() => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }, []);

  // ── EMAIL/PASSWORD REGISTER ──────────────────────────────────
  const register = useCallback(
    async (name, email, password, phone, preferences, addressData) => {
      const payload = {
        name,
        email,
        password,
        phone,
        preferences,
        ...(addressData || {}),
      };
      const { data } = await api.post('/auth/register', payload);
      return { email, ...data };
    },
    [],
  );

  // ── VERIFY EMAIL ─────────────────────────────────────────────
  const verifyEmail = useCallback(
    async (email, token) => {
      const { data } = await api.post('/auth/verify-email', { email, token });
      const { user: userData, token: authToken } = data;
      if (userData?.id && authToken) {
        _storeSession(userData, authToken);
      }
      return data;
    },
    [_storeSession],
  );

  // ── RESEND VERIFICATION ──────────────────────────────────────
  const resendVerification = useCallback(
    async (email) => {
      const { data } = await api.post('/auth/resend-verification', { email });
      return data;
    },
    [],
  );

  // ── GOOGLE OAUTH LOGIN ───────────────────────────────────────
  const loginWithGoogle = useCallback(
    async (googleCredential) => {
      const res = await api.post("/auth/google", {
        credential: googleCredential,
      });
      const authToken = res.data.token || res.data.accessToken;
      const userData = res.data.user;
      if (!authToken || !userData) {
        throw new Error("Invalid response from Google auth");
      }
      _storeSession(userData, authToken);
      return userData;
    },
    [_storeSession],
  );

  // ── UPDATE CUSTOMER USER ─────────────────────────────────────
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── UPDATE ADMIN USER ─────────────────────────────────────────
  const updateAdminUser = useCallback((patch) => {
    setAdminUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("admin_user", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── REFRESH TOKEN ────────────────────────────────────────────
  const refreshToken = useCallback((newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  }, []);

  // ── CUSTOMER LOGOUT ──────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        // Customer Auth
        user,
        token,
        loading,
        isLoggedIn: !!user && !!token,
        login,
        register,
        verifyEmail,
        resendVerification,
        loginWithGoogle,
        logout,
        updateUser,
        refreshToken,

        // Admin Auth (Concurrent & Isolated)
        adminUser,
        adminToken,
        isAdminLoggedIn: !!adminUser && !!adminToken,
        adminLogin,
        adminBypassLogin,
        adminLogout,
        updateAdminUser,
      }}
    >
      {loading ? (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "54", marginBottom: "12px" }}></div>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Loading BemsFarms...
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
