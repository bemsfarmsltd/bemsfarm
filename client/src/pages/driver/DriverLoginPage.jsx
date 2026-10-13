import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";

const AUTH_CSS = `
.auth-grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  mix-blend-mode: overlay;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.auth-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  z-index: 0;
}
.auth-pill-btn {
  border-radius: 999px !important;
  transition: box-shadow 0.25s ease, transform 0.2s ease;
}
.auth-pill-btn:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(27,94,32,0.55);
  transform: translateY(-1px);
}
.auth-input {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.auth-input:focus {
  box-shadow: 0 0 0 4px rgba(46,125,50,0.08);
}
`;

export default function DriverLoginPage() {
  const navigate = useNavigate();
  const [showWebLogin, setShowWebLogin] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const triggerAppLaunch = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href =
        "intent://login#Intent;scheme=bemsdriver;package=com.bemsfarms.driver;end";
      setTimeout(() => {
        window.location.href = "bemsdriver://login";
      }, 500);
    } else if (isIOS) {
      window.location.href = "bemsdriver://login";
    } else {
      window.location.href = "bemsdriver://login";
    }
  };

  // Attempt automatic deep link launch on page mount
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAppLaunch();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleWebLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please enter your registered phone number or email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/driver/auth/login", {
        emailOrPhone: identifier.trim(),
        password,
      });

      const token = res.data?.token;
      if (token) {
        localStorage.setItem("driverToken", token);
        localStorage.setItem("driverData", JSON.stringify(res.data?.driver || {}));
        navigate("/driver/statement");
      } else {
        throw new Error("No authorization token received.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid phone number/email or password. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden"
      style={{ backgroundColor: "#FBF8F3" }}
    >
      <style>{AUTH_CSS}</style>

      {/* Decorative background blobs */}
      <div
        className="auth-blob"
        style={{
          width: 340,
          height: 340,
          top: -100,
          left: -100,
          background: "radial-gradient(circle, rgba(46,125,50,0.16), transparent 70%)",
        }}
      />
      <div
        className="auth-blob"
        style={{
          width: 280,
          height: 280,
          bottom: -80,
          right: -60,
          background: "radial-gradient(circle, rgba(245,158,11,0.14), transparent 70%)",
        }}
      />

      {/* Top Floating Back Button */}
      <Link
        to="/"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-950/10 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-emerald-900 shadow-md backdrop-blur transition hover:bg-white hover:shadow-lg hover:-translate-y-0.5"
      >
        <span aria-hidden="true">←</span> Back to Home
      </Link>

      {/* Outer Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-5xl w-full min-h-[620px] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
        style={{ boxShadow: "0 30px 80px -20px rgba(27,67,50,0.25)" }}
      >
        {/* Left Side: Branded Visual Pane */}
        <div className="w-full md:w-1/2 relative overflow-hidden h-[240px] md:h-auto min-h-[260px] shrink-0">
          <img
            src="https://images.unsplash.com/photo-1595858619620-13a826477b73?q=80&w=2070&auto=format&fit=crop"
            alt="Bems Farms Driver Fleet"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/45 to-emerald-950/20" />
          <div className="auth-grain" />

          {/* Fleet Badge Chip */}
          <div className="absolute top-6 md:top-10 left-6 md:left-10 z-10">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/95 px-3.5 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              🚚 Logistics &amp; Delivery
            </span>
          </div>

          {/* Left Text Content */}
          <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 text-white z-10 text-left">
            <h2 className="text-[26px] md:text-[36px] font-bold leading-tight font-display mb-3">
              Bems Farms <br />
              <span className="font-light italic text-emerald-200">Driver Fleet App</span>
            </h2>
            <p className="text-emerald-100/85 text-[13px] md:text-[14px] font-medium max-w-sm leading-relaxed">
              Order dispatch, GPS navigation, and earnings are handled in real-time in the official BemsFarms Driver App.
            </p>
          </div>
        </div>

        {/* Right Side: Actions Pane */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-between overflow-y-auto">
          <div className="w-full max-w-sm mx-auto my-auto text-left">
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl font-bold shadow-md shadow-emerald-900/10">
                🛵
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                Mobile Driver Gateway
              </span>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 font-display">
                Open Driver App
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                Your deliveries, routes, and earnings are managed in the <strong>BemsFarms Driver App</strong>. Tap below to launch your app.
              </p>

              {/* Primary Launch Action */}
              <button
                type="button"
                onClick={triggerAppLaunch}
                className="w-full auth-pill-btn bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider py-4 px-6 rounded-full shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📱 Open BemsFarms Driver App</span>
                <span>→</span>
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <Link
                  to="/driver/reset-password"
                  className="text-emerald-800 hover:text-emerald-950 font-bold underline transition"
                >
                  Forgot Password?
                </Link>
                <span className="text-gray-300">•</span>
                <a
                  href="https://bemsfarms.com/downloads/BemsDriver.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-emerald-800 font-semibold underline transition"
                >
                  Download App (.apk)
                </a>
              </div>

              {/* Emergency web login option */}
              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setShowWebLogin(!showWebLogin)}
                  className="text-[11px] text-gray-500 hover:text-emerald-800 underline transition"
                >
                  {showWebLogin ? "Hide web statement login" : "Need to view statement on computer?"}
                </button>
              </div>

              {showWebLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 pt-4 border-t border-gray-100 text-left"
                >
                  {error && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleWebLogin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-700 mb-1 uppercase tracking-wider">
                        Phone or Email
                      </label>
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="09066774160"
                        className="auth-input w-full px-3.5 py-2.5 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-xs font-medium outline-none bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-gray-500 font-bold"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="auth-input w-full px-3.5 py-2.5 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-xs font-medium outline-none bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full auth-pill-btn bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-full shadow transition disabled:opacity-50"
                    >
                      {loading ? "Signing in…" : "Sign In to View Statement"}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <Link
              to="/driver/onboarding"
              className="text-emerald-800 hover:text-emerald-950 font-bold transition"
            >
              Become a Driver →
            </Link>
            <span>Bems Farms Fleet</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
