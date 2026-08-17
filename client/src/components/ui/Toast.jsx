import { AnimatePresence, motion } from "framer-motion";

// Small, in-app, non-blocking replacement for window.alert() — a native
// alert steals focus and blocks the page until dismissed, which is worse
// UX than a message that just tells you what happened and goes away.
export default function Toast({ toast, onClose }) {
  const isError = toast?.type === "error";
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            background: isError ? "#DC2626" : "#1B4332",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 12,
            fontFamily: "var(--body-font)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            maxWidth: "90vw",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          role="status"
        >
          {toast.message}
          <button
            onClick={onClose}
            aria-label="Dismiss"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}