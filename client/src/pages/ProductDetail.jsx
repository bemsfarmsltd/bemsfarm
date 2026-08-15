import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/layout/PageWrapper";
import ProductCard, {
  getProductEmoji,
  getProductBg,
  getProductImage,
} from "../components/ui/ProductCard";
import api from "../services/api";
import { useResponsive } from "../hooks/useResponsive";
import { NAIRA_PER_UNIT } from "../utils/currency";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop, isTabletAny, padding, gap, cols } =
    useResponsive();
  const { addToCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  // Favorites -- same localStorage pattern used on ProductsPage.jsx
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "{}");
    } catch {
      return {};
    }
  });
  const toggleFavorite = () => {
    setFavorites((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };
  const isFavorite = !!favorites[id];

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myReview, setMyReview] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewJustSubmitted, setReviewJustSubmitted] = useState(false);

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

  const loadReviews = () => {
    setReviewsLoading(true);
    api
      .get(`/products/${id}/reviews`)
      .then((res) => {
        setReviews(res.data.reviews);
        setReviewStats({ average: res.data.average, count: res.data.count });
      })
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    loadReviews();
    if (isLoggedIn) {
      api
        .get(`/products/${id}/reviews/mine`)
        .then((res) => {
          if (res.data.review) {
            setMyReview(res.data.review);
            setSelectedRating(res.data.review.rating);
            setReviewComment(res.data.review.comment || "");
          }
        })
        .catch(() => {});
    }
  }, [id, isLoggedIn]);

  const handleSubmitReview = () => {
    if (!selectedRating) return;
    setSubmittingReview(true);
    api
      .post(`/products/${id}/reviews`, { rating: selectedRating, comment: reviewComment.trim() || undefined })
      .then((res) => {
        setMyReview(res.data.review);
        setReviewJustSubmitted(true);
        setTimeout(() => setReviewJustSubmitted(false), 2500);
        loadReviews();
      })
      .finally(() => setSubmittingReview(false));
  };

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
                      color: i < Math.round(reviewStats.average) ? "#F57C00" : "#E8EAED",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span style={{ fontSize: "14px", color: "#9AA0A6" }}>
                {reviewStats.count > 0
                  ? `${reviewStats.average.toFixed(1)} (${reviewStats.count} review${reviewStats.count === 1 ? "" : "s"})`
                  : "No reviews yet"}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: product.stock_quantity === 0 ? "#DC2626" : "#2E7D32",
                  fontWeight: 600,
                }}
              >
                {product.stock_quantity === 0 ? "| Out of Stock" : "| In Stock ✓"}
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
              ₦{(product.price * NAIRA_PER_UNIT).toLocaleString()}
              <span
                style={{ fontSize: "14px", color: "#9AA0A6", fontWeight: 400 }}
              >
                /{product.unit}
              </span>
            </p>

            {/* Stock Status Badge */}
            <div style={{ marginBottom: "16px" }}>
              {product.stock_quantity === 0 ? (
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
              ) : product.stock_quantity !== null && product.stock_quantity <= 10 ? (
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
                    ⚡ Only {product.stock_quantity} left!
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
                    {product.stock_quantity ? ` (${product.stock_quantity} available)` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Stock bar */}
            {product.stock_quantity !== null &&
              product.stock_quantity > 0 &&
              product.stock_quantity <= 50 && (
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
                        color: product.stock_quantity <= 10 ? "#EF4444" : "#F59E0B",
                      }}
                    >
                      {product.stock_quantity} remaining
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
                        width: `${Math.min(100, (product.stock_quantity / 50) * 100)}%`,
                        backgroundColor:
                          product.stock_quantity <= 10
                            ? "#EF4444"
                            : product.stock_quantity <= 25
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
                  aria-label="Decrease quantity"
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
                  onClick={() =>
                    setQuantity((q) =>
                      product.stock_quantity
                        ? Math.min(q + 1, product.stock_quantity)
                        : q + 1,
                    )
                  }
                  disabled={
                    !!product.stock_quantity &&
                    quantity >= product.stock_quantity
                  }
                  aria-label="Increase quantity"
                  style={{
                    width: "44px",
                    height: "48px",
                    border: "none",
                    backgroundColor: "#F57C00",
                    cursor:
                      !!product.stock_quantity &&
                      quantity >= product.stock_quantity
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      !!product.stock_quantity &&
                      quantity >= product.stock_quantity
                        ? 0.5
                        : 1,
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  +
                </motion.button>
              </div>
              <motion.button
                disabled={product.stock_quantity === 0}
                onClick={handleAdd}
                style={{
                  flex: 1,
                  backgroundColor:
                    product.stock_quantity === 0
                      ? "#9AA0A6"
                      : added
                        ? "#2E7D32"
                        : "#F57C00",
                  cursor: product.stock_quantity === 0 ? "not-allowed" : "pointer",
                  opacity: product.stock_quantity === 0 ? 0.6 : 1,
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
                {product.stock_quantity === 0
                  ? "Out of Stock"
                  : added
                    ? "✓ Added to Cart!"
                    : "Buy Now"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  border: isFavorite ? "2px solid #F57C00" : "2px solid #E8EAED",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isFavorite ? "#F57C00" : "inherit",
                }}
              >
                {isFavorite ? "♥" : "♡"}
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
                ₦{(product.price * NAIRA_PER_UNIT * quantity).toLocaleString()}
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
                  <span style={{ fontSize: "32" }}>{item.icon}</span>
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
                {/* Summary */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "24px",
                          color:
                            i < Math.round(reviewStats.average)
                              ? "#F57C00"
                              : "#E8EAED",
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p style={{ color: "#5F6368", margin: 0 }}>
                    {reviewStats.count > 0
                      ? `${reviewStats.average.toFixed(1)}/5 • ${reviewStats.count} review${reviewStats.count === 1 ? "" : "s"}`
                      : "No reviews yet — be the first to leave one."}
                  </p>
                </div>

                {/* Write / update a review */}
                <div
                  style={{
                    background: "#F8F9FA",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "28px",
                  }}
                >
                  {isLoggedIn ? (
                    <>
                      <p
                        style={{
                          fontWeight: 700,
                          color: "#202124",
                          marginBottom: "10px",
                          fontSize: "14px",
                        }}
                      >
                        {myReview ? "Update your review" : "Write a review"}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          marginBottom: "12px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            onClick={() => setSelectedRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedRating(star);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                            style={{
                              fontSize: "28px",
                              cursor: "pointer",
                              color:
                                star <= (hoverRating || selectedRating)
                                  ? "#F57C00"
                                  : "#E8EAED",
                              transition: "color 0.15s",
                              userSelect: "none",
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your thoughts about this product (optional)"
                        rows={3}
                        style={{
                          width: "100%",
                          border: "1px solid #E8EAED",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          marginBottom: "12px",
                          boxSizing: "border-box",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <button
                          onClick={handleSubmitReview}
                          disabled={!selectedRating || submittingReview}
                          style={{
                            background: selectedRating ? "#2E7D32" : "#C8CDD1",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: selectedRating ? "pointer" : "not-allowed",
                          }}
                        >
                          {submittingReview
                            ? "Saving..."
                            : myReview
                              ? "Update review"
                              : "Submit review"}
                        </button>
                        {reviewJustSubmitted && (
                          <span
                            style={{
                              color: "#2E7D32",
                              fontSize: "13px",
                              fontWeight: 600,
                            }}
                          >
                            ✓ Thanks for your review!
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "#5F6368", fontSize: "14px", margin: 0 }}>
                      <span
                        onClick={() => navigate("/login")}
                        style={{
                          color: "#2E7D32",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Log in
                      </span>{" "}
                      to leave a review.
                    </p>
                  )}
                </div>

                {/* Review list */}
                {reviewsLoading ? (
                  <p style={{ color: "#9AA0A6", fontSize: "14px" }}>
                    Loading reviews...
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #F1F3F4",
                          paddingBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ display: "flex", gap: "1px" }}>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "14px",
                                  color: i < r.rating ? "#F57C00" : "#E8EAED",
                                }}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#202124",
                            }}
                          >
                            {r.reviewer_name}
                          </span>
                          <span style={{ fontSize: "12px", color: "#9AA0A6" }}>
                            {new Date(r.created_at).toLocaleDateString("en-NG")}
                          </span>
                        </div>
                        {r.comment && (
                          <p
                            style={{
                              color: "#5F6368",
                              fontSize: "14px",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            {r.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                    <span style={{ fontSize:'1.35em',  color: "#2E7D32" }}>✓</span> {item}
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
