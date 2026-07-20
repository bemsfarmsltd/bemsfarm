import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const PRODUCT_IMAGES = {
  "Ofada Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
  "Long Grain Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141706/long_grain_rice_yn01lt.jpg",
  "Palm Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg",
  "Groundnut Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141769/Groundnut-oil_mgv43t.jpg",
  "Black-eyed Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142333/black-eyed-beans_i2n8fi.jpg",
  "Brown Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141864/brown_beans_zxbjos.jpg",
  "Garri (White)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142399/white_garri_zaq8i4.png",
  "Garri (Yellow)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142425/yellow_garri_kxiyxr.png",
  "Fresh Tomatoes":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg",
  "Dried Crayfish":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141631/crayfish_bslwl4.jpg",
  Cocoyam:
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141939/cocoyam_wvtyqz.png",
  "Ugu Leaves":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142531/ugu_zva1av.png",
};

function getProductImage(product) {
  if (
    product.image_url?.startsWith("data:") ||
    product.image_url?.startsWith("http")
  )
    return product.image_url;
  return (
    PRODUCT_IMAGES[product.name] ||
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"
  );
}

const CATEGORY_EMOJIS = {
  "Grains & Cereals": "🌾",
  "Vegetables": "🥕",
  "Cooking Oils": "🫙",
  "Legumes": "🫘",
  "Tubers & Roots": "🍠",
  "Spices & Seasonings": "🌶️",
  "Leafy Greens": "🥬",
  "Fruits": "🍉"
};

const DASHBOARD_CSS = `
.bp-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px 60px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Top Header Bar */
.bp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.bp-greeting h2 {
  font-family: 'Syne', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #1B4332;
  margin: 0 0 4px;
}
.bp-greeting p {
  color: #6B7280;
  font-size: 14px;
  margin: 0;
}
.bp-search-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 14px;
  padding: 10px 16px;
  flex: 1;
  max-width: 480px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.bp-search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 14px;
  font-family: 'Nunito', sans-serif;
  color: #111827;
}
.bp-search-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9CA3AF;
  font-size: 18px;
  padding: 0;
}
.bp-meta-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.bp-meta-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.bp-meta-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: #ffffff;
  border: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4B5563;
  font-size: 18px;
  cursor: pointer;
  position: relative;
}
.bp-meta-btn .dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  background-color: #F57C00;
  border-radius: 50%;
}
.bp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

/* Promo Banner */
.bp-promo-card {
  background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
  border-radius: 24px;
  padding: 32px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  color: white;
  min-height: 180px;
  box-shadow: 0 10px 30px rgba(27,67,50,0.15);
}
.bp-promo-info {
  max-width: 60%;
  z-index: 2;
}
.bp-promo-info h3 {
  font-family: 'Syne', sans-serif;
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 8px;
  line-height: 1.2;
}
.bp-promo-info p {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  margin: 0 0 20px;
}
.bp-promo-btn {
  background-color: #ffffff;
  color: #1B4332;
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: all 0.2s;
}
.bp-promo-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}
.bp-promo-img {
  position: absolute;
  right: 40px;
  bottom: -20px;
  width: 240px;
  height: 240px;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

/* Category Slider */
.bp-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.bp-section-title h3 {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
  margin: 0;
}
.bp-see-all {
  color: #F57C00;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}
.bp-categories-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;
}
.bp-categories-list::-webkit-scrollbar {
  height: 5px;
}
.bp-categories-list::-webkit-scrollbar-thumb {
  background-color: #E5E7EB;
  border-radius: 10px;
}
.bp-category-card {
  flex-shrink: 0;
  background-color: #ffffff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #4B5563;
  font-family: 'Nunito', sans-serif;
  transition: all 0.2s;
}
.bp-category-card:hover {
  background-color: #F9FAFB;
  border-color: #D1D5DB;
}
.bp-category-card.active {
  background-color: #E8F5E9;
  border-color: #A3E635;
  color: #1B4332;
}

/* Product Catalog Grid */
.bp-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .bp-container {
    padding: 24px 16px 48px;
    gap: 20px;
  }
  .bp-promo-card {
    padding: 24px;
    flex-direction: column;
    align-items: flex-start;
  }
  .bp-promo-info {
    max-width: 100%;
  }
  .bp-promo-img {
    display: none;
  }
  .bp-products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
`;

export default function ProductsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const [activeCat, setActiveCat] = useState(params.get("category") || "All");
  const [sort, setSort] = useState("featured");

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/categories")])
      .then(([p, c]) => {
        setProducts(p.data.products);
        setCategories(c.data.categories);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [productId]: !prev[productId] };
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const filtered = products
    .filter((p) => {
      const matchCat = activeCat === "All" || p.category_name === activeCat;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });

  const cats = ["All", ...categories.map((c) => c.name)];

  return (
    <PageWrapper>
      <div className="bp-container">
        <style>{DASHBOARD_CSS}</style>



        {/* ── 2. PROMO CARD BANNER ── */}
        <div className="bp-promo-card" style={{ position: "relative", overflow: "hidden", background: "none", padding: 0, height: "480px" }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
              borderRadius: "24px"
            }}
            src="https://res.cloudinary.com/dyzkjerez/video/upload/v1784552209/Create_an_exiting_carousel_vid_xh7212.mp4"
          />
        </div>

        {/* ── 3. CATEGORIES CAROUSEL ── */}
        <div>
          <div className="bp-section-title">
            <h3>Category</h3>
            <span className="bp-see-all" onClick={() => setActiveCat("All")}>See all</span>
          </div>

          <div className="bp-categories-list">
            {cats.map((cat) => {
              const emoji = CATEGORY_EMOJIS[cat] || "🌿";
              return (
                <div
                  key={cat}
                  className={`bp-category-card ${activeCat === cat ? "active" : ""}`}
                  onClick={() => setActiveCat(cat)}
                >
                  <span>{emoji}</span>
                  <span>{cat}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. PRODUCT CATALOG GRID ── */}
        <div>
          <div className="bp-section-title">
            <h3>Best sellers</h3>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: "6px 12px",
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                fontSize: "12px",
                color: "#4B5563",
                outline: "none",
                backgroundColor: "white",
                fontFamily: "Nunito, sans-serif",
                cursor: "pointer"
              }}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price Low-High</option>
              <option value="price-desc">Price High-Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          {loading ? (
            <div className="bp-products-grid">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "260px",
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: "1px solid #E5E7EB",
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px",
                    gap: "8px"
                  }}
                >
                  <div style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: "12px", animation: "pulse 1.5s infinite" }} />
                  <div style={{ height: "12px", width: "70%", backgroundColor: "#F3F4F6", borderRadius: "4px" }} />
                  <div style={{ height: "16px", width: "40%", backgroundColor: "#F3F4F6", borderRadius: "4px" }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                backgroundColor: "white",
                borderRadius: "24px",
                border: "1px solid #E5E7EB"
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🌾</div>
              <h4 style={{ margin: "0 0 6px", fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700 }}>No products found</h4>
              <p style={{ color: "#9CA3AF", fontSize: "13px", margin: "0 0 16px" }}>Try searching something else</p>
              <button
                onClick={() => { setSearch(""); setActiveCat("All"); }}
                style={{
                  backgroundColor: "#1B4332",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="bp-products-grid">
              {filtered.map((product) => {
                const isFavorite = !!favorites[product.id];
                const mockDiscount = product.id % 2 === 0 ? (product.id % 4 === 0 ? "15%" : "10%") : null;

                return (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/product/${product.id}`)}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "18px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Top Action Layer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", position: "relative", zIndex: 5 }}>
                      <button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        style={{
                          background: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: isFavorite ? "#EF4444" : "#D1D5DB",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                          fontSize: "16px",
                          padding: 0
                        }}
                      >
                        <i className={isFavorite ? "ri-heart-fill" : "ri-heart-line"} />
                      </button>

                      {mockDiscount && (
                        <div style={{ backgroundColor: "#EF4444", color: "white", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "50px" }}>
                          {mockDiscount} OFF
                        </div>
                      )}
                    </div>

                    {/* Product Image */}
                    <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", overflow: "hidden", borderRadius: "12px" }}>
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        style={{ height: "100%", width: "100%", objectFit: "cover" }}
                      />
                    </div>

                    {/* Category & Title */}
                    <p style={{ color: "#9CA3AF", fontSize: "11px", margin: "0 0 2px", fontWeight: 600 }}>{product.category_name}</p>
                    <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#111827", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "36px", lineHeight: 1.3 }}>
                      {product.name}
                    </h4>

                    {/* Gold Rating Stars */}
                    <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                      {[...Array(5)].map((_, idx) => (
                        <i key={idx} className="ri-star-fill" style={{ color: "#F57C00", fontSize: "11px" }} />
                      ))}
                    </div>

                    {/* Footer Row */}
                    <div style={{ display: "flex", alignItems: "center", justifycontent: "space-between", marginTop: "auto" }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: "10px", color: "#9CA3AF" }}>{product.unit}</span>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: "#1B4332", fontFamily: "Syne, sans-serif" }}>
                          ₦{(product.price * 1500).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        style={{
                          background: "#F57C00",
                          border: "none",
                          borderRadius: "10px",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "18px",
                          boxShadow: "0 2px 6px rgba(245,124,0,0.2)",
                          padding: 0,
                          marginLeft: "auto"
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
