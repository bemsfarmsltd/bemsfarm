import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import PageWrapper from "../components/layout/PageWrapper";
import ProductCard, {
  getProductEmoji,
  getProductBg,
  getProductImage,
} from "../components/ui/ProductCard";
import api from "../services/api";
import { useResponsive } from "../hooks/useResponsive";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop, isTabletAny, padding, gap, cols } =
    useResponsive();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data.product);
        setRelated(res.data.related);
      })
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1000);
  };

  if (loading)
    return (
      <PageWrapper>
        <div
          style={{
            maxWidth: "1100px",
            margin: isMobile ? "24px auto" : "60px auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? "20px" : "40px",
            padding: isMobile ? "0 16px" : "0 24px",
          }}
        >
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                height: isMobile ? "260px" : "400px",
                backgroundColor: "#F8F9FA",
                borderRadius: "20px",
              }}
            />
          ))}
        </div>
      </PageWrapper>
    );

  if (!product)
    return (
      <PageWrapper>
        <div style={{ textAlign: "center", padding: "80px" }}>
          Product not found
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: isMobile ? "20px 16px" : "32px 24px",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: isMobile ? "20px" : "32px",
            fontSize: "13px",
            color: "#9AA0A6",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9AA0A6",
            }}
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => navigate("/products")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9AA0A6",
            }}
          >
            {product.category_name}
          </button>
          <span>/</span>
          <span style={{ color: "#202124", fontWeight: 600 }}>
            {product.name}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || isTabletAny ? "1fr" : "1fr 1fr",
            gap: isMobile ? "24px" : isTabletAny ? "36px" : "60px",
            marginBottom: isMobile ? "36px" : "60px",
          }}
        >
          {/* Left — Images */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                backgroundColor: getProductBg(product.name),
                borderRadius: "24px",
                height: isMobile ? "260px" : isTabletAny ? "340px" : "420px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* In ProductDetail - replace the emoji display with: */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "24px",
                }}
              >
                <img
                  src={product.image_url || getProductImage(product.name)}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "24px",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </motion.div>
              {product.is_featured && (
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    backgroundColor: "#F57C00",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}
                >
                  ⭐ FEATURED
                </div>
              )}
            </motion.div>
            {/* Thumbnail strip */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {["main", "alt1", "alt2", "alt3"].map((v, i) => (
                <div
                  key={v}
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "12px",
                    backgroundColor: getProductBg(product.name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    border: `2px solid ${i === 0 ? "#2E7D32" : "#E8EAED"}`,
                    cursor: "pointer",
                  }}
                >
                  {getProductEmoji(product.name)}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p
              style={{
                color: "#2E7D32",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "8px",
                letterSpacing: "1px",
              }}
            >
              {product.category_name}
            </p>
            <h1
              style={{
                fontSize: isMobile ? "24px" : "32px",
                fontWeight: 900,
                color: "#202124",
                marginBottom: "8px",
                fontFamily: "Space Grotesk, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h1>

            {/* Rating */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "2px" }}>
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "18px",
                      color: i < 4 ? "#F57C00" : "#E8EAED",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span style={{ fontSize: "14px", color: "#9AA0A6" }}>
                (150 reviews)
              </span>
              <span
                style={{ fontSize: "14px", color: "#2E7D32", fontWeight: 600 }}
              >
                | In Stock ✓
              </span>
            </div>

            <p
              style={{
                fontSize: isMobile ? "24px" : "32px",
                fontWeight: 900,
                color: "#202124",
                marginBottom: "20px",
              }}
            >
              ₦{(product.price * 1500).toLocaleString()}
              <span
                style={{ fontSize: "14px", color: "#9AA0A6", fontWeight: 400 }}
              >
                /{product.unit}
              </span>
            </p>

            {/* Stock Status Badge */}
            <div style={{ marginBottom: "16px" }}>
              {product.stock === 0 ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#FEE2E2",
                    borderRadius: "50px",
                    padding: "6px 14px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#EF4444",
                    }}
                  />
                  <span
                    style={{
                      color: "#DC2626",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    Out of Stock
                  </span>
                </div>
              ) : product.stock !== null && product.stock <= 10 ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#FEF3C7",
                    borderRadius: "50px",
                    padding: "6px 14px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#F59E0B",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      color: "#92400E",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    ⚡ Only {product.stock} left!
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#D1FAE5",
                    borderRadius: "50px",
                    padding: "6px 14px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                    }}
                  />
                  <span
                    style={{
                      color: "#065F46",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    In Stock
                    {product.stock ? ` (${product.stock} available)` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Stock bar */}
            {product.stock !== null &&
              product.stock > 0 &&
              product.stock <= 50 && (
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      Stock level
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: product.stock <= 10 ? "#EF4444" : "#F59E0B",
                      }}
                    >
                      {product.stock} remaining
                    </span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      backgroundColor: "#F3F4F6",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (product.stock / 50) * 100)}%`,
                        backgroundColor:
                          product.stock <= 10
                            ? "#EF4444"
                            : product.stock <= 25
                              ? "#F59E0B"
                              : "#10B981",
                        borderRadius: "3px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              )}

            <p
              style={{
                color: "#5F6368",
                fontSize: "15px",
                lineHeight: 1.7,
                marginBottom: "24px",
                paddingBottom: "24px",
                borderBottom: "1px solid #E8EAED",
              }}
            >
              {product.description ||
                `Fresh, premium quality ${product.name.toLowerCase()} sourced directly from Nigerian farms. Delivered fresh to your doorstep with guaranteed quality.`}
            </p>

            {/* Quantity + Add */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "10px" : "16px",
                marginBottom: "24px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "2px solid #E8EAED",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    width: "44px",
                    height: "48px",
                    border: "none",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#5F6368",
                  }}
                >
                  −
                </motion.button>
                <span
                  style={{
                    width: "48px",
                    textAlign: "center",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {quantity}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity((q) => q + 1)}
                  style={{
                    width: "44px",
                    height: "48px",
                    border: "none",
                    backgroundColor: "#F57C00",
                    cursor: "pointer",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  +
                </motion.button>
              </div>
              <motion.button
                disabled={product.stock === 0}
                onClick={handleAdd}
                style={{
                  flex: 1,
                  backgroundColor:
                    product.stock === 0
                      ? "#9AA0A6"
                      : added
                        ? "#2E7D32"
                        : "#F57C00",
                  cursor: product.stock === 0 ? "not-allowed" : "pointer",
                  opacity: product.stock === 0 ? 0.6 : 1,
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "16px",
                  fontSize: "16px",
                  fontWeight: 800,
                  boxShadow: "0 4px 16px rgba(245,124,0,0.35)",
                  transition: "background-color 0.2s",
                }}
              >
                {product.stock === 0
                  ? "Out of Stock"
                  : added
                    ? "✓ Added to Cart!"
                    : "Buy Now"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  border: "2px solid #E8EAED",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ♡
              </motion.button>
            </div>

            {/* Total */}
            <div
              style={{
                backgroundColor: "#F1F8F1",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", color: "#5F6368" }}>
                Total for {quantity} {quantity === 1 ? product.unit : "units"}
              </span>
              <span
                style={{
                  fontSize: isMobile ? "18px" : "22px",
                  fontWeight: 900,
                  color: "#2E7D32",
                }}
              >
                ₦{(product.price * 1500 * quantity).toLocaleString()}
              </span>
            </div>

            {/* Delivery info */}
            <div
              style={{
                border: "1px solid #E8EAED",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {[
                {
                  icon: "🚚",
                  title: "Free Delivery",
                  desc: "On orders above ₦15,000",
                },
                {
                  icon: "↩️",
                  title: "Return Policy",
                  desc: "Free returns within 7 days",
                },
              ].map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px 20px",
                    borderBottom: i === 0 ? "1px solid #E8EAED" : "none",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{item.icon}</span>
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#202124",
                      }}
                    >
                      {item.title}
                    </p>
                    <p style={{ fontSize: "12px", color: "#9AA0A6" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              gap: "0",
              borderBottom: "2px solid #E8EAED",
              marginBottom: "24px",
              overflowX: "auto",
            }}
          >
            {["description", "reviews", "shipping"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: isMobile ? "12px 14px" : "12px 24px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: "15px",
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? "#202124" : "#9AA0A6",
                  borderBottom: `2px solid ${activeTab === tab ? "#202124" : "transparent"}`,
                  marginBottom: "-2px",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ maxWidth: "700px" }}>
            {activeTab === "description" && (
              <p
                style={{ color: "#5F6368", fontSize: "15px", lineHeight: 1.8 }}
              >
                {product.description ||
                  `${product.name} is a premium quality Nigerian food product sourced directly from trusted farms across Nigeria. Our ${product.name.toLowerCase()} is carefully selected, cleaned, and packaged to ensure maximum freshness and nutritional value. Perfect for all your Nigerian recipes and everyday cooking needs.`}
              </p>
            )}
            {activeTab === "reviews" && (
              <div>
                <div
                  style={{ display: "flex", gap: "4px", marginBottom: "8px" }}
                >
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "24px",
                        color: i < 4 ? "#F57C00" : "#E8EAED",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p style={{ color: "#5F6368" }}>
                  150 verified customer reviews • Average 4.2/5
                </p>
              </div>
            )}
            {activeTab === "shipping" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[
                  "Standard delivery: 1-2 business days (₦1,500)",
                  "Express delivery: Same day in Lagos (₦3,000)",
                  "Free delivery on orders above ₦15,000",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      color: "#5F6368",
                    }}
                  >
                    <span style={{ color: "#2E7D32" }}>✓</span> {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "32px",
                  backgroundColor: "#F57C00",
                  borderRadius: "4px",
                }}
              />
              <h2
                style={{ fontSize: "22px", fontWeight: 800, color: "#202124" }}
              >
                Related Products
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
