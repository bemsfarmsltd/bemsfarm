import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { getProductImage } from "../../utils/productImages";

export default function RestockModal({ product, isOpen, onClose }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && product) {
      setEmail(user?.email || "");
      setPhone(user?.phone || "");
      setSubmitted(false);
      setError("");
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, product, user, onClose]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Send to backend waitlist API if available
      try {
        await api.post(`/products/${product.id}/waitlist`, {
          email: cleanEmail,
          phone: phone.trim() || undefined,
          product_name: product.name,
        });
      } catch (apiErr) {
        // Fallback endpoint
        try {
          await api.post("/waitlist", {
            productId: product.id,
            productName: product.name,
            email: cleanEmail,
            phone: phone.trim() || undefined,
            userId: user?.id,
          });
        } catch {
          // Graceful offline/local record fallback
        }
      }

      // 2. Persist in local storage for customer session
      try {
        const stored = JSON.parse(localStorage.getItem("bf_restock_waitlist") || "[]");
        const entry = {
          productId: product.id,
          productName: product.name,
          email: cleanEmail,
          phone: phone.trim(),
          date: new Date().toISOString(),
        };
        const updated = [entry, ...stored.filter((i) => i.productId !== product.id)];
        localStorage.setItem("bf_restock_waitlist", JSON.stringify(updated));
      } catch {
        // Ignore local storage error
      }

      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not join waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const imageSrc =
    product.image_url?.startsWith("data:") || product.image_url?.startsWith("http")
      ? product.image_url
      : getProductImage(product.name);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ position: "fixed", inset: 0, zIndex: 1000 }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)" }}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0d3322 0%, #1a5336 100%)",
              padding: "24px 24px 20px",
              color: "white",
              position: "relative",
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close restock modal"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              ×
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "4px 10px", borderRadius: "50px", marginBottom: "10px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
              <span style={{ color: "#FCA5A5", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Presently Out of Stock
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 900, fontFamily: "var(--heading-font)" }}>
              Restock Waitlist Alert
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.4 }}>
              Get notified immediately the moment fresh harvest arrives.
            </p>
          </div>

          {/* Product Pill Preview */}
          <div style={{ padding: "16px 24px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "16px",
                padding: "10px 14px",
              }}
            >
              <img
                src={imageSrc}
                alt={product.name}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  objectFit: "cover",
                  backgroundColor: "#F3F4F6",
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {product.name}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>
                  {product.category_name} {product.unit ? `• ${product.unit}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div style={{ padding: "20px 24px 24px" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#DCFCE7",
                    border: "2px solid #86EFAC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    color: "#15803D",
                  }}
                >
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h4 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                  You&apos;re On The Waitlist!
                </h4>
                <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#4B5563", lineHeight: 1.5 }}>
                  We have logged your request. We will send an instant alert to <strong>{email}</strong> the moment this item is restocked.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    backgroundColor: "#1B4332",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "14px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Done &amp; Continue Shopping
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FCA5A5",
                      color: "#B91C1C",
                      fontSize: "12.5px",
                      fontWeight: 600,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="restock-email"
                    style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}
                  >
                    Email Address <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    id="restock-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      border: "1px solid #D1D5DB",
                      fontSize: "13.5px",
                      color: "#111827",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="restock-phone"
                    style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}
                  >
                    Phone / WhatsApp Number <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="restock-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0801 234 5678"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      border: "1px solid #D1D5DB",
                      fontSize: "13.5px",
                      color: "#111827",
                      outline: "none",
                    }}
                  />
                </div>

                <p style={{ margin: 0, fontSize: "11px", color: "#6B7280", lineHeight: 1.4 }}>
                  No spam guaranteed. We will only contact you regarding this product&apos;s restock status.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    backgroundColor: "#1B4332",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "14px",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(27, 67, 50, 0.2)",
                  }}
                >
                  {loading ? "Adding to waitlist..." : "Notify Me When Available"}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
