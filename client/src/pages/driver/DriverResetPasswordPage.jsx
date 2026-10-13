import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
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

export default function DriverResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || searchParams.get("code") || "";
  const phoneFromUrl = searchParams.get("phone") || searchParams.get("email") || "";

  // View modes: "reset" | "request"
  const [mode, setMode] = useState("reset");
  const [token, setToken] = useState(tokenFromUrl);
  const [identifier, setIdentifier] = useState(phoneFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Sync token and identifier if query params update
  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setMode("reset");
    }
    if (phoneFromUrl && !identifier) {
      setIdentifier(phoneFromUrl);
    }
  }, [tokenFromUrl, phoneFromUrl]);

  // Deep link function to trigger the Mobile Driver App
  const openDriverApp = () => {
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

  // Automated countdown and redirection into the app once password reset succeeds
  useEffect(() => {
    if (!success) return;

    const initialTimer = setTimeout(() => {
      openDriverApp();
    }, 1200);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          openDriverApp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [success]);

  // Handler for requesting a new reset token
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your registered phone number or email address.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/driver/auth/forgot-password", {
        emailOrPhone: cleanId,
      });
      setInfoMsg("A 6-digit verification code has been sent! Enter it below to set your password.");
      setMode("reset");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not send reset code. Please ensure your phone number or email is registered."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler for resetting password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const cleanToken = token.trim();
    if (!cleanToken) {
      setError("Please enter the 6-digit verification code sent to your phone or email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/driver/auth/reset-password", {
        token: cleanToken,
        password,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. The verification code may have expired or is invalid."
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
        {/* Left Side: Branded Farm & Fleet Visual Pane */}
        <div className="w-full md:w-1/2 relative overflow-hidden h-[240px] md:h-auto min-h-[260px] shrink-0">
          <img
            src="https://images.unsplash.com/photo-1595858619620-13a826477b73?q=80&w=2070&auto=format&fit=crop"
            alt="Bems Farms Fleet"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Emerald Gradient Overlay */}
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
              🚚 Driver Fleet
            </span>
          </div>

          {/* Left Text Content */}
          <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 text-white z-10 text-left">
            <h2 className="text-[26px] md:text-[36px] font-bold leading-tight font-display mb-3">
              Driver Account <br />
              <span className="font-light italic text-emerald-200">Password Reset</span>
            </h2>
            <p className="text-emerald-100/85 text-[13px] md:text-[14px] font-medium max-w-sm leading-relaxed">
              Reset your courier password securely on web. Once updated, you will be redirected seamlessly into the Bems Farms Driver App.
            </p>
          </div>
        </div>

        {/* Right Side: Form & Actions Pane */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-between overflow-y-auto">
          <div className="w-full max-w-sm mx-auto my-auto text-left">
            {success ? (
              /* ─────────────────────────────────────────────────────────────
                 SUCCESS STATE: Password Reset Done -> Redirecting to App
                 ───────────────────────────────────────────────────────────── */
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl font-bold shadow-md shadow-emerald-900/10">
                  ✓
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                  Password Updated
                </span>

                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 font-display">
                  You’re All Set!
                </h1>

                <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                  Your new driver password is now active. Launching the <strong>BemsFarms Driver App</strong> so you can sign in directly.
                </p>

                {/* Animated Countdown Progress */}
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                  <p className="text-xs font-semibold text-emerald-900 mb-2">
                    {countdown > 0
                      ? `Opening Driver App in ${countdown} second${countdown === 1 ? "" : "s"}…`
                      : "Launching BemsFarms Driver App…"}
                  </p>
                  <div className="w-full bg-emerald-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-700 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${((4 - countdown) / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* App Launch Button */}
                <button
                  type="button"
                  onClick={openDriverApp}
                  className="w-full auth-pill-btn bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider py-4 px-6 rounded-full shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📱 Open Driver App &amp; Sign In</span>
                  <span>→</span>
                </button>

                <p className="text-[12px] text-gray-500 mt-3">
                  If the app did not open automatically, tap the button above to launch it directly.
                </p>

                <div className="my-6 border-t border-gray-100" />

                {/* APK Download Link */}
                <div className="text-center">
                  <a
                    href="https://bemsfarms.com/downloads/BemsDriver.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline transition"
                  >
                    Need to install the Driver App (.apk)? Tap here →
                  </a>
                </div>
              </div>
            ) : mode === "request" ? (
              /* ─────────────────────────────────────────────────────────────
                 REQUEST CODE MODE: Enter Phone / Email
                 ───────────────────────────────────────────────────────────── */
              <div>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError("");
                      setInfoMsg("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 transition mb-3"
                  >
                    <span aria-hidden="true">←</span> I already have a code
                  </button>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display">
                    Request Reset Code
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                    Enter your registered driver phone number or email address to receive your 6-digit code.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRequestToken} className="space-y-4">
                  <div>
                    <label
                      htmlFor="driver-identifier"
                      className="block text-[11px] font-extrabold text-gray-700 mb-1.5 uppercase tracking-wider"
                    >
                      Driver Phone or Email
                    </label>
                    <input
                      id="driver-identifier"
                      name="driver_identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 09066774160 or email@domain.com"
                      className="auth-input w-full px-4 py-3 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-sm font-medium outline-none text-gray-900 bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full auth-pill-btn bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-6 rounded-full shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span>Sending Code…</span>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ─────────────────────────────────────────────────────────────
                 RESET PASSWORD MODE: Enter Code & New Password
                 ───────────────────────────────────────────────────────────── */
              <div>
                <div className="mb-5">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                    Driver Security
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display">
                    Reset Your Password
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                    Enter the 6-digit code sent to you, then choose your new password.
                  </p>
                </div>

                {infoMsg && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    {infoMsg}
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Verification Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="driver-reset-code"
                        className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider"
                      >
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("request");
                          setError("");
                          setInfoMsg("");
                        }}
                        className="text-[11px] text-emerald-800 hover:text-emerald-950 font-extrabold underline transition"
                      >
                        Need a code?
                      </button>
                    </div>
                    <input
                      id="driver-reset-code"
                      name="driver_reset_code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={token}
                      onChange={(e) => setToken(e.target.value.trim())}
                      placeholder="e.g. 123456"
                      maxLength={6}
                      className="auth-input w-full px-4 py-3 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-base font-bold tracking-widest text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal outline-none bg-white text-center"
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="driver-new-password"
                        className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider"
                      >
                        New Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 font-bold transition"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      id="driver-new-password"
                      name="driver_new_password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="auth-input w-full px-4 py-3 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-sm font-medium outline-none text-gray-900 bg-white"
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="driver-confirm-password"
                      className="block text-[11px] font-extrabold text-gray-700 mb-1.5 uppercase tracking-wider"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="driver-confirm-password"
                      name="driver_confirm_password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="auth-input w-full px-4 py-3 border-2 border-gray-200 focus:border-emerald-700 rounded-xl text-sm font-medium outline-none text-gray-900 bg-white"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full auth-pill-btn bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-6 rounded-full shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <span>Updating Password…</span>
                    ) : (
                      <>
                        <span>Reset Password &amp; Open Driver App</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <Link
              to="/driver/login"
              className="text-emerald-800 hover:text-emerald-950 font-bold transition"
            >
              ← Back to Driver Gateway
            </Link>
            <span>Bems Farms Fleet</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
