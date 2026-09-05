import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

const PREF_TAGS = [
  { id: "grains", label: "Grains & Cereals 🌾" },
  { id: "veg", label: "Vegetables 🥬" },
  { id: "oils", label: "Oils & Fats 🛢️" },
  { id: "tubers", label: "Tubers & Roots 🥔" },
  { id: "spices", label: "Spices & Seasonings 🌶️" },
];

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

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [selectedTags, setSelectedTags] = useState(["grains", "veg"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();

  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTag = (id) => {
    if (selectedTags.includes(id)) {
      setSelectedTags((prev) => prev.filter((t) => t !== id));
    } else {
      setSelectedTags((prev) => [...prev, id]);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please enter your full name");
    if (!form.email.trim()) return setError("Please enter your email");
    if (form.email.toLowerCase().trim() !== form.confirmEmail.toLowerCase().trim())
      return setError("Email addresses do not match");
    if (!form.phone.trim()) return setError("Please enter your phone number");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone, selectedTags);
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Google registration failed.");
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

      {/* Decorative blobs on the cream backdrop */}
      <div
        className="auth-blob"
        style={{ width: 320, height: 320, top: -100, right: -100, background: "radial-gradient(circle, rgba(46,125,50,0.16), transparent 70%)" }}
      />
      <div
        className="auth-blob"
        style={{ width: 260, height: 260, bottom: -80, left: -60, background: "radial-gradient(circle, rgba(245,158,11,0.14), transparent 70%)" }}
      />

      {/* Outer Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-5xl w-full h-auto md:h-[720px] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
        style={{ boxShadow: "0 30px 80px -20px rgba(27,67,50,0.25)" }}
      >
        {/* Left Side: Video Pane */}
        <div className="w-full md:w-1/2 relative overflow-hidden h-[240px] md:h-full shrink-0">
          <video
            src="https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_640/v1786166480/A_slow_looping_cinematic_shot_i0swkm.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark green gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
          <div className="auth-grain" />

          {/* Glass chip */}
          <div className="absolute top-6 md:top-10 left-6 md:left-12 z-10">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/90 px-3.5 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(6px)" }}
            >
              🌱 Join BemsFarms
            </span>
          </div>

          {/* Text Overlay */}
          <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12 text-white z-10 text-left">
            <h2 className="text-[28px] md:text-[38px] font-bold leading-tight font-display mb-3">
              Create your <br />
              Free Account
            </h2>
            <p className="text-emerald-100/80 text-[13px] md:text-[15px] font-medium max-w-xs leading-relaxed">
              Source premium, fresh Nigerian farm produce directly and support local growers!
            </p>
          </div>
        </div>

        {/* Right Side: Form Pane */}
        <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">

          <div className="w-full max-w-sm mx-auto my-auto text-left">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1 font-display">Sign up</h1>
            <p className="text-gray-500 text-[13px] mb-6 font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors">
                Sign In
              </Link>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs font-semibold mb-4 flex items-center gap-2">
                <span style={{fontSize:'1.35em'}}>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 hide-scrollbar">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="John Doe"
                  className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                  required
                />
              </div>

              {/* Email Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Confirm Email
                  </label>
                  <input
                    type="email"
                    value={form.confirmEmail}
                    onChange={(e) => handleInputChange("confirmEmail", e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+234..."
                  className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                  required
                />
              </div>

              {/* Password Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="••••••"
                    className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => handleInputChange("confirm", e.target.value)}
                    placeholder="••••••"
                    className="auth-input w-full px-4 py-2.5 border-2 border-gray-100 focus:border-emerald-700 rounded-xl text-[13px] font-medium outline-none placeholder-gray-300 bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              {/* Preferences selector tags */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Select Preferences
                </label>
                <div className="flex flex-wrap gap-2 py-1">
                  {PREF_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`text-xs px-3.5 py-1.5 rounded-full border transition-all font-semibold flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        {tag.label}
                        {isSelected && <span style={{fontSize:'1.35em'}} className="text-[10px] text-emerald-600">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn w-full bg-[#1B5E20] hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl shadow-lg text-[14px] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  "Create an Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-gray-100" />
              <span className="text-gray-400 text-[10px] font-bold tracking-widest">OR</span>
              <div className="flex-1 h-[1px] bg-gray-100" />
            </div>

            {/* Google Signup */}
            <div className="w-full flex justify-center scale-95">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in failed.")}
                useOneTap={false}
                theme="outline"
                size="large"
                width="100%"
                text="signup_with_google"
                shape="rectangular"
              />
            </div>
          </div>

          {/* Footer decoration */}
          <div className="mt-4 text-center text-[10px] text-gray-400 font-medium">
            <span>© 2026 BemsFarms. Secure registration.</span>
          </div>

        </div>

      </motion.div>

    </div>
  );
}