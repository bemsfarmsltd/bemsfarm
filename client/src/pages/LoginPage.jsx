import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
  FIXES vs previous version:
  1. navigate("/") → navigate("/home") — was sending users to ComingSoonPage
  2. useState() used as useEffect() for slide timer — fixed to useEffect with cleanup
  3. Google OAuth button added — uses @react-oauth/google
     SETUP: npm install @react-oauth/google  (in client/)
     Add to client/index.html or main.jsx:
       import { GoogleOAuthProvider } from '@react-oauth/google'
       wrap <App /> with <GoogleOAuthProvider clientId="YOUR_CLIENT_ID">
     Add VITE_GOOGLE_CLIENT_ID=your_client_id to Vercel env vars
*/

import { GoogleLogin } from "@react-oauth/google";

const SLIDE_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=900&q=90",
    caption: "Farm-fresh produce, straight to your door",
  },
  {
    url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&q=90",
    caption: "Quality Nigerian vegetables, harvested daily",
  },
  {
    url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=900&q=90",
    caption: "Authentic grains and cereals at fair prices",
  },
];

function ImagePanel({ activeSlide, setActiveSlide }) {
  return (
    <div
      style={{
        position: "relative",
        flex: "1 1 50%",
        minHeight: "100vh",
        overflow: "hidden",
      }}
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
            "linear-gradient(to bottom, rgba(10,46,10,0.3) 0%, rgba(10,46,10,0.7) 60%, rgba(10,46,10,0.92) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 20,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.4)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1592921870789-04563d55041c?w=40&q=80"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
            Verified Fresh
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            100% farm-to-table quality
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 20,
          padding: "14px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ color: "#69F0AE", fontWeight: 900, fontSize: 22 }}>
          26+
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Products
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 40px 48px",
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "#69F0AE" }}>BEMS</span>FARMS
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Premium Farm Produce
          </div>
        </div>
        <h2
          style={{
            color: "#fff",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            fontWeight: 800,
            lineHeight: 1.2,
            margin: "0 0 12px",
          }}
        >
          {SLIDE_IMAGES[activeSlide].caption}
        </h2>
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {SLIDE_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                width: activeSlide === i ? 32 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  activeSlide === i ? "#69F0AE" : "rgba(255,255,255,0.4)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
        <div
          style={{ display: "flex", gap: 16, marginTop: 28, flexWrap: "wrap" }}
        >
          {[
            {
              img: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=36&q=80",
              text: "Paystack Secured",
            },
            {
              img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=36&q=80",
              text: "Fast Delivery",
            },
          ].map((t) => (
            <div
              key={t.text}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                }}
              >
                <img
                  src={t.img}
                  alt={t.text}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── FIX: was useState() — should be useEffect with cleanup ──
  useEffect(() => {
    const id = setInterval(
      () => setActiveSlide((s) => (s + 1) % SLIDE_IMAGES.length),
      4000,
    );
    return () => clearInterval(id);
  }, []);

  // Redirect to where the user was trying to go, or /home
  const from = location.state?.from || "/home";

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true }); // ── FIX: was navigate("/") → ComingSoonPage
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      // loginWithGoogle should POST the credential token to /api/auth/google
      // and return a JWT — wire this up in AuthContext
      await loginWithGoogle(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Google sign-in failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{ display: "flex", flex: "1 1 50%" }}
        className="auth-image-panel"
      >
        <ImagePanel activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      </div>

      <div
        className="auth-form-panel"
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(24px, 5vw, 80px)",
          background: "#fff",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          className="auth-form-inner"
          style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}
        >
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
              }}
            >
              <span style={{ color: "#2E7D32" }}>BEMS</span>FARMS
            </div>
            <div
              style={{
                color: "#888",
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Premium Farm Produce
            </div>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: "#0D1117",
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
            }}
          >
            Sign in to BemsFarms
          </h1>
          <p style={{ color: "#6B7280", fontSize: 15, margin: "0 0 28px" }}>
            Enter your details below
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
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>⚠</span> {error}
            </div>
          )}

          {/* Google OAuth button */}
          <div style={{ marginBottom: 20 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with_google"
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

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "2px solid #E5E7EB",
                  borderRadius: 12,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  background: "#FAFAFA",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 13,
                    color: "#F57F17",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "14px 44px 14px 16px",
                    border: "2px solid #E5E7EB",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                    background: "#FAFAFA",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
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
                    color: "#9CA3AF",
                    fontSize: 18,
                  }}
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
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
                "Log In"
              )}
            </button>
          </div>

          <p
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: 14,
              margin: "24px 0 0",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{
                color: "#2E7D32",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign Up
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
