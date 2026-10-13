import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../services/api";

export default function DriverResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  // View modes: "reset" | "request"
  const [mode, setMode] = useState("reset");
  const [token, setToken] = useState(tokenFromUrl);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Update token if query param changes
  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setMode("reset");
    }
  }, [tokenFromUrl]);

  // Deep link function to trigger the Mobile Driver App
  const openDriverApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Android Intent URL opens the native app package directly
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

    // Immediately trigger initial attempt after a brief moment so user sees the success message
    const initialTimer = setTimeout(() => {
      openDriverApp();
    }, 1200);

    // Countdown timer from 4 to 0
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
      setInfoMsg("A 6-digit verification code has been sent to your email! Enter it below.");
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
      setError("Please enter your 6-digit verification code from your email or SMS.");
      return;
    }

    if (password.length < 6) {
      setError("New password must be at least 6 characters long.");
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
          "Failed to reset password. The 6-digit code may have expired or is invalid."
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
            to="/driver/login"
            className="text-xs text-gray-400 hover:text-white transition"
          >
            Driver App →
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {success ? (
            /* ─────────────────────────────────────────────────────────────
               SUCCESS STATE: Password Reset Done -> Redirecting to App
               ───────────────────────────────────────────────────────────── */
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30 animate-bounce">
                ✓
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Password Reset Complete</span>
              </div>

              <h1 className="text-2xl font-black text-white mb-2">
                Password Updated Successfully!
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 mb-6 leading-relaxed">
                Your new driver courier password is now active. Launching the <strong>BemsFarms Driver App</strong> so you can sign in directly.
              </p>

              {/* Countdown Banner */}
              <div className="mb-6 p-4 rounded-xl bg-black/60 border border-emerald-500/40 text-center">
                <p className="text-xs text-emerald-300 font-medium mb-1">
                  {countdown > 0
                    ? `Opening Driver App in ${countdown} second${countdown === 1 ? "" : "s"}…`
                    : "Launching BemsFarms Driver App…"}
                </p>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden mt-2">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${((4 - countdown) / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Big Manual App Launch Action */}
              <button
                type="button"
                onClick={openDriverApp}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
              >
                <span>📱 Open BemsFarms Driver App &amp; Sign In</span>
                <span>→</span>
              </button>

              <p className="text-[11px] text-gray-500 mt-3">
                If the app did not open automatically, tap the button above to launch it directly on your phone.
              </p>

              <div className="my-6 border-t border-white/10" />

              {/* Secondary Download Option */}
              <div className="text-center">
                <a
                  href="https://bemsfarms.com/downloads/BemsDriver.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Need to download the Driver App (.apk)? Tap here →
                </a>
              </div>
            </div>
          ) : mode === "request" ? (
            /* ─────────────────────────────────────────────────────────────
               REQUEST CODE MODE: Enter Phone / Email to get reset code
               ───────────────────────────────────────────────────────────── */
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                  <span>📩</span>
                  <span>Driver Account Recovery</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Request Password Reset Code
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                  Enter your registered phone number or email address. We will send a 6-digit verification code to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <span className="text-base leading-none">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Registered Phone Number or Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09066774160 or email@domain.com"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    We will send the 6-digit verification code to your email.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin text-base">⟳</span>
                      <span>Sending Code…</span>
                    </>
                  ) : (
                    <span>Send Verification Code →</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-gray-400">
                <span>Already have a 6-digit code? </span>
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                >
                  Enter Code &amp; Reset Password
                </button>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               RESET PASSWORD FORM (Primary Web Form)
               ───────────────────────────────────────────────────────────── */
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                  <span>🔐</span>
                  <span>Driver Account Security</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Reset Driver Password
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                  Enter your verification code and configure your new secure password on web. Once updated, you will be redirected to log in on the Driver App.
                </p>
              </div>

              {infoMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                  <span>✓</span>
                  <span>{infoMsg}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <span className="text-base leading-none">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 6-Digit Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-300">
                      Verification Code (6-Digit Token) *
                    </label>
                    {tokenFromUrl && (
                      <span className="text-[11px] text-emerald-400 font-medium">
                        ✓ From email link
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                    <span>Sent to your verified driver email.</span>
                    <button
                      type="button"
                      onClick={() => setMode("request")}
                      className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Need a new code?
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-300">
                      New Password *
                    </label>
                    <span className="text-[11px] text-gray-500">Minimum 6 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter new password"
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Confirm New Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {password && confirmPassword && (
                    <span
                      className={`text-[11px] mt-1 block ${
                        password === confirmPassword ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {password === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </span>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin text-base">⟳</span>
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <span>Reset Password &amp; Open Driver App →</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-gray-400">
                <span>Remember your password? </span>
                <Link to="/driver/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
                  Back to Driver App Launch
                </Link>
              </div>
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
