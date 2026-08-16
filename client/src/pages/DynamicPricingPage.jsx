import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";

export default function DynamicPricingPage() {
  const { isMobile } = useResponsive();

  // Real catalog — the hardcoded id 1-5 sample list didn't match any
  // actual product IDs, so every "select a product" click 404'd.
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    api.get("/products", { params: { limit: 9 } })
      .then((r) => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // State management
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pricing data from backend
  const fetchDynamicPrice = async (productId) => {
    setLoading(true);
    setError(null);

    try {
      console.log("💰 Fetching dynamic price for product:", productId);
      const response = await api.post("/advanced-ai/dynamic-pricing", {
        product_id: productId,
      });
      console.log("✅ Pricing data:", response.data);
      setPricingData(response.data);
      setSelectedProductId(productId);
    } catch (err) {
      console.error("❌ Pricing error:", err);
      setError("Failed to fetch pricing: " + err.message);
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
              background: "linear-gradient(135deg, #1B4332 0%, #40916C 100%)",
              padding: isMobile ? "32px 16px" : "48px 40px",
              marginBottom: "32px",
              borderRadius: "20px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontFamily: "var(--heading-font)",
                fontSize: isMobile ? "24px" : "36px",
                fontWeight: 800,
                color: "white",
                marginBottom: "8px",
              }}
            >
              💰 Dynamic Pricing
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "15px",
              }}
            >
              Prices adjust based on demand, seasonality, and stock levels
            </p>
          </motion.div>

          {/* PRODUCT SELECTION */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: "32px" }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "14px",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              Select a product to see its pricing breakdown:
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
                gap: "12px",
              }}
            >
              {productsLoading && (
                <p style={{ gridColumn: "1 / -1", color: "#9CA3AF", fontSize: "13px" }}>Loading products…</p>
              )}
              {!productsLoading && products.length === 0 && (
                <p style={{ gridColumn: "1 / -1", color: "#9CA3AF", fontSize: "13px" }}>No products available.</p>
              )}
              {products.map((product) => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchDynamicPrice(product.id)}
                  style={{
                    padding: "14px 16px",
                    border:
                      selectedProductId === product.id
                        ? "2px solid #1B4332"
                        : "1px solid #E5E7EB",
                    borderRadius: "12px",
                    background:
                      selectedProductId === product.id ? "#F0FFF4" : "white",
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "var(--body-font)",
                    fontSize: "14px",
                    fontWeight: selectedProductId === product.id ? 700 : 500,
                    color:
                      selectedProductId === product.id ? "#065F46" : "#4B5563",
                    transition: "all 0.3s",
                  }}
                >
                  {product.name}
                </motion.button>
              ))}
            </div>
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
          {loading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#9CA3AF",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⏳</div>
              <p>Calculating dynamic pricing...</p>
            </motion.div>
          )}

          {/* RESULTS */}
          {pricingData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* PRICE CARDS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "20px",
                  marginBottom: "28px",
                }}
              >
                {/* BASE PRICE CARD */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    backgroundColor: "#F0FDF4",
                    border: "2px solid #BBF7D0",
                    borderRadius: "16px",
                    padding: "28px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#065F46",
                      marginBottom: "8px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Standard Base Price
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "36px",
                      fontWeight: 800,
                      color: "#1B4332",
                      marginBottom: 0,
                    }}
                  >
                    ₦{pricingData.base_price.toLocaleString()}
                  </p>
                </motion.div>

                {/* DYNAMIC PRICE CARD */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    backgroundColor: "#FEF3C7",
                    border: "2px solid #FDE68A",
                    borderRadius: "16px",
                    padding: "28px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#92400E",
                      marginBottom: "8px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Your Price Today
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "36px",
                      fontWeight: 800,
                      color: "#1B4332",
                      marginBottom: "10px",
                    }}
                  >
                    ₦{pricingData.dynamic_price.toLocaleString()}
                  </p>

                  {/* Discount or Markup */}
                  {pricingData.discount_percent > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        fontSize: "13px",
                        color: "#065F46",
                        fontWeight: 700,
                        marginBottom: 0,
                      }}
                    >
                      📉 {pricingData.discount_percent}% DISCOUNT
                    </motion.p>
                  )}
                  {pricingData.markup_percent > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        fontSize: "13px",
                        color: "#DC2626",
                        fontWeight: 700,
                        marginBottom: 0,
                      }}
                    >
                      📈 {pricingData.markup_percent}% HIGHER
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* PRICING FACTORS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
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
                    fontFamily: "var(--heading-font)",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "20px",
                  }}
                >
                  📊 What's Affecting the Price?
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  {/* SEASONALITY */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9CA3AF",
                        marginBottom: "8px",
                        fontWeight: 600,
                      }}
                    >
                      🌾 Seasonality Impact ({pricingData.current_month})
                    </p>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "#1B4332",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      {pricingData.factors.seasonality}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: 0,
                      }}
                    >
                      Prices change based on harvest season. During dry season,
                      certain vegetables become scarce and cost more.
                    </p>
                  </motion.div>

                  {/* INVENTORY */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9CA3AF",
                        marginBottom: "8px",
                        fontWeight: 600,
                      }}
                    >
                      📦 Inventory Level
                    </p>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "#1B4332",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      {pricingData.factors.inventory}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: 0,
                      }}
                    >
                      Current stock: {pricingData.current_stock} units. Low
                      stock = higher price.
                    </p>
                  </motion.div>

                  {/* DEMAND */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9CA3AF",
                        marginBottom: "8px",
                        fontWeight: 600,
                      }}
                    >
                      🔥 Demand Level
                    </p>
                    <p
                      style={{
                        fontSize: "15px",
                        color: "#1B4332",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      {pricingData.factors.demand}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9CA3AF",
                        marginBottom: 0,
                      }}
                    >
                      {pricingData.weekly_sales} units sold this week. Popular
                      items cost more.
                    </p>
                  </motion.div>

                  {/* PRICE IMPACT */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{
                      backgroundColor: "white",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9CA3AF",
                        marginBottom: "8px",
                        fontWeight: 600,
                      }}
                    >
                      💡 Final Impact
                    </p>
                    {pricingData.markup_percent > 0 ? (
                      <div>
                        <p
                          style={{
                            fontSize: "15px",
                            color: "#DC2626",
                            fontWeight: 700,
                            marginBottom: "8px",
                          }}
                        >
                          ↑ {pricingData.markup_percent}% Increase
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#9CA3AF",
                            marginBottom: 0,
                          }}
                        >
                          High demand or low stock drives prices up
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p
                          style={{
                            fontSize: "15px",
                            color: "#065F46",
                            fontWeight: 700,
                            marginBottom: "8px",
                          }}
                        >
                          ↓ {pricingData.discount_percent}% Decrease
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#9CA3AF",
                            marginBottom: 0,
                          }}
                        >
                          High stock enables us to offer better prices
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              {/* INFO BOX */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={{
                  backgroundColor: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "16px",
                  padding: "20px",
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
                  💚 Why Dynamic Pricing?
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#065F46",
                    lineHeight: 1.6,
                    marginBottom: 0,
                  }}
                >
                  BemsFarms uses dynamic pricing to be fair to both farmers and
                  customers. During peak seasons, prices increase to compensate
                  farmers for peak demand. During abundance, we pass savings to
                  you. This keeps the platform sustainable while supporting
                  Nigerian farmers. 🇳🇬
                </p>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
