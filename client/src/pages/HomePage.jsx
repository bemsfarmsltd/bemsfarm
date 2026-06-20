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

const HOME_CSS = `
.bf-banner-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.bf-product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.bf-section-pad { padding: 20px 16px; }
.bf-tab-row { gap: 2px; }
.bf-tab-row button { padding: 8px 12px; font-size: 13px; }

@media (min-width: 560px) {
  .bf-product-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 768px) {
  .bf-banner-grid { grid-template-columns: 2fr 1fr 1fr; gap: 16px; }
  .bf-product-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .bf-section-pad { padding: 28px 24px; }
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

  const banners = [
    {
      bg: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
      title: "Freshness Delivered",
      sub: "Straight from the farm",
      btn: "Shop Products",
      img: "https://images.unsplash.com/photo-1627484142233-50b6ac56d2c8?w=200&q=80",
      path: "/products",
    },
    {
      bg: "linear-gradient(135deg, #92400E 0%, #F59E0B 100%)",
      title: "Skip the Store",
      sub: "Straight to your doorstep",
      btn: "Order Now",
      img: "https://images.unsplash.com/photo-1601493700631-2851bdccf291?w=200&q=80",
      path: "/products",
    },
    {
      bg: "linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)",
      title: "Up to 40% Off",
      sub: "Save now, thank us later",
      btn: "Claim Offer",
      img: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=200&q=80",
      path: "/deals",
    },
  ];

  return (
    <PageWrapper>
      <style>{HOME_CSS}</style>
      <div style={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}>
        <div
          className="bf-section-pad"
          style={{ maxWidth: "1280px", margin: "0 auto" }}
        >
          {/* Welcome */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: "20px" }}
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
                What fresh Nigerian food are you looking for today?
              </p>
            </motion.div>
          )}

          {/* Banners */}
          <div className="bf-banner-grid" style={{ marginBottom: "32px" }}>
            {banners.map((b, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(b.path)}
                style={{
                  background: b.bg,
                  borderRadius: "20px",
                  padding: "22px 20px",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: "-10px",
                    bottom: "-10px",
                    width: "100px",
                    height: "100px",
                    opacity: 0.2,
                    backgroundImage: `url(${b.img})`,
                    backgroundSize: "cover",
                    borderRadius: "50%",
                  }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      margin: "0 0 6px",
                    }}
                  >
                    {b.title}
                  </p>
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      color: "white",
                      fontWeight: 800,
                      fontSize: i === 0 ? "20px" : "16px",
                      lineHeight: 1.2,
                      margin: "0 0 16px",
                    }}
                  >
                    {b.sub}
                  </h3>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "white",
                    padding: "7px 16px",
                    borderRadius: "50px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: fonts.body,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {b.btn} →
                </motion.button>
              </motion.div>
            ))}
          </div>

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
