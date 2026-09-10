import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/bemsfarms_logo_compact.png";
import { STAFF_ROLES } from "../components/ProtectedRoute";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout, user, isLoggedIn } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/admin";

  useEffect(() => {
    if (isLoggedIn && user) {
      if (STAFF_ROLES.includes(user.role)) {
        navigate(from, { replace: true });
      } else {
        // If a customer is logged in and visits admin login, notify them
        setError("Your active account is a customer account. Please log in with staff credentials.");
      }
    }
  }, [isLoggedIn, user, from, navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      return setError("Please enter your staff email and password.");
    }

    setLoading(true);
    try {
      const responseUser = await login(email.trim(), password);
      // Verify staff role
      if (responseUser && !STAFF_ROLES.includes(responseUser.role)) {
        // Log out immediately if not staff
        await logout();
        setError("Access Denied: This portal is strictly restricted to Bems Farms staff and administrators.");
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid staff credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#04120B] via-[#082015] to-[#030D08] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Mesh & Glows */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-950/40 blur-[150px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md group-hover:border-emerald-400/40 transition">
            <img src={logo} alt="Bems Farms" className="h-8 w-auto brightness-110" />
          </div>
          <div>
            <span className="font-display text-sm font-black tracking-wider text-white uppercase block">
              Bems Farms
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              Internal Operations
            </span>
          </div>
        </Link>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 backdrop-blur-md px-4 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900/60 hover:text-white hover:border-emerald-400/50 transition shadow-sm"
        >
          <span>Customer Storefront</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </header>

      {/* Main Executive Split Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Command Hub Showcase (Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl bg-gradient-to-br from-emerald-950/80 via-[#0A2E1C]/70 to-[#04160E]/90 border border-emerald-500/20 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient inner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300 mb-6">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Executive Command Hub</span>
              </div>

              <h2 className="font-display text-3xl font-black text-white tracking-tight leading-tight mb-4">
                Enterprise Operations & Logistics Control
              </h2>
              <p className="text-sm text-emerald-100/70 leading-relaxed mb-8">
                Secure access gateway for Bems Farms administrators, fulfillment leads, inventory managers, and dispatch fleet controllers.
              </p>

              {/* Feature telemetry grid */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span>RBAC Security</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/60 leading-tight">Role-based privileges & multi-tier access</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    <span>Real-Time Ops</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/60 leading-tight">Instant order dispatch & stock updates</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300 mb-1">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    <span>Audit Trail</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/60 leading-tight">Automated activity logging & ledger</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>256-Bit SSL</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/60 leading-tight">End-to-end encrypted session keys</p>
                </div>
              </div>
            </div>

            {/* System Telemetry Footer */}
            <div className="relative z-10 pt-8 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Core API: <strong>Operational</strong></span>
              </div>
              <span className="text-[11px] text-emerald-200/50">v2.4 Enterprise</span>
            </div>
          </motion.div>

          {/* Right Column: High-End Authentication Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <div className="w-full rounded-3xl bg-white text-slate-900 border border-white/40 shadow-2xl p-7 sm:p-10 relative overflow-hidden">
              
              {/* Card Header */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800 mb-3.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Authorized Personnel Only</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Staff Authentication
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Enter your credentials to access the operations hub.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  role="alert"
                  className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800 flex items-start gap-3"
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 transition shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="admin-password">
                      Security Password
                    </label>
                  </div>
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 transition shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
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
                  className="w-full rounded-xl bg-gradient-to-r from-[#0A2E1C] to-[#14422B] hover:from-[#114028] hover:to-[#1a5538] text-white py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Authenticating Credentials...</span>
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

              {/* Security Notice */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                  <span>Encrypted session</span>
                </div>
                <span>Role-Based Audit Active</span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-xs text-emerald-200/50">
        &copy; {new Date().getFullYear()} Bems Farms Limited &bull; Internal Operations System
      </footer>
    </div>
  );
}
