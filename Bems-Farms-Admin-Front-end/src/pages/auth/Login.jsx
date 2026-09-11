import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { isStaffRole, STAFF_HOME } from "../../lib/roles";
import toast from "react-hot-toast";

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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      return setError("Please enter your staff email and password.");
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message;
      const msg = serverMessage || "Invalid staff credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF8F5] text-slate-900 font-sans selection:bg-[#143c2d] selection:text-white">
      {/* ── LEFT HALF: EXECUTIVE BRAND & VISUAL BACKDROP (DESKTOP) ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#071F14]">
        {/* Background Image with Rich Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/bems_farms_twilight.jpg"
            alt="Bems Farms Facility"
            className="w-full h-full object-cover object-center scale-105 filter brightness-75 contrast-110"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/bems_store_aisles.jpg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04120B] via-[#071F14]/85 to-[#092B1C]/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10">
          <a
            href="https://www.bemsfarms.com"
            className="inline-flex items-center bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/90 hover:scale-[1.02] transition-all duration-200"
          >
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="h-9 w-auto object-contain" />
          </a>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 mb-6 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Authorized Management System</span>
          </div>

          <h1 className="font-display text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight mb-4">
            Unified Farm Logistics, Fulfillment &amp; Order Routing
          </h1>
          <p className="text-sm xl:text-base text-emerald-100/80 leading-relaxed mb-8">
            Access live warehouse stock levels, dispatch rider tracking, demand forecasting, and automated issue resolution across all zones.
          </p>

          {/* Quick Pillar Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
              <p className="text-xs font-bold text-emerald-300">Role-Based Access</p>
              <p className="text-[11px] text-emerald-100/70 mt-0.5">Strict privileges for dispatch &amp; finance</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
              <p className="text-xs font-bold text-amber-300">Live Inventory Audit</p>
              <p className="text-[11px] text-emerald-100/70 mt-0.5">Real-time depletion and restock sync</p>
            </div>
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-emerald-300/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Core API: <strong>Operational (99.98%)</strong></span>
          </div>
          <span className="text-[11px] text-emerald-200/50">Internal v2.4</span>
        </div>
      </div>

      {/* ── RIGHT HALF: CLEAN AUTHENTICATION FORM CANVAS ── */}
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-[#FAF9F5] p-6 sm:p-10 lg:p-16">
        {/* Top Nav Action */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          {/* Mobile Logo on White Badge */}
          <a
            href="https://www.bemsfarms.com"
            className="lg:hidden inline-flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
          >
            <img src="/bemsfarms_logo_compact.png" alt="Bems Farms" className="h-7 w-auto object-contain" />
          </a>

          <a
            href="https://www.bemsfarms.com"
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-[#143c2d] hover:text-[#143c2d] hover:bg-[#143c2d]/5 transition shadow-2xs"
          >
            <span>Customer Storefront</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>

        {/* Centered Login Card */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 mb-3.5">
                <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                <span>Staff Portal</span>
              </div>
              <h2 className="font-display text-3xl font-black text-slate-900 tracking-tight">
                Staff Sign In
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Sign in with your authorized Bems Farms administrator or staff account.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                role="alert"
                className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800 flex items-start gap-3"
              >
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="admin-email">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#143c2d] focus:ring-2 focus:ring-[#143c2d]/15 transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="admin-password">
                  Security Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#143c2d] focus:ring-2 focus:ring-[#143c2d]/15 transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                className="w-full rounded-xl bg-[#143c2d] hover:bg-[#1a4e3b] text-white py-3.5 text-sm font-black uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Hub</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Security Footer */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                <span>Encrypted 256-Bit SSL</span>
              </div>
              <span>Role-Based Audit Active</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom copyright */}
        <div className="w-full max-w-md mx-auto text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Bems Farms Limited &bull; Internal Operations Portal
        </div>
      </div>
    </div>
  );
}
