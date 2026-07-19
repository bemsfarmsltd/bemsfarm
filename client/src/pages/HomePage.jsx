import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/layout/PageWrapper";
import ProductCard from "../components/ui/ProductCard";
import api from "../services/api";
import { useResponsive } from "../hooks/useResponsive";
import { getCategoryIcon } from "../utils/categoryIcons";
import { colors, fonts, buttonStyle } from "../styles/theme";
import heroSalad from "../assets/organic_hero_salad.png";

const HOME_CSS = `
.bf-product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.bf-section-pad { padding: 20px 16px; }
.bf-tab-row { gap: 2px; }
.bf-tab-row button { padding: 8px 12px; font-size: 13px; }

.bf-hero-wave-container {
  background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
  padding: 40px 16px 80px 16px;
  position: relative;
  overflow: hidden;
  border-radius: 0 0 40px 40px;
  color: white;
  margin-bottom: 20px;
}
.bf-hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  position: relative;
  z-index: 2;
}
.bf-hero-text {
  flex: 1.2;
  text-align: center;
}
.bf-hero-tagline {
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 16px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 700;
  color: #69F0AE;
  display: inline-block;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
.bf-hero-title {
  font-family: 'Syne', sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  font-weight: 900;
  line-height: 1.1;
  margin: 0 0 16px 0;
  letter-spacing: -0.03em;
}
.bf-hero-subtitle {
  font-family: 'Nunito', sans-serif;
  font-size: clamp(14px, 2vw, 17px);
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  max-width: 580px;
  margin: 0 auto 28px auto;
}
.bf-hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.bf-hero-btn-primary {
  background-color: #69F0AE;
  color: #1B4332;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 800;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(105, 240, 174, 0.3);
}
.bf-hero-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(105, 240, 174, 0.5);
}
.bf-hero-btn-secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.bf-hero-btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
.bf-hero-graphic {
  flex: 0.8;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
}
.bf-hero-circle-bg {
  width: 260px;
  height: 260px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.bf-hero-salad-image {
  width: 84%;
  height: 84%;
  object-fit: contain;
  border-radius: 50%;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}
.bf-floating-garlic {
  position: absolute;
  top: 8%;
  right: 8%;
  font-size: 28px;
  animation: float 4s ease-in-out infinite;
}
.bf-floating-pepper {
  position: absolute;
  bottom: 12%;
  left: 8%;
  font-size: 28px;
  animation: float 4.5s ease-in-out infinite alternate;
}
@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(4deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}
.bf-hero-review-card {
  position: absolute;
  bottom: -10px;
  left: -10px;
  background: rgba(27, 67, 50, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 10px 14px;
  max-width: 190px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.bf-review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.bf-review-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid white;
}
.bf-review-name {
  font-size: 11px;
  font-weight: 700;
  color: white;
}
.bf-review-stars {
  color: #F59E0B;
  font-size: 10px;
  margin-top: 1px;
}
.bf-review-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.3;
  margin: 0;
}
.bf-hero-stats {
  max-width: 1000px;
  width: 100%;
  margin: 32px auto 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  position: relative;
  z-index: 2;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 20px;
  text-align: center;
}
.bf-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bf-stat-num {
  font-family: 'Syne', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #69F0AE;
}
.bf-stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}
.bf-features-ribbon {
  max-width: 1280px;
  margin: -50px auto 24px auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.04);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 10;
  border: 1px solid #E5E7EB;
}
.bf-ribbon-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bf-ribbon-icon {
  font-size: 22px;
  background: #F0FFF4;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1B4332;
  flex-shrink: 0;
}
.bf-ribbon-title {
  font-size: 13px;
  font-weight: 800;
  color: #111827;
}
.bf-ribbon-desc {
  font-size: 11px;
  color: #6B7280;
}

@media (min-width: 560px) {
  .bf-product-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 768px) {
  .bf-product-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .bf-section-pad { padding: 28px 24px; }
  .bf-hero-wave-container {
    padding: 60px 40px 100px 40px;
    border-radius: 0 0 80px 80px;
  }
  .bf-hero-inner {
    flex-direction: row;
    text-align: left;
    gap: 48px;
  }
  .bf-hero-text {
    text-align: left;
  }
  .bf-hero-subtitle {
    margin-left: 0;
  }
  .bf-hero-actions {
    justify-content: flex-start;
  }
  .bf-hero-review-card {
    left: -20px;
    bottom: 15px;
  }
  .bf-hero-circle-bg {
    width: 320px;
    height: 320px;
  }
  .bf-hero-stats {
    grid-template-columns: repeat(4, 1fr);
    margin-top: 48px;
  }
  .bf-features-ribbon {
    flex-direction: row;
    justify-content: space-around;
    padding: 20px 32px;
    margin: -60px auto 28px auto;
  }
  .bf-ribbon-item {
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .bf-product-grid { grid-template-columns: repeat(6, 1fr); }
  .bf-section-pad { padding: 32px 24px; }
}
`;

export default function HomePage() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Most Ordered");
  const { isMobile } = useResponsive();

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/categories")])
      .then(([p, c]) => {
        setProducts(p.data.products);

        // ── FIX (#1 / #5): only show categories that actually have
        // products, so the homepage never advertises an empty shelf.
        // Counts products by category_id against the products list.
        const productCategoryIds = new Set(
          p.data.products.map((prod) => prod.category_id),
        );
        const categoriesWithStock = (c.data.categories || []).filter((cat) =>
          productCategoryIds.has(cat.id),
        );
        setCategories(categoriesWithStock);
      })
      .finally(() => setLoading(false));
  }, []);

  const tabs = ["Most Ordered", "In Season", "Fresh Deals", "Best Value"];

  return (
    <PageWrapper>
      <style>{HOME_CSS}</style>
      <div style={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}>
        
        {/* Curved Hero Section */}
        <div className="bf-hero-wave-container">
          <div className="bf-hero-inner">
            {/* Text column */}
            <div className="bf-hero-text">
              <span className="bf-hero-tagline">🌿 100% Farm-Fresh & Organic</span>
              <h1 className="bf-hero-title">
                ORGANIC <span style={{ color: "#69F0AE" }}>FOOD</span>
              </h1>
              <p className="bf-hero-subtitle">
                Direct from local Nigerian farms to your kitchen. Buy fresh vegetables, tubers, grains, and staples at fair, dynamic prices.
              </p>
              <div className="bf-hero-actions">
                <button onClick={() => navigate("/products")} className="bf-hero-btn-primary">
                  Shop Products
                </button>
                <button onClick={() => navigate("/chef-chat")} className="bf-hero-btn-secondary">
                  Chef Bems AI 🍲
                </button>
              </div>
            </div>

            {/* Graphic column */}
            <div className="bf-hero-graphic">
              <div className="bf-hero-circle-bg">
                <motion.img
                  src={heroSalad}
                  alt="Organic salad plate"
                  className="bf-hero-salad-image"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                />
                <span className="bf-floating-garlic">🧄</span>
                <span className="bf-floating-pepper">🌶</span>
              </div>

              {/* Glassmorphic testimonial rating widget */}
              <div className="bf-hero-review-card">
                <div className="bf-review-header">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&q=80"
                    alt="Marina Stevani"
                    className="bf-review-avatar"
                  />
                  <div>
                    <div className="bf-review-name">Marina Stevani</div>
                    <div className="bf-review-stars">★★★★★</div>
                  </div>
                </div>
                <p className="bf-review-text">"Outstanding service! The ugu leaves and fresh tomatoes are incredibly crisp."</p>
              </div>
            </div>
          </div>

          {/* Statistical Grid counters */}
          <div className="bf-hero-stats">
            <div className="bf-stat-item">
              <div className="bf-stat-num">1,900+</div>
              <div className="bf-stat-label">Products Sourced</div>
            </div>
            <div className="bf-stat-item">
              <div className="bf-stat-num">2,800+</div>
              <div className="bf-stat-label">Happy Customers</div>
            </div>
            <div className="bf-stat-item">
              <div className="bf-stat-num">3,200+</div>
              <div className="bf-stat-label">Orders Completed</div>
            </div>
            <div className="bf-stat-item">
              <div className="bf-stat-num">100%</div>
              <div className="bf-stat-label">Freshness Guarantee</div>
            </div>
          </div>
        </div>

        <div
          className="bf-section-pad"
          style={{ maxWidth: "1280px", margin: "0 auto" }}
        >
          {/* Quick-Feature Floating Ribbon */}
          <div className="bf-features-ribbon">
            <div className="bf-ribbon-item">
              <span className="bf-ribbon-icon">⚡</span>
              <div>
                <div className="bf-ribbon-title">Fast Delivery</div>
                <div className="bf-ribbon-desc">Same-day within Lagos</div>
              </div>
            </div>
            <div className="bf-ribbon-item">
              <span className="bf-ribbon-icon">🍲</span>
              <div>
                <div className="bf-ribbon-title">Chef Bems AI</div>
                <div className="bf-ribbon-desc">Nigerian diet planner</div>
              </div>
            </div>
            <div className="bf-ribbon-item">
              <span className="bf-ribbon-icon">🏪</span>
              <div>
                <div className="bf-ribbon-title">Store Pick up</div>
                <div className="bf-ribbon-desc">Local hub collections</div>
              </div>
            </div>
          </div>

          {/* Welcome back */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: "24px", marginTop: "12px" }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: colors.text,
                  fontFamily: fonts.heading,
                  margin: 0,
                }}
              >
                Welcome back, {user.name?.split(" ")[0]}! 👋
              </h2>
              <p
                style={{
                  color: colors.textFaint,
                  fontSize: "14px",
                  margin: "4px 0 0",
                }}
              >
                What fresh Nigerian ingredients are we cooking with today?
              </p>
            </motion.div>
          )}

          {/* Tabs */}
          <div
            className="bf-tab-row"
            style={{
              display: "flex",
              marginBottom: "24px",
              borderBottom: `2px solid ${colors.border}`,
              overflowX: "auto",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontFamily: fonts.body,
                  backgroundColor: "transparent",
                  color: activeTab === tab ? colors.primary : colors.textFaint,
                  borderBottom: `2px solid ${activeTab === tab ? colors.primaryLight : "transparent"}`,
                  marginBottom: "-2px",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Products */}
          {loading ? (
            <div className="bf-product-grid">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                  style={{
                    height: "220px",
                    backgroundColor: "white",
                    borderRadius: "16px",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bf-product-grid" style={{ marginBottom: "40px" }}>
              {products.slice(0, 12).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/products")}
              style={buttonStyle("primary", "lg")}
            >
              View All Products →
            </motion.button>
          </div>

          {/* Categories — only ones with products, each with an icon */}
          {categories.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: colors.text,
                    fontFamily: fonts.heading,
                    margin: 0,
                  }}
                >
                  🌿 Shop by Category
                </h2>
                <button
                  onClick={() => navigate("/products")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: colors.amber,
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  See all
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
                className="hide-scrollbar"
              >
                {categories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/products?category=${cat.name}`)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      minWidth: "76px",
                    }}
                  >
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        marginBottom: "8px",
                        border: `2px solid ${colors.border}`,
                      }}
                    >
                      {getCategoryIcon(cat.name)}
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: colors.textMuted,
                        fontWeight: 600,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        margin: 0,
                      }}
                    >
                      {cat.name.split(" ")[0]}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
