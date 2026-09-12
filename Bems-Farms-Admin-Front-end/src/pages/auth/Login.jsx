import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { isStaffRole, STAFF_HOME } from "../../lib/roles";
import toast from "react-hot-toast";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || !user) return;
    if (isStaffRole(user.role)) {
      const from = location.state?.from || STAFF_HOME[user.role] || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e, customEmail, customPassword) => {
    e?.preventDefault();
    setError("");
    const targetEmail = (customEmail || email).trim();
    const targetPassword = customPassword || password;
    if (!targetEmail || !targetPassword) {
      return setError("Please enter your staff email and password.");
    }

    setLoading(true);
    try {
      await login(targetEmail, targetPassword);
      toast.success("Welcome back!");
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : null) ||
        err.message;
      const msg = serverMessage || "Invalid staff credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* ── LEFT HALF: EXECUTIVE BRAND & VISUAL BACKDROP (DESKTOP) ── */}
      <div className="login-hero-pane">
        {/* Background Image with Rich Overlay */}
        <div className="login-hero-bg">
          <img
            src="/bems_farms_twilight.jpg"
            alt="Bems Farms Facility"
            className="login-hero-img"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/bems_store_aisles.jpg";
            }}
          />
          <div className="login-hero-overlay" />
          <div className="login-hero-dotgrid" />
        </div>

        {/* Top Branding */}
        <div className="login-hero-top">
          <a
            href="https://www.bemsfarms.com"
            className="login-logo-badge"
          >
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="login-logo-img" />
          </a>
        </div>

        {/* Middle Hero Content */}
        <div className="login-hero-content">
          <div className="login-badge-pill">
            <span className="login-ping-dot" />
            <span>Authorized Management System</span>
          </div>

          <h1 className="login-hero-title">
            Unified Farm Logistics, Fulfillment &amp; Order Routing
          </h1>
          <p className="login-hero-desc">
            Access live warehouse stock levels, dispatch rider tracking, demand forecasting, and automated issue resolution across all zones.
          </p>

          {/* Quick Pillar Badges */}
          <div className="login-pillars-grid">
            <div className="login-pillar-card">
              <p className="login-pillar-heading-green">Role-Based Access</p>
              <p className="login-pillar-sub">Strict privileges for dispatch &amp; finance</p>
            </div>
            <div className="login-pillar-card">
              <p className="login-pillar-heading-amber">Live Inventory Audit</p>
              <p className="login-pillar-sub">Real-time depletion and restock sync</p>
            </div>
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="login-hero-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "9999px", backgroundColor: "#34d399" }} />
            <span>Core API: <strong>Operational (99.98%)</strong></span>
          </div>
          <span style={{ fontSize: "0.6875rem", opacity: 0.6 }}>Internal v2.4</span>
        </div>
      </div>

      {/* ── RIGHT HALF: CLEAN AUTHENTICATION FORM CANVAS ── */}
      <div className="login-form-pane">
        {/* Top Nav Action */}
        <div className="login-top-action">
          {/* Mobile Logo on White Badge */}
          <a
            href="https://www.bemsfarms.com"
            className="login-mobile-logo"
          >
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: "1.75rem", width: "auto" }} />
          </a>

          <a
            href="https://www.bemsfarms.com"
            className="login-storefront-btn"
          >
            <span>Customer Storefront</span>
            <svg style={{ width: "0.875rem", height: "0.875rem" }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>

        {/* Centered Login Card */}
        <div className="login-card-container">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* Header */}
            <div>
              <div className="login-portal-tag">
                <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "9999px", backgroundColor: "#d97706" }} />
                <span>Staff Portal</span>
              </div>
              <h2 className="login-form-title">
                Staff Sign In
              </h2>
              <p className="login-form-subtitle">
                Sign in with your authorized Bems Farms administrator or staff account.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                role="alert"
                className="login-error-alert"
              >
                <svg style={{ width: "1rem", height: "1rem", color: "#e11d48", flexShrink: 0, marginTop: "0.125rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span style={{ lineHeight: 1.5 }}>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="login-field-group">
                <label className="login-field-label" htmlFor="admin-email">
                  Staff Email Address
                </label>
                <div className="login-input-wrap">
                  <div className="login-input-icon">
                    <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@bemsfarms.com"
                    autoComplete="username"
                    className="login-text-input"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-field-label" htmlFor="admin-password">
                  Security Password
                </label>
                <div className="login-input-wrap">
                  <div className="login-input-icon">
                    <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="login-text-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
              >
                {loading ? (
                  <>
                    <svg style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Hub</span>
                    <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>

              {/* Quick Dev Staff Login */}
              {import.meta.env.DEV && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚡ One-Click Staff Login (Local Dev)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                    {[
                      { label: '👑 Superadmin', email: 'superadmin@bemsfarms.com', pass: 'super123' },
                      { label: '💼 Admin', email: 'admin@bemsfarms.com', pass: 'admin123' },
                      { label: '🛒 Cashier (POS)', email: 'cashier@bemsfarms.com', pass: 'cashier123' },
                      { label: '📊 Manager', email: 'manager@bemsfarms.com', pass: 'manager123' },
                    ].map((s) => (
                      <button
                        key={s.email}
                        type="button"
                        onClick={() => {
                          setEmail(s.email);
                          setPassword(s.pass);
                          handleSubmit(null, s.email, s.pass);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Security Footer */}
            <div className="login-security-footer">
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <svg style={{ width: "0.875rem", height: "0.875rem", color: "#15803d" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                <span>Encrypted 256-Bit SSL</span>
              </div>
              <span>Role-Based Audit Active</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom copyright */}
        <div className="login-bottom-copyright">
          &copy; {new Date().getFullYear()} Bems Farms Limited &bull; Internal Operations Portal
        </div>
      </div>
    </div>
  );
}
