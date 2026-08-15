import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import ProductCard from "../components/ui/ProductCard";
import PageWrapper from "../components/layout/PageWrapper";

const HOME_CSS = `
.home-grain {
  position: absolute;
  inset: 0;
  opacity: 0.045;
  mix-blend-mode: overlay;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.home-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
.home-glass-card {
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(27,67,50,0.08);
  backdrop-filter: blur(10px);
}
.hero-v2 {
  background: radial-gradient(120% 100% at 100% 0%, #123626 0%, #0A1912 55%, #071008 100%);
}
.hero-topbar-chip {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
}
.hero-video-blob-frame {
  border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%;
  animation: blobMorphA 18s ease-in-out infinite;
  box-shadow: 0 40px 100px -30px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06);
}
.hero-social-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.7);
  transition: all 0.2s ease;
}
.hero-social-icon:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.35);
  color: #fff;
}
.hero-glass-blob {
  position: absolute;
  pointer-events: none;
}
.hero-glass-blob.tone-emerald {
  background: linear-gradient(135deg, rgba(46,125,50,0.55), rgba(15,61,34,0.18));
  box-shadow: inset 1px 1px 0 rgba(255,255,255,0.08), inset -24px -24px 50px rgba(0,0,0,0.35);
}
.hero-glass-blob.tone-amber {
  background: linear-gradient(135deg, rgba(245,124,0,0.4), rgba(43,27,0,0.14));
  box-shadow: inset 1px 1px 0 rgba(255,255,255,0.08), inset -24px -24px 50px rgba(0,0,0,0.3);
}
.hero-glass-blob.tone-frost {
  background: linear-gradient(135deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02));
  box-shadow: inset 1px 1px 0 rgba(255,255,255,0.12), inset -24px -24px 50px rgba(0,0,0,0.25);
}
@keyframes blobMorphA {
  0%, 100% { border-radius: 42% 58% 65% 35% / 45% 45% 55% 55%; }
  33%      { border-radius: 60% 40% 30% 70% / 60% 35% 65% 40%; }
  66%      { border-radius: 35% 65% 55% 45% / 40% 60% 40% 60%; }
}
@keyframes blobMorphB {
  0%, 100% { border-radius: 65% 35% 45% 55% / 40% 55% 45% 60%; }
  50%      { border-radius: 40% 60% 60% 40% / 60% 40% 55% 45%; }
}
`;

// Large soft "frosted glass" blob panels forming the hero backdrop — sized,
// positioned and timed by hand so the composition is stable across renders.
const HERO_GLASS_BLOBS = [
  { width: 340, height: 320, top: "-6%",  left: "38%", tone: "emerald", morph: "a", dur: 20 },
  { width: 460, height: 420, top: "8%",   left: "54%", tone: "frost",   morph: "b", dur: 26 },
  { width: 300, height: 280, top: "48%",  left: "70%", tone: "amber",   morph: "a", dur: 22 },
  { width: 150, height: 150, top: "4%",   left: "2%",  tone: "frost",   morph: "b", dur: 14 },
];

function HeroGlassBlob({ b }) {
  return (
    <div
      className={`hero-glass-blob tone-${b.tone} ${b.morph === "b" ? "" : ""}`}
      style={{
        width: b.width,
        height: b.height,
        top: b.top,
        left: b.left,
        animation: `${b.morph === "b" ? "blobMorphB" : "blobMorphA"} ${b.dur}s ease-in-out infinite`,
      }}
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Load real catalog database products
  const loadProducts = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([api.get("/products"), api.get("/categories")])
      .then(([p, c]) => {
        setProducts(p.data.products || []);
        const productCategoryIds = new Set(
          (p.data.products || []).map((prod) => prod.category_id)
        );
        const categoriesWithStock = (c.data.categories || []).filter((cat) =>
          productCategoryIds.has(cat.id)
        );
        setCategories(categoriesWithStock);
      })
      .catch((err) => {
        console.error("Error loading products:", err);
        setLoadError(err.response?.data?.message || "Failed to load products");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Hero showcase — real, currently-in-stock products (prefers featured ones)
  // instead of hardcoded ids that could point at deleted/reseeded products.
  const heroProducts = useMemo(() => {
    const inStock = products.filter((p) => (p.stock ?? 1) > 0);
    const featured = inStock.filter((p) => p.is_featured);
    return (featured.length >= 3 ? featured : inStock).slice(0, 3);
  }, [products]);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "All") return matchesSearch;
    return matchesSearch && categories.find((c) => c.name === activeTab)?.id === p.category_id;
  });

  return (
    <PageWrapper>
      <div className="min-h-screen text-gray-800 font-sans antialiased overflow-x-hidden" style={{ backgroundColor: "#FBF8F3" }}>
        <style>{HOME_CSS}</style>

        {/* ────────────────── HERO SECTION ────────────────── */}
        <section className="hero-v2 relative z-0 overflow-hidden pt-10 pb-20 md:pt-12 md:pb-28">
          <div className="home-grain" />

          {/* Large frosted-glass blob composition, backing the video */}
          <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
            {HERO_GLASS_BLOBS.map((b, i) => (
              <HeroGlassBlob key={i} b={b} />
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

            {/* Hero top row — small brand mark, echoing the reference template's logo lockup */}
            <div className="flex items-center justify-center lg:justify-start mb-12 md:mb-16">
              <span className="hero-topbar-chip inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-300 px-3.5 py-1.5 rounded-full">
                🌾 Fresh from Nigerian farms
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">

              {/* Hero Left Content */}
              <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start">
                <h1 className="uppercase text-[38px] md:text-[54px] lg:text-[62px] leading-[1.08] font-extrabold mb-6 font-display tracking-tight">
                  <span className="text-white">From Food Barn</span>
                  <br />
                  <span className="text-[#FFC876]">to Your Door</span>
                </h1>
                <p className="text-white/55 text-[15px] md:text-[16px] leading-relaxed max-w-md mb-9 font-medium">
                  Explore the endless possibilities of food with Savory. With exquisite local Nigerian cuisines, you'll never run out of options. Sign up now and embark on your delicious journey.
                </p>

                <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start w-full mb-10">
                  <a
                    href="#menu"
                    className="bg-[#2E7D32] hover:bg-emerald-600 text-white font-bold text-[13px] uppercase tracking-wide px-8 py-3.5 rounded-full shadow-lg shadow-emerald-900/40 transition-all duration-200"
                  >
                    Order Now
                  </a>
                  <button
                    onClick={() => navigate("/products")}
                    className="text-white/70 hover:text-white font-semibold text-[14px] transition-colors duration-200"
                  >
                    Browse products →
                  </button>
                </div>

              </div>

              {/* Hero Right Visual: farm video bleeding into the glass blobs */}
              <div className="lg:col-span-6 relative w-full flex justify-center">
                <div className="relative w-full max-w-[480px]">
                  <div className="hero-video-blob-frame relative overflow-hidden aspect-[4/5]">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      src="https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_960/v1786166058/A_warm_sun_drenched_Nigerian_f7oi4i.mp4"
                    />
                  </div>

                  {heroProducts.length > 0 && (
                    <motion.div
                      initial={{ y: 0 }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="hero-badge-card absolute -bottom-6 -left-4 md:-left-8 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl"
                    >
                      <div className="flex -space-x-3">
                        {heroProducts.slice(0, 3).map((p) => (
                          <div key={p.id} className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white shrink-0">
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="text-left">
                        <div className="text-gray-800 text-[13px] font-bold leading-tight">Farm fresh, daily</div>
                        <div className="text-gray-500 text-[11px] font-medium leading-tight">Straight from the source</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* ────────────────── WHY CHOOSE US? ────────────────── */}
      <section id="why-choose-us" className="py-20 dark:bg-neutral-950 transition-colors duration-300" style={{ backgroundColor: "#FBF8F3" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#2E7D32] dark:text-emerald-400 tracking-tight uppercase mb-4 font-display">
              Why Choose Us?
            </h2>
            <p className="text-gray-500 dark:text-neutral-400 font-medium text-[15px] leading-relaxed">
              We are No.1 at preparing the best Nigerian delicacies that soothe your taste whether you are an indigene or a foreigner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Box 1 */}
            <div className="home-glass-card p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div style={{fontSize:'1.35em'}} className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">📁</div>
              <h3 className="font-bold text-[16px] text-gray-800 dark:text-white mb-2">Best Quality</h3>
              <p className="text-gray-500 dark:text-neutral-400 text-[12.5px] leading-relaxed">
                We create the best dishes from fresh farm produce to give you healthy consumption as much as we can.
              </p>
            </div>

            {/* Box 2 */}
            <div className="home-glass-card p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div style={{fontSize:'1.35em'}} className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">🍲</div>
              <h3 className="font-bold text-[16px] text-gray-800 dark:text-white mb-2">Variety of Dishes</h3>
              <p className="text-gray-500 dark:text-neutral-400 text-[12.5px] leading-relaxed">
                We bring to live several local cuisines from the deep roots of Nigeria to soothe your taste buds.
              </p>
            </div>

            {/* Box 3 */}
            <div className="home-glass-card p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div style={{fontSize:'1.35em'}} className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">🎁</div>
              <h3 className="font-bold text-[16px] text-gray-800 dark:text-white mb-2">Reusable Packs</h3>
              <p className="text-gray-500 dark:text-neutral-400 text-[12.5px] leading-relaxed">
                Our food packaging are durable and can be reused at home for food packs, we charge nothing for.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ────────────────── REAL PRODUCT CATALOGUE (MAINTAINS SYSTEM FUNCTIONALITY) ────────────────── */}
      <section id="menu" className="py-20 dark:bg-neutral-900 transition-colors duration-300" style={{ backgroundColor: "#F3EDE1" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-[#F57C00] uppercase">Store Catalogue</span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 mb-2 font-display">Our Fresh Farm Products</h2>
            <div className="w-12 h-1 bg-[#2E7D32] mx-auto rounded-full mb-8" />
            
            {/* Catalog search bar */}
            <input
              type="text"
              placeholder="Search farm fresh ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full px-5 py-3 border-2 border-gray-150 dark:border-neutral-800 focus:border-[#2E7D32] rounded-full text-[14px] font-medium outline-none transition-all placeholder-gray-300 bg-white dark:bg-neutral-950 dark:text-white"
            />
          </div>

          {/* Categories Tab selectors */}
          <div className="flex justify-start md:justify-center gap-2 border-b border-gray-200/50 dark:border-neutral-800 pb-4 mb-8 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("All")}
              className={`whitespace-nowrap shrink-0 text-xs px-4 py-2 rounded-full font-bold border transition-colors ${
                activeTab === "All"
                  ? "bg-[#2E7D32] border-[#2E7D32] text-white shadow-sm"
                  : "bg-white dark:bg-neutral-950 border-gray-100 dark:border-neutral-800 text-gray-500 dark:text-neutral-450 hover:border-gray-200 dark:hover:border-neutral-700"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.name)}
                className={`whitespace-nowrap shrink-0 text-xs px-4 py-2 rounded-full font-bold border transition-colors ${
                  activeTab === cat.name
                    ? "bg-[#2E7D32] border-[#2E7D32] text-white shadow-sm"
                    : "bg-white dark:bg-neutral-950 border-gray-100 dark:border-neutral-800 text-gray-500 dark:text-neutral-450 hover:border-gray-200 dark:hover:border-neutral-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Loader or Product grid */}
          {loadError && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "14px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "27" }}>⚠️</span>
              <div>
                <p style={{ fontWeight: 700, color: "#DC2626", margin: "0 0 4px" }}>Failed to load products</p>
                <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>{loadError}</p>
              </div>
              <button
                onClick={loadProducts}
                style={{
                  marginLeft: "auto",
                  padding: "8px 16px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-56 bg-gray-50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-gray-400 font-semibold py-12">No products found matching filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredProducts.slice(0, 10).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

        </div>
      </section>

      </div>
    </PageWrapper>
  );
}
