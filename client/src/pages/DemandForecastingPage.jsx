import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";

export default function DemandForecastingPage() {
  const { isMobile } = useResponsive();
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const forecastRes = await api.get("/advanced-ai/demand-forecast");
        const alertsRes = await api.get("/advanced-ai/inventory-alerts");
        setForecast(forecastRes.data);
        setAlerts(alertsRes.data);
      } catch (err) {
        setError("Failed to load forecast data: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getTrendIcon = (t) =>
    t === "INCREASING" ? "📈" : t === "DECREASING" ? "📉" : "➡️";
  const getTrendColor = (t) =>
    t === "INCREASING" ? "#059669" : t === "DECREASING" ? "#DC2626" : "#F59E0B";
  const getTrendText = (t) =>
    t === "INCREASING"
      ? "Demand Increasing"
      : t === "DECREASING"
        ? "Demand Decreasing"
        : "Stable Demand";

  return (
    <PageWrapper>
      <div
        style={{
          backgroundColor: "white",
          padding: isMobile ? "20px 16px" : "40px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(135deg, #1B4332 0%, #40916C 100%)",
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
              📈 Demand Forecasting & Inventory
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px" }}>
              Predict customer demand and optimize stock levels
            </p>
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

          {/* LOADING */}
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                textAlign: "center",
                padding: "80px 20px",
                color: "#9CA3AF",
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>⏳</div>
              <p style={{ fontSize: "16px", fontWeight: 600 }}>
                Loading forecast data...
              </p>
            </motion.div>
          ) : (
            <>
              {/* INVENTORY ALERTS */}
              {alerts && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: "32px" }}
                >
                  <h2
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "16px",
                    }}
                  >
                    🚨 Inventory Alerts
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        backgroundColor: "#FEF2F2",
                        border: "2px solid #FECACA",
                        borderRadius: "16px",
                        padding: "20px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#DC2626",
                          fontWeight: 600,
                          marginBottom: "8px",
                          textTransform: "uppercase",
                        }}
                      >
                        🔴 Critical - Restock Now
                      </p>
                      <p
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: "32px",
                          fontWeight: 800,
                          color: "#DC2626",
                          marginBottom: "8px",
                        }}
                      >
                        {alerts.critical_count}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#9CA3AF",
                          marginBottom: 0,
                        }}
                      >
                        Products below critical level
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        backgroundColor: "#FFFBEB",
                        border: "2px solid #FDE68A",
                        borderRadius: "16px",
                        padding: "20px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#F59E0B",
                          fontWeight: 600,
                          marginBottom: "8px",
                          textTransform: "uppercase",
                        }}
                      >
                        🟡 Warning - Monitor
                      </p>
                      <p
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: "32px",
                          fontWeight: 800,
                          color: "#F59E0B",
                          marginBottom: "8px",
                        }}
                      >
                        {alerts.warning_count}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#9CA3AF",
                          marginBottom: 0,
                        }}
                      >
                        Products approaching critical level
                      </p>
                    </motion.div>
                  </div>

                  {alerts.critical_alerts &&
                    alerts.critical_alerts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{
                          backgroundColor: "#FEF2F2",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                          border: "1px solid #FECACA",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#DC2626",
                            fontWeight: 700,
                            marginBottom: "12px",
                          }}
                        >
                          ⚠️ Critical Products Need Restocking:
                        </p>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {alerts.critical_alerts.map((product, i) => (
                            <div
                              key={i}
                              style={{
                                backgroundColor: "white",
                                padding: "12px",
                                borderRadius: "8px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "#1B4332",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {product.name}
                                </p>
                                <p
                                  style={{
                                    fontSize: "12px",
                                    color: "#9CA3AF",
                                    marginBottom: 0,
                                  }}
                                >
                                  Stock: {product.current_stock} / Threshold:{" "}
                                  {product.threshold}
                                </p>
                              </div>
                              <span
                                style={{
                                  backgroundColor: "#DC2626",
                                  color: "white",
                                  padding: "6px 12px",
                                  borderRadius: "50px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {product.action}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                </motion.div>
              )}

              {/* DEMAND FORECAST */}
              {forecast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "16px",
                    }}
                  >
                    📊 Next Month Forecast
                  </h2>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#9CA3AF",
                      marginBottom: "16px",
                    }}
                  >
                    Based on 90 days of historical sales data and customer
                    trends
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {forecast.products?.map((product, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0 8px 24px rgba(27, 67, 50, 0.1)";
                          e.currentTarget.style.transform = "translateY(-4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        style={{
                          backgroundColor: "#F8FAFB",
                          borderRadius: "16px",
                          padding: "18px",
                          border: "1px solid #E5E7EB",
                          transition: "all 0.3s",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <h3
                            style={{
                              fontFamily: "Syne, sans-serif",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#111827",
                              flex: 1,
                              marginBottom: 0,
                            }}
                          >
                            {product.product_name}
                          </h3>
                          <span style={{ fontSize: "20px", marginLeft: "8px" }}>
                            {getTrendIcon(product.trend)}
                          </span>
                        </div>

                        <div
                          style={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            padding: "12px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#9CA3AF",
                                fontWeight: 600,
                              }}
                            >
                              Historical Avg
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#4B5563",
                              }}
                            >
                              {product.historical_monthly_avg} units
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#9CA3AF",
                                fontWeight: 600,
                              }}
                            >
                              Next Month Forecast
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: getTrendColor(product.trend),
                              }}
                            >
                              {product.forecasted_next_month} units
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            padding: "10px",
                            marginBottom: "10px",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: getTrendColor(product.trend),
                              marginBottom: 0,
                            }}
                          >
                            {getTrendText(product.trend)}
                          </p>
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#9CA3AF",
                              marginBottom: "4px",
                              fontWeight: 600,
                            }}
                          >
                            Confidence: {product.confidence}%
                          </p>
                          <div
                            style={{
                              backgroundColor: "#E5E7EB",
                              height: "5px",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: getTrendColor(product.trend),
                                height: "100%",
                                width: `${product.confidence}%`,
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            backgroundColor:
                              getTrendColor(product.trend) === "#059669"
                                ? "#F0FDF4"
                                : getTrendColor(product.trend) === "#DC2626"
                                  ? "#FEF2F2"
                                  : "#FFFBEB",
                            borderRadius: "8px",
                            padding: "10px",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: getTrendColor(product.trend),
                              marginBottom: 0,
                            }}
                          >
                            {product.recommendation}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* INFO BOX */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  backgroundColor: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "16px",
                  padding: "20px",
                  marginTop: "32px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#047857",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  📊 How Demand Forecasting Works
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#065F46",
                    lineHeight: 1.6,
                    marginBottom: 0,
                  }}
                >
                  The system analyzes 90 days of historical sales data to
                  identify trends and patterns. It calculates average monthly
                  demand and detects whether demand is increasing, decreasing,
                  or stable. Confidence scores reflect prediction accuracy based
                  on available historical data.
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
