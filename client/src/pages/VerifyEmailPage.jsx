import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

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

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem("bemsfarms_pending_email") || "";
  const requestedDestination = location.state?.from || sessionStorage.getItem("bemsfarms_post_auth_destination");
  const destination = typeof requestedDestination === "string" && requestedDestination.startsWith("/") && !requestedDestination.startsWith("//")
    ? requestedDestination
    : "/home";

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setSuccess("");
    if (!token.trim() || token.length < 6) {
      return setError("Enter the 6-digit code from your email.");
    }
    setLoading(true);
    try {
      await verifyEmail(email, token);
      sessionStorage.removeItem("bemsfarms_pending_email");
      navigate("/onboarding", { replace: true, state: { from: destination } });
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResendLoading(true);
    try {
      const res = await resendVerification(email);
      setSuccess(res.message || "A new code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden"
      style={{ backgroundColor: "#FBF8F3" }}
    >
      <style>{AUTH_CSS}</style>

      {/* Decorative blobs on the cream backdrop */}
      <div
        className="auth-blob"
        style={{ width: 320, height: 320, top: -100, left: -100, background: "radial-gradient(circle, rgba(46,125,50,0.16), transparent 70%)" }}
      />
      <div
        className="auth-blob"
        style={{ width: 260, height: 260, bottom: -80, right: -60, background: "radial-gradient(circle, rgba(245,158,11,0.14), transparent 70%)" }}
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
        className="max-w-5xl w-full h-auto md:h-[680px] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
        style={{ boxShadow: "0 30px 80px -20px rgba(27,67,50,0.25)" }}
      >
        {/* Left Side: Image Pane */}
        <div className="w-full md:w-1/2 relative overflow-hidden h-[240px] md:h-full shrink-0">
          <img
            src="https://images.unsplash.com/photo-1595858619620-13a826477b73?q=80&w=2070&auto=format&fit=crop"
            alt="Farm Produce"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
          <div className="auth-grain" />

          {/* Glass chip */}
          <div className="absolute top-6 md:top-10 left-6 md:left-12 z-10">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/90 px-3.5 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(6px)" }}
            >
               Security
            </span>
          </div>

          {/* Text Overlay */}
          <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12 text-white z-10 text-left">
            <h2 className="text-[28px] md:text-[38px] font-bold leading-tight font-display mb-3">
              Verify Your <br />
              <span style={{ fontFamily: "var(--custom-font)", fontWeight: 400 }}>Email Address</span>
            </h2>
            <p className="text-emerald-100/80 text-[13px] md:text-[15px] font-medium max-w-xs leading-relaxed">
              We've sent a 6-digit code to your email. Enter it to verify your account and continue.
            </p>
          </div>
        </div>

        {/* Right Side: Form Pane */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-between overflow-y-auto">

          <div className="w-full max-w-sm mx-auto my-auto text-left">
            <div className="mb-5 flex items-center gap-2" aria-label="Account setup progress">
              {["Account", "Verify", "Preferences"].map((label, index) => (
                <div key={label} className="flex flex-1 items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index <= 1 ? "bg-emerald-900 text-white" : "bg-gray-100"}`}>{index + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 transition"
              >
                <span aria-hidden="true">←</span> Back to Register
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 font-display">Check your email</h1>
            <p className="text-gray-500 text-[14px] mb-8 font-medium">
              Sent to: <span className="font-bold text-gray-700">{email}</span>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 text-xs font-semibold mb-6 flex items-center gap-2">
                <span style={{fontSize:'1.35em'}}></span> {error}
              </div>
            )}
            
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3.5 text-xs font-semibold mb-6 flex items-center gap-2">
                <span style={{fontSize:'1.35em'}}></span> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Token */}
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  6-Digit Code
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0,6))}
                  placeholder="123456"
                  maxLength="6"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  aria-describedby="verification-help"
                  className="auth-input w-full px-5 py-3.5 border-2 border-gray-100 focus:border-emerald-700 rounded-2xl text-[24px] tracking-[0.55rem] text-center font-bold outline-none placeholder-gray-300 bg-gray-50/50"
                  required
                />
                <p id="verification-help" className="mt-2 text-xs leading-5 text-gray-500">The code may take a minute to arrive. Check your spam folder if you do not see it.</p>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn w-full bg-[#1B5E20] hover:bg-emerald-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/10 text-[15px] disabled:opacity-50 mt-2"
              >
                {loading ? "Verifying…" : "Verify and continue"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-emerald-700 hover:text-emerald-800 text-sm font-bold transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending…" : "Send a new code"}
              </button>
            </div>
          </div>

          {/* Footer decoration */}
          <div className="mt-8 text-center text-[11px] text-gray-400 font-medium">
            <span>© 2026 BemsFarms. Secure registration.</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
