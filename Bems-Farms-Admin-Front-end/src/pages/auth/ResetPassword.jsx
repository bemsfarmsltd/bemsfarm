import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../lib/api";
import "./Login.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid or missing a token. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password. The link may have expired.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      <div className="login-hero-pane">
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
        <div className="login-hero-top">
          <a href="https://www.bemsfarms.com" className="login-logo-badge">
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="login-logo-img" />
          </a>
        </div>
        <div className="login-hero-content">
          <div className="login-badge-pill">
            <span className="login-ping-dot" />
            <span>Authorized Management System</span>
          </div>
          <h1 className="login-hero-title">Reset Your Staff Account Password</h1>
          <p className="login-hero-desc">
            Choose a new password to regain access to the Bems Farms admin hub.
          </p>
        </div>
      </div>

      <div className="login-form-pane">
        <div className="login-top-action">
          <a href="https://www.bemsfarms.com" className="login-mobile-logo">
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" style={{ height: "1.75rem", width: "auto" }} />
          </a>
        </div>

        <div className="login-card-container">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div>
              <div className="login-portal-tag">
                <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "9999px", backgroundColor: "#d97706" }} />
                <span>Staff Portal</span>
              </div>
              <h2 className="login-form-title">
                {done ? "Password Reset!" : "Set a New Password"}
              </h2>
              <p className="login-form-subtitle">
                {done
                  ? "Your password has been updated. You can now sign in with your new password."
                  : "Enter and confirm your new password below."}
              </p>
            </div>

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

            {done ? (
              <button type="button" onClick={() => navigate("/login")} className="login-submit-btn">
                <span>Go to Sign In</span>
              </button>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="login-field-group">
                  <label className="login-field-label" htmlFor="new-password">New Password</label>
                  <div className="login-input-wrap">
                    <div className="login-input-icon">
                      <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className="login-text-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-eye-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="login-field-group">
                  <label className="login-field-label" htmlFor="confirm-password">Confirm New Password</label>
                  <div className="login-input-wrap">
                    <div className="login-input-icon">
                      <svg style={{ width: "1rem", height: "1rem" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-type new password"
                      autoComplete="new-password"
                      className="login-text-input"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-submit-btn">
                  {loading ? (
                    <>
                      <svg style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <Link to="/login" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0f766e" }}>
                    &larr; Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </motion.div>
        </div>

        <div className="login-bottom-copyright">
          &copy; {new Date().getFullYear()} Bems Farms Limited &bull; Internal Operations Portal
        </div>
      </div>
    </div>
  );
}
