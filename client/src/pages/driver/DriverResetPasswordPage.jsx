import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../services/api";

export default function DriverResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [copied, setCopied] = useState(false);
  const [showWebForm, setShowWebForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const triggerAppResetLaunch = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const tokenParam = encodeURIComponent(token || tokenFromUrl || "");

    if (isAndroid) {
      window.location.href = `intent://reset-password?token=${tokenParam}#Intent;scheme=bemsdriver;package=com.bemsfarms.driver;end`;
      setTimeout(() => {
        window.location.href = `bemsdriver://reset-password?token=${tokenParam}`;
      }, 500);
    } else {
      window.location.href = `bemsdriver://reset-password?token=${tokenParam}`;
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      const timer = setTimeout(() => {
        triggerAppResetLaunch();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [tokenFromUrl]);

  const copyCode = () => {
    const code = token || tokenFromUrl;
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebReset = async (e) => {
    e.preventDefault();
    setError("");

    const cleanToken = token.trim();
    if (!cleanToken) {
      setError("Please provide the 6-digit verification code.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
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
          "Failed to reset password. The link or code may have expired."
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
            🔐
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Driver App Password Reset</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">
            Set Password in Driver App
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
            Your verification code is ready. Launch the <strong>BemsFarms Driver App</strong> to enter this code and configure your secure driver password.
          </p>

          {/* Verification Code Display Badge */}
          {token && (
            <div className="mb-6 p-4 rounded-xl bg-black/60 border border-emerald-500/40 text-center">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                Your 6-Digit Verification Code
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest my-1">
                {token}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition cursor-pointer"
              >
                <span>{copied ? "✓ Copied to Clipboard!" : "📋 Copy Code"}</span>
              </button>
            </div>
          )}

          {/* Big App Launch Action */}
          <button
            onClick={triggerAppResetLaunch}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <span>📱 Open Driver App to Set Password</span>
            <span>→</span>
          </button>

          <p className="text-[11px] text-gray-500 mt-3">
            Tapping the button opens the password configuration screen in your BemsFarms Driver App.
          </p>

          <div className="my-6 border-t border-white/10" />

          {/* Quick Step Guide */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-bold text-white mb-2">How to finish setting your password:</p>
            <ol className="text-[11px] text-gray-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Copy the 6-digit code shown above.</li>
              <li>Tap <strong>"Open Driver App to Set Password"</strong>.</li>
              <li>Paste or type the code in the app and set your new password.</li>
            </ol>
          </div>

          {/* Download App Option */}
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

          {/* Discreet Emergency Web Reset Form Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowWebForm(!showWebForm)}
              className="text-[11px] text-gray-500 hover:text-gray-400 underline transition"
            >
              {showWebForm ? "▲ Hide web reset form" : "Emergency desktop password reset"}
            </button>
          </div>

          {showWebForm && (
            <div className="mt-6 pt-6 border-t border-white/10 text-left">
              {success ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center">
                  <p className="font-bold text-sm text-white mb-1">✓ Password Updated Successfully!</p>
                  <p>Open your Driver App and sign in using your new password.</p>
                </div>
              ) : (
                <form onSubmit={handleWebReset} className="space-y-3.5">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 123456"
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimum 6 characters"
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

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter password"
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-white/20 transition"
                  >
                    {loading ? "Updating…" : "Update Password on Web"}
                  </button>
                </form>
              )}
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
