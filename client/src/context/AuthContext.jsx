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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Basic sanity check — if "user" is just an email string,
        // the old broken login stored it wrong; clear and force re-login
        if (typeof parsed === "string" || !parsed?.id) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setLoading(false);
          return;
        }
        setToken(savedToken);
        setUser(parsed);
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Internal: store a valid session after any auth method
  const _storeSession = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  }, []);

  // ── EMAIL/PASSWORD LOGIN ─────────────────────────────────────
  // This is what LoginPage should call: await login(email, password)
  const login = useCallback(
    async (email, password) => {
      const res = await api.post("/auth/login", { email, password });
      // Backend returns { user, token } or { user, accessToken } — handle both
      const authToken = res.data.token || res.data.accessToken;
      const userData = res.data.user;
      if (!authToken || !userData) {
        throw new Error("Invalid response from server");
      }
      _storeSession(userData, authToken);
      return userData;
    },
    [_storeSession],
  );

  // ── EMAIL/PASSWORD REGISTER ──────────────────────────────────
  const register = useCallback(
    async (name, email, password, phone) => {
      const res = await api.post("/auth/register", { name, email, password, phone });
      const authToken = res.data.token || res.data.accessToken;
      const userData = res.data.user;
      if (!authToken || !userData) {
        throw new Error("Invalid response from server");
      }
      _storeSession(userData, authToken);
      return userData;
    },
    [_storeSession],
  );

  // ── GOOGLE OAUTH LOGIN ───────────────────────────────────────
  // googleCredential = the JWT credential string from @react-oauth/google
  // Backend needs POST /api/auth/google that verifies it with Google
  // and returns { user, token }
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

  // ── LOGOUT ───────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common.Authorization;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn: !!user && !!token,
        login, // call as: await login(email, password)
        register, // call as: await register(name, email, password)
        loginWithGoogle, // call as: await loginWithGoogle(credential)
        logout,
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
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🌿</div>
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
