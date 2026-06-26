import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

/*
  FIXES vs previous version:
  1. navigate("/") → navigate("/onboarding") for new users
     (onboarding flow: Register → /onboarding → /home)
  2. useState() used as useEffect() for slide timer — fixed
  3. Google OAuth button added
*/

const SLIDE_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=900&q=90",
    caption: "Join Nigerian families eating fresh",
  },
  {
    url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&q=90",
    caption: "AI-powered food recommendations for your health goals",
  },
  {
    url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=900&q=90",
    caption: "Fresh fruits and vegetables delivered today",
  },
];

function getPasswordStrength(pwd) {
  if (!pwd) return { strength: 0, label: "", color: "transparent" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { strength: 1, label: "Weak", color: "#EF4444" },
    { strength: 2, label: "Fair", color: "#F59E0B" },
    { strength: 3, label: "Good", color: "#3B82F6" },
    { strength: 4, label: "Strong", color: "#10B981" },
  ];
  return map[score - 1] || { strength: 0, label: "", color: "transparent" };
}

export default function RegisterPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // ── FIX: was useState() — should be useEffect with cleanup ──
  useEffect(() => {
    const id = setInterval(
      () => setActiveSlide((s) => (s + 1) % SLIDE_IMAGES.length),
      4500,
    );
    return () => clearInterval(id);
  }, []);

  const pwdStrength = getPasswordStrength(form.password);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your full name");
    if (!form.email.trim()) return setError("Please enter your email");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/onboarding"); // ── FIX: was navigate("/") → ComingSoonPage
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      // Google sign-up skips onboarding and goes straight to home
      // since we can't intercept mid-flow for preferences
      navigate("/home");
    } catch (err) {
      setError(
        err.response?.data?.message || "Google sign-in failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Left image panel */}
      <div
        style={{ flex: "1 1 50%", position: "relative", overflow: "hidden" }}
        className="auth-image-panel"
      >
        {SLIDE_IMAGES.map((slide, i) => (
          <img
            key={i}
            src={slide.url}
            alt={slide.caption}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: activeSlide === i ? 1 : 0,
              transition: "opacity 0.8s ease",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom,rgba(10,46,10,0.25) 0%,rgba(10,46,10,0.85) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 36,
            left: 36,
            right: 36,
            display: "flex",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 16,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1592921870789-04563d55041c?w=32&q=80"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>
                100% Secure
              </div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>
                Paystack protected
              </div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(105,240,174,0.2)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(105,240,174,0.4)",
              borderRadius: 16,
              padding: "10px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#69F0AE", fontWeight: 900, fontSize: 20 }}>
              Free
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              To Join
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "40%",
            right: 36,
            background: "rgba(255,255,255,0.13)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 20,
            padding: 16,
            width: 140,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 80,
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=140&q=80"
              alt="Rice"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
            Ofada Rice
          </div>
          <div style={{ color: "#69F0AE", fontWeight: 800, fontSize: 15 }}>
            ₦3,750
          </div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>
            1kg bag · Farm fresh
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "32px 36px 40px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "#69F0AE" }}>BEMS</span>FARMS
          </div>
          <h2
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 20px",
              lineHeight: 1.3,
            }}
          >
            {SLIDE_IMAGES[activeSlide].caption}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            {SLIDE_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                style={{
                  width: activeSlide === i ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  padding: 0,
                  background:
                    activeSlide === i ? "#69F0AE" : "rgba(255,255,255,0.4)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div
        className="auth-form-panel"
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(32px, 6vw, 72px)",
          background: "#fff",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          className="auth-form-inner"
          style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#0D1117",
                letterSpacing: "-0.02em",
              }}
            >
              <span style={{ color: "#2E7D32" }}>BEMS</span>FARMS
            </div>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
              fontWeight: 900,
              color: "#0D1117",
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
            }}
          >
            Create Account
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 24px" }}>
            Join Nigeria's freshest farm marketplace
          </p>

          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#DC2626",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Google OAuth */}
          <div style={{ marginBottom: 16 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError("Google sign-in was cancelled or failed.")
              }
              useOneTap={false}
              theme="outline"
              size="large"
              width="100%"
              text="signup_with_google"
              shape="rectangular"
            />
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "0 0 20px",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 500 }}>
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Obisesan Esther"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: "2px solid #E5E7EB",
                  borderRadius: 12,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FAFAFA",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: "2px solid #E5E7EB",
                  borderRadius: 12,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FAFAFA",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Min. 6 characters"
                  style={{
                    width: "100%",
                    padding: "13px 44px 13px 16px",
                    border: "2px solid #E5E7EB",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#FAFAFA",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#9CA3AF",
                  }}
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background:
                            i <= pwdStrength.strength
                              ? pwdStrength.color
                              : "#E5E7EB",
                          transition: "background 0.3s",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: pwdStrength.color,
                      fontWeight: 600,
                    }}
                  >
                    {pwdStrength.label} password
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter password"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  border: `2px solid ${form.confirm && form.confirm !== form.password ? "#EF4444" : "#E5E7EB"}`,
                  borderRadius: 12,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FAFAFA",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                onBlur={(e) => {
                  if (!form.confirm || form.confirm === form.password)
                    e.target.style.borderColor = "#E5E7EB";
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              {form.confirm && form.confirm !== form.password && (
                <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
                  Passwords don't match
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                background: loading
                  ? "#9CA3AF"
                  : "linear-gradient(135deg,#2E7D32,#388E3C)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 6px 20px rgba(46,125,50,0.35)",
                transition: "all 0.2s",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <p
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: 14,
              margin: "20px 0 0",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#2E7D32",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-image-panel { display: none !important; }
          .auth-form-panel { flex: unset !important; width: 100% !important; min-height: 100vh; padding: 24px 20px !important; }
          .auth-form-inner { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
