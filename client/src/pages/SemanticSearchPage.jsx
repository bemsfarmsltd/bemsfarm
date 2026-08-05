import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";

// These are search categories that the AI understands
const SEARCH_SUGGESTIONS = [
  { emoji: "🍳", text: "Cooking oil", desc: "Find all oils" },
  { emoji: "🥗", text: "Breakfast food", desc: "Start your day" },
  { emoji: "🍲", text: "Soup ingredients", desc: "Everything for soups" },
  { emoji: "🍚", text: "Carbs", desc: "Rice, garri, beans" },
  { emoji: "🥦", text: "Vegetables", desc: "Fresh produce" },
  { emoji: "🍗", text: "Protein", desc: "Beans, crayfish" },
  { emoji: "❤️", text: "Healthy eating", desc: "Nutritious foods" },
  { emoji: "🎉", text: "Festive meals", desc: "Party essentials" },
];

export default function SemanticSearchPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isMobile } = useResponsive();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [justAdded, setJustAdded] = useState({});

  // This function calls the backend API
  const performSearch = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Searching for:", query);
      const response = await api.post("/advanced-ai/semantic-search", {
        query,
      });
      console.log("✅ Got results:", response.data);
      setResults(response.data);
    } catch (err) {
      console.error("❌ Search error:", err);
      setError("Search failed. Try another search term.");
    } finally {
      setLoading(false);
    }
  };

  // When user clicks a suggestion
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };

  // When user adds product to cart
  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price / NAIRA_PER_UNIT, // Convert from base price to display price
      unit: product.unit,
    });
    setJustAdded((prev) => ({ ...prev, [product.id]: true }));

    // Remove "added" status after 2 seconds
    setTimeout(() => {
      setJustAdded((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
    }, 2000);
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
          {/* HEADER SECTION */}
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
              🔍 Smart Product Search
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "15px",
                marginBottom: 0,
              }}
            >
              Tell us what you want, we'll find the best options for you
            </p>
          </motion.div>

          {/* SEARCH INPUT SECTION */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: "32px" }}
          >
            {/* Search Box */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && performSearch(searchQuery)
                }
                placeholder="Try: 'cooking oil', 'breakfast food', 'soup ingredients'..."
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  border: "2px solid #E5E7EB",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontFamily: "Nunito, sans-serif",
                  outline: "none",
                  transition: "all 0.3s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1B4332")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => performSearch(searchQuery)}
                disabled={loading}
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #1B4332, #40916C)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  fontFamily: "Nunito, sans-serif",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "⏳ Searching..." : "🔍 Search"}
              </motion.button>
            </div>

            {/* Suggestions - Only show if NO results yet */}
            {!results && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                  Popular Searches:
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr 1fr"
                      : "repeat(4, 1fr)",
                    gap: "12px",
                  }}
                >
                  {SEARCH_SUGGESTIONS.map((suggestion, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      style={{
                        padding: "16px 12px",
                        border: "2px solid #E5E7EB",
                        borderRadius: "14px",
                        background: "white",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "Nunito, sans-serif",
                        transition: "all 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#1B4332";
                        e.currentTarget.style.backgroundColor = "#F0FFF4";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.backgroundColor = "white";
                      }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                        {suggestion.emoji}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#1B4332",
                          marginBottom: "2px",
                        }}
                      >
                        {suggestion.text}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                        }}
                      >
                        {suggestion.desc}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ERROR MESSAGE */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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

          {/* RESULTS SECTION */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Results Header */}
              <div style={{ marginBottom: "24px" }}>
                <h2
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "4px",
                  }}
                >
                  Results for "{results.query}"
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9CA3AF",
                    marginBottom: 0,
                  }}
                >
                  Found {results.results.length} product
                  {results.results.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* No Results */}
              {results.results.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "#9CA3AF",
                  }}
                >
                  <div style={{ fontSize: "64px", marginBottom: "16px" }}>
                    🔍
                  </div>
                  <p style={{ fontSize: "16px", fontWeight: 600 }}>
                    No products found for "{results.query}"
                  </p>
                  <p style={{ fontSize: "13px", marginTop: "8px" }}>
                    Try a different search term or browse our categories
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => navigate("/products")}
                    style={{
                      marginTop: "20px",
                      padding: "12px 24px",
                      background: "#1B4332",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Browse All Products
                  </motion.button>
                </motion.div>
              ) : (
                /* Products Grid */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {results.results.map((product, idx) => (
                    <motion.div
                      key={`${product.id}-${idx}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      style={{
                        backgroundColor: "#F8FAFB",
                        borderRadius: "16px",
                        padding: "16px",
                        border: "1px solid #E5E7EB",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(27, 67, 50, 0.1)";
                        e.currentTarget.style.transform = "translateY(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Product Name */}
                      <h3
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: "8px",
                        }}
                      >
                        {product.name}
                      </h3>

                      {/* Unit */}
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#9CA3AF",
                          marginBottom: "12px",
                        }}
                      >
                        {product.unit}
                      </p>

                      {/* Price & Stock */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "#1B4332",
                          }}
                        >
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#9CA3AF",
                            backgroundColor: "#E5E7EB",
                            padding: "4px 10px",
                            borderRadius: "50px",
                            fontWeight: 600,
                          }}
                        >
                          Stock: {product.stock || "∞"}
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddToCart(product)}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "none",
                          borderRadius: "10px",
                          background: justAdded[product.id]
                            ? "#40916C"
                            : "#1B4332",
                          color: "white",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: "Nunito, sans-serif",
                          transition: "background-color 0.3s",
                        }}
                      >
                        {justAdded[product.id] ? "✓ Added!" : "🛒 Add to Cart"}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
