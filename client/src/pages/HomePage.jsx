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
.hero-chip {
  background: rgba(46,125,50,0.08);
  border: 1px solid rgba(46,125,50,0.16);
}
.hero-video-frame {
  border: 1px solid rgba(27,67,50,0.08);
  box-shadow: 0 30px 80px -25px rgba(46,125,50,0.35), 0 8px 30px rgba(0,0,0,0.06);
}
.hero-badge-card {
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(27,67,50,0.08);
  backdrop-filter: blur(14px);
}
.hero-floater {
  border: 4px solid #fff;
  box-shadow: 0 16px 34px -10px rgba(46,125,50,0.3);
}
`;

// Playful floating product cutouts scattered behind the hero text — sized,
// positioned, and timed by hand (not random) so the layout is stable across renders.
// Tuned for the two-column desktop/tablet layout; shown md: and up only, since
// the same coordinates would collide with body text once the layout stacks to 1 column.
const HERO_FLOATERS = [
  { size: 104, top: "2%",  left: "4%",  floatDur: 6.0, rotDur: 8.0,  delay: 0.0, tilt: 12, spin: 22, blur: 0 },
  { size: 64,  top: "14%", left: "35%", floatDur: 5.0, rotDur: 6.5,  delay: 0.5, tilt: -10, spin: 18, blur: 1 },
  { size: 130, top: "56%", left: "1%",  floatDur: 7.0, rotDur: 9.0,  delay: 1.0, tilt: 10, spin: 20, blur: 0 },
  { size: 56,  top: "78%", left: "24%", floatDur: 4.5, rotDur: 5.5,  delay: 1.4, tilt: -14, spin: 16, blur: 1 },
  { size: 88,  top: "36%", left: "18%", floatDur: 6.5, rotDur: 7.5,  delay: 0.3, tilt: 9,  spin: 20, blur: 0 },
  { size: 74,  top: "0%",  left: "52%", floatDur: 5.5, rotDur: 7.0,  delay: 0.7, tilt: -12, spin: 18, blur: 1 },
  { size: 112, top: "62%", left: "46%", floatDur: 6.0, rotDur: 8.5,  delay: 1.1, tilt: 11, spin: 20, blur: 0 },
  { size: 50,  top: "28%", left: "44%", floatDur: 4.0, rotDur: 5.0,  delay: 1.7, tilt: -8,  spin: 16, blur: 1 },
  { size: 96,  top: "8%",  left: "68%", floatDur: 6.2, rotDur: 7.8,  delay: 0.4, tilt: 13,  spin: 20, blur: 0.5 },
  { size: 66,  top: "54%", left: "80%", floatDur: 5.2, rotDur: 6.0,  delay: 0.9, tilt: -11, spin: 18, blur: 1 },
  { size: 84,  top: "80%", left: "62%", floatDur: 6.8, rotDur: 8.2,  delay: 1.3, tilt: 10,  spin: 20, blur: 0 },
  { size: 48,  top: "44%", left: "92%", floatDur: 4.6, rotDur: 5.8,  delay: 0.6, tilt: -13, spin: 16, blur: 1.5 },
];

// Mobile gets a much smaller, corner-only set — the stacked single-column
// layout leaves no safe gaps next to the body text for a dense cluster.
const HERO_FLOATERS_MOBILE = [
  { size: 60, top: "2%", left: "4%",  floatDur: 5.5, rotDur: 7.0, delay: 0.0, tilt: 12, spin: 18, blur: 0 },
  { size: 52, top: "3%", left: "76%", floatDur: 4.8, rotDur: 6.2, delay: 0.4, tilt: -11, spin: 16, blur: 0 },
];

function HeroFloater({ f, src }) {
  return (
    <motion.div
      className="hero-floater absolute rounded-full overflow-hidden bg-white"
      style={{
        width: f.size,
        height: f.size,
        top: f.top,
        left: f.left,
        filter: f.blur ? `blur(${f.blur}px)` : undefined,
        transformStyle: "preserve-3d",
      }}
      animate={{
        y: [0, -16, 0],
        rotateZ: [-f.tilt, f.tilt, -f.tilt],
        rotateY: [-f.spin, f.spin, -f.spin],
      }}
      transition={{
        y: { duration: f.floatDur, repeat: Infinity, ease: "easeInOut", delay: f.delay },
        rotateZ: { duration: f.floatDur, repeat: Infinity, ease: "easeInOut", delay: f.delay },
        rotateY: { duration: f.rotDur, repeat: Infinity, ease: "easeInOut", delay: f.delay },
      }}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
    </motion.div>
  );
}

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

  // Real product photos used to fill the floating hero cluster — cycled if the
  // catalogue has fewer items than floater slots.
  const floatImages = useMemo(
    () => products.filter((p) => p.image_url).map((p) => p.image_url),
    [products]
  );

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
        <section className="relative z-0 overflow-hidden pt-16 pb-20 md:pt-20 md:pb-28" style={{ backgroundColor: "#FBF8F3" }}>
          <div className="home-grain" />

          {/* Soft warm-toned blobs for atmosphere */}
          <div className="home-blob" style={{ width: 420, height: 420, top: -140, left: -120, background: "radial-gradient(circle, rgba(46,125,50,0.14), transparent 70%)" }} />
          <div className="home-blob" style={{ width: 340, height: 340, bottom: -120, right: -80, background: "radial-gradient(circle, rgba(245,158,11,0.14), transparent 70%)" }} />

          {/* Playful floating 3D product cluster, sitting behind the text */}
          {floatImages.length > 0 && (
            <>
              <div className="hidden md:block absolute inset-0 z-[1] pointer-events-none" style={{ perspective: 1200 }}>
                {HERO_FLOATERS.map((f, i) => (
                  <HeroFloater key={i} f={f} src={floatImages[i % floatImages.length]} />
                ))}
              </div>
              <div className="md:hidden absolute inset-0 z-[1] pointer-events-none" style={{ perspective: 1200 }}>
                {HERO_FLOATERS_MOBILE.map((f, i) => (
                  <HeroFloater key={i} f={f} src={floatImages[i % floatImages.length]} />
                ))}
              </div>
            </>
          )}

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-14 items-center relative z-10">

            {/* Hero Left Content */}
            <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="hero-chip inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-800 px-3.5 py-1.5 rounded-full mb-6">
                🌾 Fresh from Nigerian farms
              </span>
              <h1 className="text-[44px] md:text-[62px] lg:text-[70px] leading-[1.08] font-extrabold text-gray-900 mb-6 font-display tracking-tight">
                From Food Bar <br />
                to Your <span className="text-[#2E7D32]">Door</span>
              </h1>
              <p className="text-gray-500 text-[15px] md:text-[17px] leading-relaxed max-w-lg mb-9 font-medium">
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
