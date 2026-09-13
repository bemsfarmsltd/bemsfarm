// client/src/components/ui/BroadcastPopup.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BroadcastPopup() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [broadcast, setBroadcast] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBroadcast(null);
    if (!isLoggedIn || user?.role !== "user") return;

    let isMounted = true;
    async function checkActiveBroadcast() {
      try {
        const res = await api.get("/broadcasts/active");
        if (isMounted && res.data?.broadcast) {
          setBroadcast(res.data.broadcast);
        }
      } catch (err) {
        // Silently ignore if offline or not applicable
      }
    }

    // Check shortly after login or session initialization
    const timer = setTimeout(checkActiveBroadcast, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isLoggedIn, user?.id]);

  const handleDismiss = async () => {
    if (!broadcast) return false;
    setDismissing(true);
    try {
      await api.post(`/broadcasts/${broadcast.id}/dismiss`);
      setBroadcast(null);
      setError("");
      return true;
    } catch (err) {
      setError("Could not save acknowledgement. Please try again.");
      return false;
    } finally {
      setDismissing(false);
    }
  };

  const handleActionClick = async () => {
    const destination=broadcast?.action_url;
    if (await handleDismiss() && typeof destination === 'string' && /^\/(?!\/)[^\\\s]*$/.test(destination)) navigate(destination);
  };

  if (!broadcast) return null;

  const typeStyles = {
    promotion: {
      bg: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
      icon: "ri-gift-line",
      badge: "Special Offer",
      badgeBg: "rgba(255, 255, 255, 0.2)",
    },
    alert: {
      bg: "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
      icon: "ri-error-warning-line",
      badge: "Important Notice",
      badgeBg: "rgba(255, 255, 255, 0.2)",
    },
    personal: {
      bg: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
      icon: "ri-user-star-line",
      badge: "Message from Team",
      badgeBg: "rgba(255, 255, 255, 0.2)",
    },
    announcement: {
      bg: "linear-gradient(135deg, #17352a 0%, #265946 100%)",
      icon: "ri-megaphone-line",
      badge: "Store Announcement",
      badgeBg: "rgba(255, 255, 255, 0.2)",
    },
  };

  const theme = typeStyles[broadcast.type] || typeStyles.announcement;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Header Banner */}
          <div
            className="px-6 py-5 text-white relative overflow-hidden"
            style={{ background: theme.bg }}
          >
            <div className="flex items-center justify-between relative z-10">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
                style={{ background: theme.badgeBg }}
              >
                <i className={theme.icon} />
                {theme.badge}
              </span>
              <button
                onClick={handleDismiss}
                disabled={dismissing}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h3 className="mt-3 text-xl font-bold leading-snug tracking-tight text-white relative z-10">
              {broadcast.title}
            </h3>

            {/* Decorative background glow */}
            <div
              className="absolute -right-6 -bottom-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
            />
          </div>

          {/* Body */}
          <div className="p-6">
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {broadcast.message}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              {broadcast.action_label && broadcast.action_url && (
                <button
                  onClick={handleActionClick}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#17352a] hover:bg-[#204a3a] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>{broadcast.action_label}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}

              <button
                onClick={handleDismiss}
                disabled={dismissing}
                className={`w-full sm:w-auto py-3 px-5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors ${
                  !broadcast.action_label ? "w-full bg-[#17352a] text-white hover:bg-[#204a3a]" : ""
                }`}
              >
                {dismissing ? "Dismissing…" : "Got it"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
