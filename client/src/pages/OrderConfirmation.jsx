import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  // Real order ID, passed via router state from CheckoutPage's navigate() call
  // on success. Previously this was a fake Math.random() ID that had no
  // relation to the actual order — a customer quoting it to support would
  // get nowhere. Falls back gracefully if state is missing (e.g. a hard
  // refresh on this route, which drops React Router's in-memory state).
  const orderId = location.state?.orderId || null;

  return (
    <PageWrapper>
      <div
        style={{
          maxWidth: "600px",
          margin: isMobile ? "24px auto" : "60px auto",
          padding: isMobile ? "24px 16px" : "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Success animation */}
        <div
          style={{
            position: "relative",
            marginBottom: "32px",
            display: "inline-block",
          }}
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.3 + i * 0.3, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid #4CAF50",
              }}
            />
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            style={{
              width: isMobile ? "76px" : "100px",
              height: isMobile ? "76px" : "100px",
              borderRadius: "50%",
              backgroundColor: "#2E7D32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 16px 48px rgba(46,125,50,0.4)",
              position: "relative",
            }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              style={{ fontSize: isMobile ? "36px" : "48px", color: "white" }}
            >
              ✓
            </motion.span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1
            style={{
              fontSize: isMobile ? "24px" : "32px",
              fontWeight: 900,
              color: "#2E7D32",
              marginBottom: "12px",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            Order Confirmed! 🎉
          </h1>
          <p
            style={{
              color: "#5F6368",
              fontSize: "16px",
              lineHeight: 1.7,
              marginBottom: "8px",
            }}
          >
            Your order has been placed successfully.
          </p>
          <p
            style={{ color: "#9AA0A6", fontSize: "14px", marginBottom: "28px" }}
          >
            We're packing your fresh Nigerian foods right now!
          </p>

          {/* Order ID */}
          <div
            style={{
              backgroundColor: "#F8F9FA",
              border: "1px solid #E8EAED",
              borderRadius: "14px",
              padding: isMobile ? "14px 20px" : "16px 24px",
              marginBottom: isMobile ? "24px" : "32px",
              display: "inline-block",
              maxWidth: "100%",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#9AA0A6",
                marginBottom: "4px",
              }}
            >
              Order Reference
            </p>
            <p
              style={{
                fontSize: isMobile ? "16px" : "20px",
                fontWeight: 800,
                color: "#202124",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {orderId ? `#${orderId}` : "Check your Orders page for details"}
            </p>
          </div>

          {/* Steps */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0",
              marginBottom: isMobile ? "28px" : "40px",
              overflowX: isMobile ? "auto" : "visible",
              padding: isMobile ? "0 4px 4px" : 0,
            }}
          >
            {[
              { icon: "✅", label: "Order Placed" },
              { icon: "📦", label: "Being Packed" },
              { icon: "🚚", label: "Out for Delivery" },
              { icon: "🏠", label: "Delivered" },
            ].map((step, i) => (
              <div
                key={step.label}
                style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <div
                  style={{
                    textAlign: "center",
                    minWidth: isMobile ? "60px" : "80px",
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? "32px" : "40px",
                      height: isMobile ? "32px" : "40px",
                      borderRadius: "50%",
                      backgroundColor: i === 0 ? "#2E7D32" : "#F1F3F4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: isMobile ? "14px" : "18px",
                      margin: "0 auto 6px",
                      border: i === 1 ? "2px dashed #2E7D32" : "none",
                    }}
                  >
                    {step.icon}
                  </div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: i === 0 ? "#2E7D32" : "#9AA0A6",
                      fontWeight: i === 0 ? 700 : 400,
                      whiteSpace: isMobile ? "nowrap" : "normal",
                    }}
                  >
                    {step.label}
                  </p>
                </div>
                {i < 3 && (
                  <div
                    style={{
                      width: isMobile ? "20px" : "40px",
                      height: "2px",
                      backgroundColor: i === 0 ? "#2E7D32" : "#E8EAED",
                      flexShrink: 0,
                      marginBottom: "20px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/orders")}
              style={{
                backgroundColor: "#2E7D32",
                color: "white",
                border: "none",
                borderRadius: "14px",
                padding: isMobile ? "14px 24px" : "16px 32px",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(46,125,50,0.3)",
                flex: isMobile ? "1 1 auto" : "none",
              }}
            >
              Track Order 📦
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/home")}
              style={{
                backgroundColor: "white",
                color: "#202124",
                border: "1px solid #E8EAED",
                borderRadius: "14px",
                padding: isMobile ? "14px 24px" : "16px 32px",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                flex: isMobile ? "1 1 auto" : "none",
              }}
            >
              Continue Shopping
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
