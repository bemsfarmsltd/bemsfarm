import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function DriverLoginPage() {
  const navigate = useNavigate();
  const [showWebLogin, setShowWebLogin] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [launchStatus, setLaunchStatus] = useState("redirecting"); // "redirecting" | "opened"

  const triggerAppLaunch = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Android Intent URI automatically hands off to native package
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
    setLaunchStatus("opened");
  };

  // Attempt automatic deep link launch on page mount
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAppLaunch();
    }, 250);
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white flex flex-col justify-between px-4 py-8">
      <div className="max-w-md w-full mx-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
            <span className="text-xl font-black tracking-wider uppercase">Bems Farms</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Driver Fleet
            </span>
          </Link>
          <Link
            to="/driver/onboarding"
            className="text-xs text-gray-400 hover:text-white transition"
          >
            Onboarding →
          </Link>
        </div>

        {/* Primary App Redirection Card */}
        <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 animate-pulse">
            🛵
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Mobile App Direct Access</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">
            Launching BemsFarms Driver App…
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
            Order dispatches, GPS route navigation, doorstep delivery confirmations, and commission payouts are managed exclusively inside the <strong>BemsFarms Driver Mobile App</strong>.
          </p>

          {/* Big App Launch Action */}
          <button
            onClick={triggerAppLaunch}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <span>📱 Open BemsFarms Driver App</span>
            <span>→</span>
          </button>

          <p className="text-[11px] text-gray-500 mt-3">
            If the app did not open automatically, tap the button above to launch it directly.
          </p>

          <div className="my-6 border-t border-white/10" />

          {/* Download App Option */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="text-xl">📥</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-white mb-0.5">Don't have the Driver App installed?</p>
                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                  Install the official BemsFarms Driver App on your Android or iOS device to receive deliveries.
                </p>
                <a
                  href="https://bemsfarms.com/downloads/BemsDriver.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Download Driver App (.apk) →
                </a>
              </div>
            </div>
          </div>

          {/* Discreet Emergency Web Access Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowWebLogin(!showWebLogin)}
              className="text-[11px] text-gray-500 hover:text-gray-400 underline transition"
            >
              {showWebLogin ? "▲ Hide web access form" : "Emergency desktop access (view statement only)"}
            </button>
          </div>

          {/* Fallback Emergency Web Login Form (Only shown if explicitly toggled) */}
          {showWebLogin && (
            <div className="mt-6 pt-6 border-t border-white/10 text-left">
              <div className="mb-4">
                <span className="text-xs font-bold text-amber-400">⚠️ Desktop Statement Access Only:</span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Live order dispatches and delivery acceptance cannot be performed on web. Use this only to inspect your commission statement.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleWebLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Registered Phone Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09066774160 or email@domain.com"
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Password / PIN
                    </label>
                    <Link
                      to="/driver/reset-password"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter password"
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-[10px]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-white/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? "Verifying…" : "Sign In to View Statement"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 mt-8">
        © {new Date().getFullYear()} Bems Farms Logistics Fleet. All rights reserved.
      </div>
    </div>
  );
}
