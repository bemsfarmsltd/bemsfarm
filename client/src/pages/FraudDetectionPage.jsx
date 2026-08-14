import { useState } from "react";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";

export default function FraudDetectionPage() {
  const { isMobile } = useResponsive();

  // Form inputs
  const [userId, setUserId] = useState(1);
  const [orderAmount, setOrderAmount] = useState(25000);
  const [paymentMethod, setPaymentMethod] = useState("monnify");

  // Results
  const [fraudCheck, setFraudCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to determine color based on risk level
  const getRiskColor = (level) => {
    if (level === "HIGH") return "#DC2626";
    if (level === "MEDIUM") return "#F59E0B";
    return "#059669";
  };

  const getRiskBg = (level) => {
    if (level === "HIGH") return "#FEF2F2";
    if (level === "MEDIUM") return "#FFFBEB";
    return "#F0FDF4";
  };

  const getRiskBorder = (level) => {
    if (level === "HIGH") return "#FECACA";
    if (level === "MEDIUM") return "#FDE68A";
    return "#BBF7D0";
  };

  // Run fraud check
  const checkForFraud = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔐 Running fraud check for user:", userId);
      const response = await api.post("/advanced-ai/fraud-check", {
        user_id: parseInt(userId),
        order_amount: parseInt(orderAmount),
        payment_method: paymentMethod,
      });
      console.log("✅ Fraud check complete:", response.data);
      setFraudCheck(response.data);
    } catch (err) {
      console.error("❌ Error:", err);
      setError("Fraud check failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // MAIN RENDER
  return (
    <PageWrapper>
      <div
        style={{
          backgroundColor: "white",
          padding: isMobile ? "20px 16px" : "40px",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
              padding: isMobile ? "32px 16px" : "48px 40px",
              marginBottom: "32px",
              borderRadius: "20px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: isMobile ? "24px" : "36px",
                fontWeight: 800,
                color: "white",
                marginBottom: "8px",
              }}
            >
              🔐 Fraud Detection System
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "15px",
              }}
            >
              Protect BemsFarms from suspicious orders and bot activity
            </p>
          </motion.div>

          {/* INPUT SECTION */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              backgroundColor: "#F8FAFB",
              borderRadius: "16px",
              padding: isMobile ? "20px" : "28px",
              marginBottom: "28px",
              border: "1px solid #E5E7EB",
            }}
          >
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "20px",
              }}
            >
              Analyze Order for Fraud Risk
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* USER ID */}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#4B5563",
                    fontWeight: 600,
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  👤 User ID
                </label>
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontFamily: "Nunito, sans-serif",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#1B4332")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#E5E7EB")
                  }
                />
              </div>

              {/* ORDER AMOUNT */}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#4B5563",
                    fontWeight: 600,
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  💰 Order Amount (₦)
                </label>
                <input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontFamily: "Nunito, sans-serif",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#1B4332")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#E5E7EB")
                  }
                />
              </div>

              {/* PAYMENT METHOD */}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#4B5563",
                    fontWeight: 600,
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  💳 Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontFamily: "Nunito, sans-serif",
                    outline: "none",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#1B4332")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#E5E7EB")
                  }
                >
                  <option value="monnify">Monnify</option>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* RUN CHECK BUTTON */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkForFraud}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #DC2626, #991B1B)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontFamily: "Nunito, sans-serif",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "🔍 Analyzing..." : "🔐 Run Fraud Check"}
            </motion.button>
          </motion.div>

          {/* ERROR */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "24px",
                color: "#DC2626",
                fontSize: "14px",
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* RESULTS */}
          {fraudCheck && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* RISK LEVEL CARD */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  backgroundColor: getRiskBg(fraudCheck.risk_level),
                  border: `2px solid ${getRiskBorder(fraudCheck.risk_level)}`,
                  borderRadius: "16px",
                  padding: "28px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "20px",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  {/* Left side */}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "12px",
                        color: getRiskColor(fraudCheck.risk_level),
                        fontWeight: 600,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Risk Level
                    </p>
                    <p
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontSize: isMobile ? "32px" : "40px",
                        fontWeight: 800,
                        color: getRiskColor(fraudCheck.risk_level),
                        marginBottom: "8px",
                      }}
                    >
                      {fraudCheck.risk_level}
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: getRiskColor(fraudCheck.risk_level),
                        fontWeight: 600,
                      }}
                    >
                      {fraudCheck.recommendation}
                    </p>
                  </div>

                  {/* Right side - Risk Score */}
                  <div
                    style={{
                      backgroundColor: getRiskColor(fraudCheck.risk_level),
                      color: "white",
                      borderRadius: "14px",
                      padding: "24px",
                      textAlign: "center",
                      minWidth: "120px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        marginBottom: "8px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Risk Score
                    </p>
                    <p
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontSize: "36px",
                        fontWeight: 800,
                        marginBottom: 0,
                      }}
                    >
                      {fraudCheck.risk_score}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        marginTop: "4px",
                        opacity: 0.9,
                      }}
                    >
                      out of 100
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* RISK FACTORS */}
              {fraudCheck.risk_factors &&
                fraudCheck.risk_factors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      backgroundColor: "#F8FAFB",
                      borderRadius: "16px",
                      padding: isMobile ? "20px" : "28px",
                      marginBottom: "28px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: "16px",
                      }}
                    >
                      ⚠️ Risk Factors Detected
                    </h3>

                    <div style={{ display: "grid", gap: "12px" }}>
                      {fraudCheck.risk_factors.map((factor, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start",
                            backgroundColor: "white",
                            padding: "12px",
                            borderRadius: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "#DC2626",
                              fontWeight: 800,
                              marginTop: "2px",
                              fontSize: "18px",
                            }}
                          >
                            ⚠️
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              color: "#4B5563",
                              flex: 1,
                            }}
                          >
                            {factor}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

              {/* USER STATISTICS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  backgroundColor: "#F8FAFB",
                  borderRadius: "16px",
                  padding: isMobile ? "20px" : "28px",
                  marginBottom: "28px",
                  border: "1px solid #E5E7EB",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "16px",
                  }}
                >
                  👤 User History & Statistics
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr 1fr"
                      : "repeat(4, 1fr)",
                    gap: "14px",
                  }}
                >
                  {/* Account Age */}
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: "6px",
                        fontWeight: 600,
                      }}
                    >
                      📅 Account Age
                    </p>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1B4332",
                        marginBottom: 0,
                      }}
                    >
                      {fraudCheck.days_user_active} days
                    </p>
                  </div>

                  {/* Average Order */}
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: "6px",
                        fontWeight: 600,
                      }}
                    >
                      💰 Average Order
                    </p>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1B4332",
                        marginBottom: 0,
                      }}
                    >
                      ₦
                      {fraudCheck.average_order_amount?.toLocaleString() || "0"}
                    </p>
                  </div>

                  {/* Current Order */}
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: "6px",
                        fontWeight: 600,
                      }}
                    >
                      🛍️ Current Order
                    </p>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1B4332",
                        marginBottom: 0,
                      }}
                    >
                      ₦{fraudCheck.order_amount?.toLocaleString()}
                    </p>
                  </div>

                  {/* Needs Verification */}
                  <div
                    style={{
                      backgroundColor: fraudCheck.should_require_verification
                        ? "#FEF2F2"
                        : "#F0FDF4",
                      padding: "14px",
                      borderRadius: "10px",
                      border: fraudCheck.should_require_verification
                        ? "1px solid #FECACA"
                        : "1px solid #BBF7D0",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: fraudCheck.should_require_verification
                          ? "#DC2626"
                          : "#059669",
                        marginBottom: "6px",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Requires Verification
                    </p>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: fraudCheck.should_require_verification
                          ? "#DC2626"
                          : "#059669",
                        marginBottom: 0,
                      }}
                    >
                      {fraudCheck.should_require_verification
                        ? "⚠️ Yes"
                        : "✓ No"}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* INFO BOX */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#92400E",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  🔍 How Fraud Detection Works
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#b45309",
                    lineHeight: 1.6,
                    marginBottom: 0,
                  }}
                >
                  The system analyzes 5 key factors: failed payment history,
                  unusual order size, rapid successive orders (bot detection),
                  new user behavior, and payment method patterns. Each factor
                  contributes to the overall risk score. Scores above 60 trigger
                  verification requirements, protecting BemsFarms while
                  maintaining a smooth experience for legitimate customers.
                </p>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
