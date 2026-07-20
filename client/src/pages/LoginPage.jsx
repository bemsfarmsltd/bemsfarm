import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from || "/home";

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      return setError("Please fill in all fields");
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
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
      await loginWithGoogle(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
  };

  return (
    <div className="min-h-screen bg-[#2E7D32] flex items-center justify-center p-4 md:p-8 font-sans">
      
      {/* Outer Card Container */}
      <div className="max-w-5xl w-full h-auto md:h-[680px] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Side: Video Pane */}
        <div className="w-full md:w-1/2 relative overflow-hidden h-[240px] md:h-full shrink-0">
          <video
            src="https://res.cloudinary.com/dyzkjerez/video/upload/v1784540535/Create_a_vibrant_and_animated_u6qaef.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark green gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
          
          {/* Text Overlay */}
          <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12 text-white z-10 text-left">
            <h2 className="text-[28px] md:text-[38px] font-bold leading-tight font-serif mb-3">
              Welcome Back to <br />
              BemsFarms
            </h2>
            <p className="text-emerald-100/80 text-[13px] md:text-[15px] font-medium max-w-xs leading-relaxed">
              Access your personalized dashboard and source premium, fresh Nigerian farm produce directly.
            </p>
          </div>
        </div>

        {/* Right Side: Form Pane */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-between overflow-y-auto">
          
          {/* Header decoration */}
          <div className="flex justify-end text-gray-400 text-xs font-semibold mb-6">
            <span>English (USA) ▼</span>
          </div>

          <div className="w-full max-w-sm mx-auto my-auto text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Sign in</h1>
            <p className="text-gray-500 text-[14px] mb-8 font-medium">
              Don't have an account?{" "}
              <Link to="/register" className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors">
                Sign Up
              </Link>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 text-xs font-semibold mb-6 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-5 py-3.5 border-2 border-gray-100 focus:border-emerald-700 rounded-2xl text-[14px] font-medium outline-none transition-all placeholder-gray-300 bg-gray-50/50"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[13px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-3.5 border-2 border-gray-100 focus:border-emerald-700 rounded-2xl text-[14px] font-medium outline-none transition-all placeholder-gray-300 bg-gray-50/50"
                  required
                />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B5E20] hover:bg-emerald-900 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/10 text-[15px] disabled:opacity-50 mt-2"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-[1px] bg-gray-100" />
              <span className="text-gray-400 text-xs font-bold tracking-widest">OR</span>
              <div className="flex-1 h-[1px] bg-gray-100" />
            </div>

            {/* Google OAuth Login */}
            <div className="w-full flex justify-center">
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
          </div>

          {/* Footer decoration */}
          <div className="mt-8 text-center text-[11px] text-gray-400 font-medium">
            <span>© 2026 BemsFarms. Secure farm-to-table access.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
