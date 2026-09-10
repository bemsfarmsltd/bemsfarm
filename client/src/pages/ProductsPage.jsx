import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import { recordOutOfStockDemand } from "../utils/demandTracker";
import QuickViewModal from "../components/ui/QuickViewModal";
import RestockModal from "../components/ui/RestockModal";
import Toast from "../components/ui/Toast";

const SHOP_CSS = `
.bf-shop-page {
  background-color: #F8F5EE;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.bf-categories-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.bf-categories-scroll::-webkit-scrollbar {
  height: 4px;
}
.bf-categories-scroll::-webkit-scrollbar-thumb {
  background-color: #DFD6C2;
  border-radius: 10px;
}

.bf-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 640px) {
  .bf-product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}
@media (min-width: 1024px) {
  .bf-product-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
}
@media (min-width: 1400px) {
  .bf-product-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 22px;
  }
}
`;

const VIDEO_SLIDES = [
  {
    id: 1,
    badge: "100% Stone-Free Harvest",
    badgeColor: "#10B981",
    title: "Fresh Nigerian Produce",
    subtitle: "Stone-free grains, premium tubers & unadulterated oils direct to your kitchen.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166618/A_vibrant_top_down_flat_lay_vi_xuitwq.mp4",
  },
  {
    id: 2,
    badge: "Direct Farm Harvest",
    badgeColor: "#F59E0B",
    title: "Sun-Drenched Farm Fields",
    subtitle: "Authentic harvests directly from partner farms across Nigeria.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166058/A_warm_sun_drenched_Nigerian_f7oi4i.mp4",
  },
  {
    id: 3,
    badge: "Certified Quality",
    badgeColor: "#06B6D4",
    title: "Organic & Fresh Sorting",
    subtitle: "Carefully sorted and packaged to preserve nutritional integrity and freshness.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166480/A_slow_looping_cinematic_shot_i0swkm.mp4",
  },
  {
    id: 4,
    badge: "Chef Bems Culinary AI",
    badgeColor: "#8B5CF6",
    title: "Cook Smarter With AI",
    subtitle: "Get recipe inspirations, portion calculations, and cooking tips with Chef Bems AI.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1784539329/Give_me_a_video_of_the_charact_supd0d.mp4",
  },
  {
    id: 5,
    badge: "Flavour & Tradition",
    badgeColor: "#E11D48",
    title: "Delicious Nigerian Dishes",
    subtitle: "Experience the authentic aromas of home-cooked jollof, soups, and native delicacies.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1785505349/Create_a_Video_of_the_characte_xfqkn8.mp4",
  },
];

function ShopVideoSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % VIDEO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const activeSlide = VIDEO_SLIDES[current];

  return (
    <div className="relative w-full aspect-video sm:aspect-[16/10] md:aspect-[4/3] lg:aspect-[16/10] max-w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/25 shadow-2xl bg-black/50 backdrop-blur-md select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            key={activeSlide.src}
            className="w-full h-full object-cover"
            src={activeSlide.src}
          />
        </motion.div>
      </AnimatePresence>

      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/35 pointer-events-none" />

      {/* Floating Video Badge */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 border border-white/20 text-[10px] sm:text-xs font-bold text-white shadow-lg pointer-events-none">
        <span
          className="h-1.5 w-1.5 rounded-full animate-ping"
          style={{ backgroundColor: activeSlide.badgeColor }}
        />
        <span>{activeSlide.badge}</span>
      </div>

      {/* Bottom Dynamic Caption */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 right-3 sm:right-4 z-10 text-white pointer-events-none">
        <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 drop-shadow-sm">
          {activeSlide.title}
        </p>
        <p className="text-[10px] sm:text-[11px] text-white/90 line-clamp-1 drop-shadow-xs font-medium">
          {activeSlide.subtitle}
        </p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { cart, addToCart, updateQuantity } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(params.get("search") || "");
  const [activeCat, setActiveCat] = useState(params.get("category") || "All");
  const [sort, setSort] = useState("featured");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [restockProduct, setRestockProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "{}");
    } catch {
      return {};
    }
  });

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.get("/products"), api.get("/categories")])
      .then(([p, c]) => {
        setProducts(p.data?.products || []);
        setCategories(c.data?.categories || []);
      })
      .catch((err) => {
        console.error("Failed to load products:", err);
        setError(err.response?.data?.message || "Failed to load products. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSearch(params.get("search") || "");
    setActiveCat(params.get("category") || "All");
  }, [params]);

  const toggleFavorite = (productId, e) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [productId]: !prev[productId] };
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAdd = (product, e) => {
    e?.stopPropagation();
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    if (stock === 0) {
      recordOutOfStockDemand(product, "shop_page_add_button", user);
      setRestockProduct(product);
      setToast({
        message: `${product.name} is presently out of stock. Join the waitlist for instant restock notice!`,
        type: "error",
      });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    addToCart(product);
    setToast({
      message: `Added ${product.name} to basket`,
      type: "success",
    });
    setTimeout(() => setToast(null), 2500);
  };

  const handleProductCardClick = (product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    if (stock === 0) {
      recordOutOfStockDemand(product, "shop_page_card_click", user);
      setRestockProduct(product);
      setToast({
        message: `${product.name} is presently out of stock. Join the waitlist for instant restock notice!`,
        type: "error",
      });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    navigate(`/product/${product.id}`);
  };

  const handleCategoryChange = (catName) => {
    setActiveCat(catName);
    const newParams = new URLSearchParams(params);
    if (catName === "All") {
      newParams.delete("category");
    } else {
      newParams.set("category", catName);
    }
    setParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const newParams = new URLSearchParams(params);
    if (search.trim()) {
      newParams.set("search", search.trim());
    } else {
      newParams.delete("search");
    }
    setParams(newParams);
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveCat("All");
    setParams({});
  };

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        const matchCat =
          activeCat === "All" ||
          p.category_name?.toLowerCase() === activeCat?.toLowerCase() ||
          p.category_name?.toLowerCase().includes(activeCat?.toLowerCase()) ||
          activeCat?.toLowerCase().includes(p.category_name?.toLowerCase());

        const query = search.toLowerCase().trim();
        const matchSearch =
          !query ||
          p.name?.toLowerCase().includes(query) ||
          p.category_name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query);

        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "name") return a.name.localeCompare(b.name);
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [products, activeCat, search, sort]);

  const cats = useMemo(() => ["All", ...categories.map((c) => c.name)], [categories]);

  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    products.forEach((p) => {
      const cat = p.category_name;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  return (
    <PageWrapper>
      <div className="bf-shop-page">
        <style>{SHOP_CSS}</style>

        {/* ── 1. LUXURY STOREFRONT SHOP HEADER BANNER WITH VIDEO ── */}
        <section className="px-3 pt-4 sm:pt-6 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div
              style={{
                background: "linear-gradient(135deg, #051a11 0%, #0d3322 35%, #144931 70%, #082418 100%)",
              }}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 lg:p-10 text-white shadow-xl border border-emerald-800/30 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-6 lg:gap-8 items-center"
            >
              {/* Subtle Atmospheric Light Orbs */}
              <div
                className="absolute -right-16 -top-16 h-72 w-72 rounded-full pointer-events-none opacity-30"
                style={{
                  background: "radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)",
                  filter: "blur(50px)",
                }}
              />
              <div
                className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full pointer-events-none opacity-25"
                style={{
                  background: "radial-gradient(circle, rgba(52,211,153,0.45) 0%, transparent 70%)",
                  filter: "blur(45px)",
                }}
              />

              {/* Left Column: Editorial Store Header & Search Form */}
              <div className="relative z-10 md:col-span-7 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 border border-white/15 backdrop-blur-md shadow-xs w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  <span>Farm-To-Door Catalogue</span>
                </div>

                <h1 className="mt-2.5 sm:mt-3 font-display text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl font-black leading-tight text-white drop-shadow-sm">
                  Fresh Produce &amp; Pantry Essentials
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 font-normal leading-relaxed max-w-xl">
                  Explore 100% stone-free grains, authentic cold-pressed oils, farm tubers, and Nigerian staples delivered directly to your doorstep.
                </p>

                {/* Trust Highlight Chips */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-emerald-200/90">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 border border-white/10 backdrop-blur-xs">
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Stone-Free Guarantee
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 border border-white/10 backdrop-blur-xs">
                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75c0-.621-.504-1.125-1.125-1.125h-9.75C2.504 2.625 2 3.129 2 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
                    </svg>
                    Free Delivery over ₦15,000
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 border border-white/10 backdrop-blur-xs">
                    <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Same-Day Dispatch Available
                  </span>
                </div>

                {/* Search & Quick Filter Tags */}
                <div className="mt-4 sm:mt-5 w-full max-w-xl">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative flex items-center w-full shadow-lg rounded-2xl overflow-hidden bg-white/10 border border-white/20 backdrop-blur-xl p-1 sm:p-1.5"
                  >
                    <div className="pl-3 pr-2 text-emerald-200/70 flex items-center">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search rice, yam, palm oil, beans..."
                      className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-white/60 outline-none pr-2"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          const newParams = new URLSearchParams(params);
                          newParams.delete("search");
                          setParams(newParams);
                        }}
                        className="px-2 text-white/60 hover:text-white text-sm font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0f3322] px-4 sm:px-5 py-2 text-xs sm:text-sm font-black transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: High Quality Farm Multi-Video Slide Container */}
              <div className="relative z-10 md:col-span-5 w-full flex justify-center md:justify-end">
                <ShopVideoSlider />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. CATEGORY FILTER TABS & CONTROL TOOLBAR ── */}
        <section className="px-3 pt-4 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-display text-sm sm:text-base font-black text-[#143c2d]">
                Filter by Produce Category
              </h2>
              {activeCat !== "All" && (
                <button
                  type="button"
                  onClick={() => handleCategoryChange("All")}
                  className="text-xs font-bold text-[#c85a17] hover:underline"
                >
                  Show All ({products.length})
                </button>
              )}
            </div>

            <div className="bf-categories-scroll">
              {cats.map((cat) => {
                const isActive = activeCat === cat;
                const count = categoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#143c2d] text-white shadow-md shadow-[#143c2d]/25 border border-[#143c2d]"
                        : "bg-white text-slate-700 hover:bg-[#FAF9F6] border border-[#DFD6C2] hover:border-[#143c2d]/40 shadow-xs"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#DFD6C2]/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {loading ? "Loading items…" : `${filtered.length} ${filtered.length === 1 ? "Product" : "Products"} Found`}
                </span>
                {(search || activeCat !== "All") && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
                  >
                    <span>Clear filters</span>
                    <span>×</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-xl border border-[#DFD6C2] bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#143c2d] shadow-xs cursor-pointer"
                >
                  <option value="featured">Featured Picks</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. PRODUCT CATALOGUE GRID ── */}
        <section className="px-3 pt-3 pb-16 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            {error && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
                >
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <div className="bf-product-grid">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-[#DFD6C2] bg-white p-3 shadow-xs animate-pulse"
                  >
                    <div className="aspect-[4/3] w-full rounded-xl bg-slate-200" />
                    <div className="mt-3 h-3 w-1/3 rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="h-4 w-1/3 rounded bg-slate-200" />
                      <div className="h-7 w-16 rounded-full bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[#DFD6C2] bg-white p-12 text-center shadow-sm max-w-lg mx-auto mt-6">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-800 mb-4">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">No produce found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  We couldn't find anything matching "{search}". Try searching another item or clear your active filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-5 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#1a4e3b] transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="bf-product-grid">
                {filtered.map((product) => {
                  const isFavorite = !!favorites[product.id];
                  const cartQty = cart[product.id]?.quantity || 0;
                  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
                  const price = Number(product.price || 0) * NAIRA_PER_UNIT;
                  const isOutOfStock = stock <= 0 || product.available_for_sale === false || product.status === "out_of_stock";
                  const isLowStock = stock > 0 && stock <= 5;
                  const isBemsOriginal = Boolean(
                    product.name?.toLowerCase().includes("bems") ||
                    product.brand?.toLowerCase().includes("bems") ||
                    product.is_bems_brand
                  );

                  return (
                    <article
                      key={product.id}
                      onClick={() => handleProductCardClick(product)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DFD6C2]/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#143c2d]/40 hover:shadow-xl cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF9F6]">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/hero_food_4.jpg";
                          }}
                        />
                        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1 pointer-events-none">
                          {isBemsOriginal ? (
                            <span className="rounded-full bg-[#143c2d]/95 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">
                              Original
                            </span>
                          ) : product.is_featured ? (
                            <span className="rounded-full bg-[#143c2d] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-md">
                              Featured
                            </span>
                          ) : (
                            <span />
                          )}
                          <div className="flex items-center gap-1 pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(product.id, e)}
                              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white/95 backdrop-blur shadow-xs transition hover:scale-110 ${
                                isFavorite ? "text-red-500" : "text-slate-400 hover:text-red-500"
                              }`}
                              aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
                            >
                              <svg
                                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                fill={isFavorite ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickViewProduct(product);
                          }}
                          className="absolute bottom-2.5 right-2.5 z-10 hidden md:flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-md transition-all duration-200 hover:bg-[#143c2d] hover:text-white"
                          aria-label={`Quick preview ${product.name}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Quick View</span>
                        </button>

                        {isLowStock && (
                          <div className="absolute bottom-2 left-2 pointer-events-none">
                            <span className="rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
                              Only {stock} left
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
                        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#143c2d]/80">
                          <span className="truncate">{product.category_name || "Produce"}</span>
                          <span className="text-slate-400 font-medium normal-case shrink-0">{product.unit || "Per item"}</span>
                        </div>

                        <h3 className="mt-1 min-h-[2.1rem] font-display text-xs sm:text-sm font-bold leading-snug text-slate-900 group-hover:text-[#c85a17] transition-colors line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <span>Verified Quality</span>
                          <span>•</span>
                          <span>Farm Fresh</span>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
                          <div className="min-w-0">
                            <p className="text-[8px] sm:text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Price</p>
                            <p className="font-display text-xs sm:text-sm md:text-base font-black text-slate-900 truncate">
                              ₦{price.toLocaleString("en-NG")}
                            </p>
                          </div>

                          {cartQty > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center rounded-full border border-[#143c2d] bg-[#143c2d]/5 p-0.5 shadow-xs"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.id, cartQty - 1);
                                }}
                                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition cursor-pointer"
                                aria-label={`Decrease ${product.name} quantity`}
                              >
                                -
                              </button>
                              <span className="w-4 sm:w-6 text-center text-xs font-black text-[#143c2d]">
                                {cartQty}
                              </span>
                              <button
                                type="button"
                                disabled={cartQty >= stock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.id, cartQty + 1);
                                }}
                                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition disabled:opacity-40 cursor-pointer"
                                aria-label={`Increase ${product.name} quantity`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleAdd(product, e)}
                              className="inline-flex h-7 sm:h-8 items-center justify-center rounded-full bg-[#143c2d] px-3 sm:px-3.5 text-[11px] sm:text-xs font-extrabold text-white shadow-xs transition-all duration-200 hover:bg-[#1a4e3b] hover:shadow-md active:scale-95 cursor-pointer"
                              aria-label={`Add ${product.name} to basket`}
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <QuickViewModal
          product={quickViewProduct}
          isOpen={Boolean(quickViewProduct)}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAdd}
        />

        <RestockModal
          product={restockProduct}
          isOpen={Boolean(restockProduct)}
          onClose={() => setRestockProduct(null)}
        />

        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </PageWrapper>
  );
}
