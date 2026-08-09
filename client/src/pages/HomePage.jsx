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
.hero-blob-shape {
  position: absolute;
  inset: 0;
  animation: blobMorphA 11s ease-in-out infinite;
}
.hero-blob-shape.morph-b { animation-name: blobMorphB; }
.hero-blob-shape.variant-emerald {
  background:
    radial-gradient(circle at 28% 24%, rgba(255,255,255,0.85), rgba(255,255,255,0) 34%),
    conic-gradient(from 210deg at 50% 50%, #0F3D22, #2E7D32 28%, #7BE38A 46%, #1B4332 68%, #0F3D22 100%);
  box-shadow:
    inset -10px -12px 22px rgba(0,0,0,0.28),
    inset 8px 10px 18px rgba(255,255,255,0.45),
    0 22px 40px -12px rgba(27,67,50,0.4);
}
.hero-blob-shape.variant-amber {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.9), rgba(255,255,255,0) 32%),
    conic-gradient(from 200deg at 50% 50%, #2B1B00, #F57C00 30%, #FFD54A 50%, #7A4A00 72%, #2B1B00 100%);
  box-shadow:
    inset -10px -12px 22px rgba(0,0,0,0.3),
    inset 8px 10px 18px rgba(255,255,255,0.5),
    0 22px 40px -12px rgba(154,90,0,0.35);
}
.hero-blob-shape.variant-pearl {
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0) 36%),
    conic-gradient(from 180deg at 50% 50%, #EFE6CF, #FFFFFF 32%, #E4D6A8 55%, #FBF8F3 78%, #EFE6CF 100%);
  box-shadow:
    inset -8px -10px 18px rgba(120,90,20,0.2),
    inset 6px 8px 16px rgba(255,255,255,0.6),
    0 18px 34px -12px rgba(120,90,20,0.25);
}
.hero-blob-shine {
  position: absolute;
  width: 34%;
  height: 22%;
  top: 14%;
  left: 20%;
  border-radius: 50%;
  background: rgba(255,255,255,0.75);
  filter: blur(4px);
  mix-blend-mode: screen;
  pointer-events: none;
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

// Playful floating liquid-glass blobs scattered behind the hero text — sized,
// positioned, and timed by hand (not random) so the layout is stable across renders.
// Tuned for the two-column desktop/tablet layout; shown md: and up only, since
// the same coordinates would collide with body text once the layout stacks to 1 column.
const HERO_BLOBS = [
  { size: 120, top: "2%",  left: "4%",  floatDur: 6.0, rotDur: 8.0,  delay: 0.0, tilt: 10, spin: 16, variant: "emerald", morph: "a" },
  { size: 70,  top: "14%", left: "35%", floatDur: 5.0, rotDur: 6.5,  delay: 0.5, tilt: -9,  spin: 14, variant: "amber",   morph: "b" },
  { size: 150, top: "54%", left: "0%",  floatDur: 7.0, rotDur: 9.0,  delay: 1.0, tilt: 8,   spin: 15, variant: "pearl",  morph: "a" },
  { size: 62,  top: "78%", left: "24%", floatDur: 4.5, rotDur: 5.5,  delay: 1.4, tilt: -12, spin: 13, variant: "emerald", morph: "b" },
  { size: 96,  top: "36%", left: "18%", floatDur: 6.5, rotDur: 7.5,  delay: 0.3, tilt: 8,   spin: 15, variant: "amber",   morph: "a" },
  { size: 80,  top: "0%",  left: "52%", floatDur: 5.5, rotDur: 7.0,  delay: 0.7, tilt: -10, spin: 14, variant: "pearl",  morph: "b" },
  { size: 126, top: "60%", left: "46%", floatDur: 6.0, rotDur: 8.5,  delay: 1.1, tilt: 9,   spin: 15, variant: "emerald", morph: "a" },
  { size: 56,  top: "28%", left: "44%", floatDur: 4.0, rotDur: 5.0,  delay: 1.7, tilt: -7,  spin: 13, variant: "amber",   morph: "b" },
  { size: 108, top: "8%",  left: "68%", floatDur: 6.2, rotDur: 7.8,  delay: 0.4, tilt: 11,  spin: 15, variant: "pearl",  morph: "a" },
  { size: 74,  top: "54%", left: "80%", floatDur: 5.2, rotDur: 6.0,  delay: 0.9, tilt: -9,  spin: 14, variant: "emerald", morph: "b" },
  { size: 94,  top: "80%", left: "62%", floatDur: 6.8, rotDur: 8.2,  delay: 1.3, tilt: 8,   spin: 15, variant: "amber",   morph: "a" },
  { size: 54,  top: "44%", left: "92%", floatDur: 4.6, rotDur: 5.8,  delay: 0.6, tilt: -11, spin: 13, variant: "pearl",  morph: "b" },
];

// Mobile gets a much smaller, corner-only set — the stacked single-column
// layout leaves no safe gaps next to the body text for a dense cluster.
const HERO_BLOBS_MOBILE = [
  { size: 68, top: "2%", left: "4%",  floatDur: 5.5, rotDur: 7.0, delay: 0.0, tilt: 10, spin: 14, variant: "emerald", morph: "a" },
  { size: 58, top: "3%", left: "76%", floatDur: 4.8, rotDur: 6.2, delay: 0.4, tilt: -9,  spin: 13, variant: "amber",   morph: "b" },
];

function HeroLiquidBlob({ f }) {
  return (
    <motion.div
      className="absolute"
      style={{
        width: f.size,
        height: f.size,
        top: f.top,
        left: f.left,
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
      <div className={`hero-blob-shape variant-${f.variant} ${f.morph === "b" ? "morph-b" : ""}`} style={{ animationDuration: `${f.floatDur * 1.8}s` }}>
        <div className="hero-blob-shine" />
      </div>
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

          {/* Playful floating liquid-glass blob cluster, sitting behind the text */}
          <div className="hidden md:block absolute inset-0 z-[1] pointer-events-none" style={{ perspective: 1200 }}>
            {HERO_BLOBS.map((f, i) => (
              <HeroLiquidBlob key={i} f={f} />
            ))}
          </div>
          <div className="md:hidden absolute inset-0 z-[1] pointer-events-none" style={{ perspective: 1200 }}>
            {HERO_BLOBS_MOBILE.map((f, i) => (
              <HeroLiquidBlob key={i} f={f} />
            ))}
          </div>

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
