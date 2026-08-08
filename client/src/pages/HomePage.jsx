import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import ProductCard from "../components/ui/ProductCard";
import PageWrapper from "../components/layout/PageWrapper";
import ErrorBoundary from "../components/ErrorBoundary";
import { NAIRA_PER_UNIT } from "../utils/currency";

const Hero3D = lazy(() => import("../components/Hero3D"));

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
`;

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
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

        {/* ────────────────── HERO SECTION ────────────────── */}
        <section className="relative z-0 pt-8 pb-12 md:pt-14 overflow-hidden">

          {/* Curving emerald backdrop block on hero, with real farm footage playing inside it */}
          <div className="absolute top-0 right-0 w-[55%] h-[95%] rounded-bl-[200px] -z-10 hidden lg:block overflow-hidden bg-[#2E7D32]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              src="https://res.cloudinary.com/dyzkjerez/video/upload/v1786166058/A_warm_sun_drenched_Nigerian_f7oi4i.mp4"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332]/70 via-[#2E7D32]/50 to-[#2E7D32]/70" />
          </div>
          <div className="home-grain hidden lg:block" style={{ right: 0, left: "45%" }} />

          {/* Decorative blobs on the cream side of the hero */}
          <div
            className="home-blob"
            style={{ width: 320, height: 320, top: -80, left: -100, background: "radial-gradient(circle, rgba(46,125,50,0.12), transparent 70%)" }}
          />
          <div
            className="home-blob"
            style={{ width: 240, height: 240, bottom: -60, left: "20%", background: "radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)" }}
          />

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

            {/* Hero Left Content */}
            <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <span
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-800 px-3.5 py-1.5 rounded-full mb-5"
                style={{ background: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.16)" }}
              >
                🌾 Fresh from Nigerian farms
              </span>
              <h1 className="text-[44px] md:text-[62px] lg:text-[70px] leading-[1.08] font-extrabold text-gray-900 mb-6 font-display tracking-tight">
                From Food Bar <br />
                to Your <span className="text-[#2E7D32]">Door</span>
              </h1>
              <p className="text-gray-500 text-[15px] md:text-[17px] leading-relaxed max-w-lg mb-8 font-medium">
                Explore the endless possibilities of food with Savory. With exquisite local Nigerian cuisines, you'll never run out of options. Sign up now and embark on your delicious journey.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                <a
                  href="#menu"
                  className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-[14px] px-8 py-3.5 rounded-full shadow-lg shadow-emerald-700/25 transition-all duration-200"
                >
                  Order Now
                </a>
                <button
                  onClick={() => navigate("/products")}
                  className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-800/80 font-bold text-[14px] px-8 py-3.5 rounded-full transition-all duration-200"
                >
                  Start exploring →
                </button>
              </div>
            </div>

            {/* Hero Right Visuals: real 3D product cluster, degrades to CSS motion */}
            <div className="lg:col-span-6 flex justify-center items-center relative py-6">
              {(() => {
                const fallback = (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                      className="relative w-[280px] h-[280px] md:w-[420px] md:h-[420px] rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white shrink-0"
                    >
                      <img
                        src="https://res.cloudinary.com/dyzkjerez/image/upload/v1784547066/Gemini_Generated_Image_gm16lpgm16lpgm16_s7uw3a.png"
                        alt="Fresh Nigerian food platter"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>

                    {heroProducts.length === 3 && (
                      <div className="absolute w-[360px] h-[360px] md:w-[500px] md:h-[500px] rounded-full -z-10 pointer-events-none">
                        <div className="absolute top-[8%] left-[10%] w-14 h-14 md:w-18 md:h-18 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                          <img src={heroProducts[0].image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="absolute top-[50%] right-[-4%] w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                          <img src={heroProducts[1].image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="absolute bottom-[4%] left-[45%] w-14 h-14 md:w-18 md:h-18 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                          <img src={heroProducts[2].image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                      </div>
                    )}
                  </>
                );

                if (heroProducts.length < 3) return fallback;

                return (
                  <div className="relative w-full max-w-[480px] h-[340px] md:h-[440px]">
                    <ErrorBoundary label="Hero3D" fallback={<div className="flex justify-center">{fallback}</div>}>
                      <Suspense fallback={<div className="flex justify-center">{fallback}</div>}>
                        <Hero3D heroProducts={heroProducts} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ─── Hero Cards Showcase Row (real catalog products) ─── */}
          {heroProducts.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 md:px-12 mt-16 md:mt-24">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {heroProducts.map((product) => (
                  <div key={product.id} className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-gray-100 dark:border-neutral-800 shadow-md flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2E7D32] bg-white dark:bg-neutral-900 absolute -top-12 shadow-md">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="pt-14 flex-1">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">{product.name}</h3>
                      <p className="text-gray-500 dark:text-neutral-400 text-[13px] leading-relaxed mb-5">
                        {product.description}
                      </p>
                    </div>
                    <div className="w-full flex justify-between items-center pt-3 border-t border-gray-50 dark:border-neutral-800">
                      <span className="font-extrabold text-[#2E7D32] dark:text-emerald-400 text-[15px]">
                        ₦{Math.round(product.price * NAIRA_PER_UNIT).toLocaleString()}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-xs py-1.5 px-4 rounded-full transition-colors"
                      >
                        Buy now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
