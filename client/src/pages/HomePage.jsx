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
.hero-dark-chip {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(10px);
}
.hero-dark-outline-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.22);
  backdrop-filter: blur(10px);
}
.hero-dark-outline-btn:hover {
  background: rgba(255,255,255,0.12);
}
.hero-video-frame {
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 30px 90px -20px rgba(0,0,0,0.6), 0 0 90px -10px rgba(46,125,50,0.45);
}
.hero-badge-card {
  background: rgba(15,42,30,0.75);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(14px);
}
`;

export default function HomePage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Load real catalog database products
  useEffect(() => {
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
      .catch((err) => console.error("Error loading products:", err))
      .finally(() => setLoading(false));
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

        {/* ────────────────── HERO SECTION (dark, glass/blob) ────────────────── */}
        <section
          className="relative z-0 overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32"
          style={{ background: "linear-gradient(160deg, #0E2A1C 0%, #0B1F17 55%, #0A1913 100%)" }}
        >
          <div className="home-grain" />

          {/* Glowing blobs for atmosphere */}
          <div className="home-blob" style={{ width: 520, height: 520, top: -180, left: -160, background: "radial-gradient(circle, rgba(46,125,50,0.45), transparent 70%)" }} />
          <div className="home-blob" style={{ width: 420, height: 420, bottom: -160, right: -120, background: "radial-gradient(circle, rgba(245,158,11,0.28), transparent 70%)" }} />
          <div className="home-blob" style={{ width: 300, height: 300, top: "35%", right: "18%", background: "radial-gradient(circle, rgba(74,222,128,0.22), transparent 70%)" }} />

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-14 items-center relative z-10">

            {/* Hero Left Content */}
            <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="hero-dark-chip inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-300 px-3.5 py-1.5 rounded-full mb-6">
                🌾 Fresh from Nigerian farms
              </span>
              <h1 className="text-[44px] md:text-[62px] lg:text-[70px] leading-[1.08] font-extrabold text-white mb-6 font-display tracking-tight">
                From Food Bar <br />
                to Your <span className="text-[#4ADE80]">Door</span>
              </h1>
              <p className="text-white/60 text-[15px] md:text-[17px] leading-relaxed max-w-lg mb-9 font-medium">
                Explore the endless possibilities of food with Savory. With exquisite local Nigerian cuisines, you'll never run out of options. Sign up now and embark on your delicious journey.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                <a
                  href="#menu"
                  className="bg-[#2E7D32] hover:bg-emerald-500 text-white font-bold text-[14px] px-8 py-3.5 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-200"
                >
                  Order Now
                </a>
                <button
                  onClick={() => navigate("/products")}
                  className="hero-dark-outline-btn text-white font-bold text-[14px] px-8 py-3.5 rounded-full transition-all duration-200"
                >
                  Start exploring →
                </button>
              </div>
            </div>

            {/* Hero Right Visual: farm video in a clean glass frame */}
            <div className="lg:col-span-6 relative w-full flex justify-center">
              <div className="relative w-full max-w-[520px]">
                <div className="hero-video-frame relative rounded-[32px] overflow-hidden aspect-[4/5] md:aspect-[4/5]">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    src="https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_960/v1786166058/A_warm_sun_drenched_Nigerian_f7oi4i.mp4"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
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
                        <div key={p.id} className="w-9 h-9 rounded-full border-2 border-[#0E2A1C] overflow-hidden bg-white shrink-0">
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="text-left">
                      <div className="text-white text-[13px] font-bold leading-tight">Farm fresh, daily</div>
                      <div className="text-white/50 text-[11px] font-medium leading-tight">Straight from the source</div>
                    </div>
                  </motion.div>
                )}
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
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">📁</div>
              <h3 className="font-bold text-[16px] text-gray-800 dark:text-white mb-2">Best Quality</h3>
              <p className="text-gray-500 dark:text-neutral-400 text-[12.5px] leading-relaxed">
                We create the best dishes from fresh farm produce to give you healthy consumption as much as we can.
              </p>
            </div>

            {/* Box 2 */}
            <div className="home-glass-card p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">🍲</div>
              <h3 className="font-bold text-[16px] text-gray-800 dark:text-white mb-2">Variety of Dishes</h3>
              <p className="text-gray-500 dark:text-neutral-400 text-[12.5px] leading-relaxed">
                We bring to live several local cuisines from the deep roots of Nigeria to soothe your taste buds.
              </p>
            </div>

            {/* Box 3 */}
            <div className="home-glass-card p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center text-xl mb-5">🎁</div>
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
          <div className="flex justify-center gap-2 border-b border-gray-200/50 dark:border-neutral-800 pb-4 mb-8 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("All")}
              className={`text-xs px-4 py-2 rounded-full font-bold border transition-colors ${
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
                className={`text-xs px-4 py-2 rounded-full font-bold border transition-colors white-space-nowrap ${
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
