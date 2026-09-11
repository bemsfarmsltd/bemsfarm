import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import api from "../services/api";
import { getNairaPrice } from "../utils/currency";
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

const REAL_STOCK_SLIDES = [
  {
    id: 1,
    title: "Fresh Harvest & Grocery Aisles",
    src: "/bems_store_aisles.jpg",
  },
  {
    id: 2,
    title: "Palm Oil & Vegetable Oil Bottling Lab",
    src: "/bems_oil_packaging_station.jpg",
  },
  {
    id: 3,
    title: "Bems Farms Supermarket Storefront",
    src: "/bems_store_checkout.jpg",
  },
  {
    id: 4,
    title: "Central Store & Dispatch Center",
    src: "/bems_farms_hub.jpg",
  },
];

function ShopVideoSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % REAL_STOCK_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  const activeSlide = REAL_STOCK_SLIDES[current];

  return (
    <div className="relative w-full aspect-video sm:aspect-[16/10] md:aspect-[4/3] lg:aspect-[16/10] max-w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/25 shadow-2xl bg-black/40 backdrop-blur-md select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={activeSlide.src}
            alt={activeSlide.title}
            key={activeSlide.src}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { cart, addToCart, updateQuantity } = useCart();
  const { toggleWishlist, isSaved } = useWishlist();

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

  const handleToggleFavorite = async (product, e) => {
    e?.stopPropagation();
    if (!user) {
      alert("Please log in to save items to your wishlist.");
      return;
    }
    await toggleWishlist(product);
  };

  const handleAdd = (product, e) => {
    e?.stopPropagation();
    const stock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));
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
    const stock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));
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

  const getProductCategory = (p) => {
    if (p.category_name && typeof p.category_name === "string" && p.category_name.trim()) {
      return p.category_name.trim();
    }
    if (typeof p.category === "string" && p.category.trim()) {
      return p.category.trim();
    }
    if (p.category?.name && typeof p.category.name === "string" && p.category.name.trim()) {
      return p.category.name.trim();
    }
    if (p.category_id && Array.isArray(categories) && categories.length > 0) {
      const found = categories.find((c) => String(c.id) === String(p.category_id));
      if (found?.name) return found.name.trim();
    }
    return "";
  };

  const normalizeCategory = (str) =>
    (str || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

  const isProductInCategory = (product, targetCat) => {
    if (!targetCat || targetCat === "All") return true;
    const prodCat = getProductCategory(product);
    if (!prodCat) return false;

    const normProd = normalizeCategory(prodCat);
    const normTarget = normalizeCategory(targetCat);
    if (!normProd || !normTarget) return false;

    if (normProd === normTarget) return true;

    if (product.category_id && Array.isArray(categories)) {
      const matchCatObj = categories.find((c) => normalizeCategory(c.name) === normTarget);
      if (matchCatObj && String(matchCatObj.id) === String(product.category_id)) {
        return true;
      }
    }

    return false;
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchCat = isProductInCategory(p, activeCat);

        const query = search.toLowerCase().trim();
        const prodCat = getProductCategory(p);
        const matchSearch =
          !query ||
          p.name?.toLowerCase().includes(query) ||
          prodCat?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query);

        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "name") return a.name.localeCompare(b.name);
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
  }, [products, activeCat, search, sort, categories]);

  const cats = useMemo(() => {
    const names = new Set();
    categories.forEach((c) => {
      if (c.name?.trim()) names.add(c.name.trim());
    });
    products.forEach((p) => {
      const catName = getProductCategory(p);
      if (catName) names.add(catName);
    });
    return ["All", ...Array.from(names)];
  }, [categories, products]);

  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    cats.forEach((cat) => {
      if (cat === "All") return;
      counts[cat] = products.filter((p) => isProductInCategory(p, cat)).length;
    });
    return counts;
  }, [products, cats, categories]);

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

              {/* Left Column: Editorial Store Header */}
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
                    Doorstep Delivery Available
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 border border-white/10 backdrop-blur-xs">
                    <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Same-Day Dispatch Available
                  </span>
                </div>
              </div>

              {/* Right Column: High Quality Farm Multi-Video Slide Container */}
              <div className="relative z-10 md:col-span-5 w-full flex justify-center md:justify-end">
                <ShopVideoSlider />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. CATEGORY FILTER TABS & SEARCH TOOLBAR (DIRECTLY ABOVE PRODUCTS) ── */}
        <section className="px-3 pt-4 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <h2 className="font-display text-sm sm:text-base font-black text-[#143c2d]">
                Filter by Produce Category
              </h2>
              {activeCat !== "All" && (
                <button
                  type="button"
                  onClick={() => handleCategoryChange("All")}
                  className="text-xs font-bold text-[#c85a17] hover:underline cursor-pointer"
                >
                  Show All ({products.length})
                </button>
              )}
            </div>

            {/* Category Pills */}
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

            {/* Prominent Search Bar & Sort Toolbar Directly Next to Product List */}
            <div className="mt-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-[#DFD6C2]/60 pb-3.5">
              {/* Live Search Bar */}
              <div className="relative flex-1 max-w-xl">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rice, yam, palm oil, beans, seasonings, brands…"
                    className="w-full rounded-full border border-[#DFD6C2] bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#143c2d] focus:ring-2 focus:ring-emerald-600/20 shadow-xs"
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
                      className="absolute right-3.5 grid h-5 w-5 place-items-center rounded-full bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </form>
              </div>

              {/* Status Count & Sort Controls */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">
                    {loading ? "Loading items…" : `${filteredProducts.length} ${filteredProducts.length === 1 ? "Product" : "Products"} Found`}
                  </span>
                  {(search || activeCat !== "All") && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                    >
                      <span>Reset</span>
                      <span>×</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort by:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-full border border-[#DFD6C2] bg-white px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#143c2d] shadow-xs cursor-pointer"
                  >
                    <option value="featured">Featured Picks</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Alphabetical (A-Z)</option>
                  </select>
                </div>
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
            ) : filteredProducts.length === 0 ? (
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
                {filteredProducts.map((product, index) => {
                  const isFavorite = isSaved(product.id);
                  const cartQty = cart[product.id]?.quantity || 0;
                  const stock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));
                  const price = getNairaPrice(product.price);
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
                            e.currentTarget.src = "/bems_store_aisles.jpg";
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
                              onClick={(e) => handleToggleFavorite(product, e)}
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
