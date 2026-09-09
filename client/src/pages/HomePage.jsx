import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import Toast from "../components/ui/Toast";
import QuickViewModal from "../components/ui/QuickViewModal";

const CATEGORY_META = {
  "Vegetables": { emoji: "🥬" },
  "Grains & Cereals": { emoji: "🌾" },
  "Cooking Oils": { emoji: "🫒" },
  "Legumes": { emoji: "🫘" },
  "Tubers & Roots": { emoji: "🍠" },
  "Spices & Seasonings": { emoji: "🌶️" },
  "Fruits": { emoji: "🍉" },
  "Leafy Greens": { emoji: "🥗" },
};

function ProductGridCard({
  product,
  onAdd,
  onUpdateQty,
  cartQuantity,
  isAdded,
  onQuickView,
  isFavorite,
  onToggleFavorite,
}) {
  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
  const price = Number(product.price || 0) * NAIRA_PER_UNIT;
  const invalidPrice = !Number.isFinite(price) || price <= 0 || price > 1_000_000;
  const isOutOfStock = stock <= 0 || product.available_for_sale === false || invalidPrice;
  const isLowStock = stock > 0 && stock <= 5;
  const rating = Math.min(5, Math.max(0, Number(product.avg_rating) || 0));

  const isBemsOriginal = Boolean(
    product.name?.toLowerCase().includes("bems") ||
    product.brand?.toLowerCase().includes("bems") ||
    product.is_bems_brand
  );

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DFD6C2]/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#143c2d]/40 hover:shadow-xl">
      {/* Image & Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF9F6]">
        <Link to={`/product/${product.id}`} className="block h-full w-full" aria-label={`View ${product.name}`}>
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
        </Link>

        {/* Top Badges */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1 pointer-events-none">
          {isBemsOriginal ? (
            <span className="rounded-full bg-[#143c2d]/95 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">
              ★ Bems Original
            </span>
          ) : product.is_featured ? (
            <span className="rounded-full bg-[#143c2d] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
              Featured
            </span>
          ) : <span />}

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Wishlist Toggle Button */}
            <button
              type="button"
              onClick={(e) => onToggleFavorite(product.id, e)}
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-xs transition hover:scale-110 ${
                isFavorite ? "text-red-500" : "text-slate-400 hover:text-red-500"
              }`}
              aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
            >
              {isFavorite ? "❤️" : "🤍"}
            </button>
          </div>
        </div>

        {/* Quick View Button on Image */}
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-md transition-all duration-200 hover:bg-[#143c2d] hover:text-white"
          aria-label={`Quick preview ${product.name}`}
        >
          <span>👁️</span>
          <span className="hidden sm:inline">Quick View</span>
        </button>

        {isLowStock && !isOutOfStock && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
            <span className="rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
              Only {stock} left
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-800 shadow-md">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#143c2d]/80">
          <span>{product.category_name || "Farm Produce"}</span>
          <span className="text-slate-400 font-medium normal-case">{product.unit || "Per item"}</span>
        </div>

        <h3 className="mt-1.5 min-h-[2.4rem] font-display text-sm sm:text-base font-bold leading-snug text-slate-900">
          <Link to={`/product/${product.id}`} className="transition hover:text-[#c85a17]">
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {Number(product.review_count) > 0 ? (
            <>
              <span className="text-[#c85a17]" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
                {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
              </span>
              <span className="text-[11px] font-bold text-slate-400">({product.review_count})</span>
            </>
          ) : (
            <span className="text-[11px] font-bold text-slate-400">Fresh Harvest</span>
          )}
        </div>

        {/* Price & Add / Stepper */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Price</p>
            <p className="font-display text-base font-bold text-slate-900 truncate">
              {invalidPrice ? "Unavailable" : `₦${price.toLocaleString("en-NG")}`}
            </p>
          </div>

          {cartQuantity > 0 ? (
            /* In-Card Quantity Stepper */
            <div className="flex items-center rounded-full border border-[#143c2d] bg-[#143c2d]/5 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => onUpdateQty(product.id, cartQuantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition"
                aria-label={`Decrease ${product.name} quantity`}
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-black text-[#143c2d]">
                {cartQuantity}
              </span>
              <button
                type="button"
                disabled={cartQuantity >= stock}
                onClick={() => onUpdateQty(product.id, cartQuantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition disabled:opacity-40"
                aria-label={`Increase ${product.name} quantity`}
              >
                +
              </button>
            </div>
          ) : (
            /* Default Add Button */
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={isOutOfStock}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-extrabold transition-all duration-200 active:scale-95 ${
                isAdded
                  ? "bg-[#1d6b45] text-white shadow-md"
                  : "bg-[#143c2d] text-white shadow-xs hover:bg-[#1a4e3b] hover:shadow-md"
              } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none`}
              aria-label={`Add ${product.name} to basket`}
            >
              {isAdded ? "✓ Added" : "+ Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cart,
    addToCart,
    updateQuantity,
    cartCount,
    cartSubtotal,
    openCartDrawer,
  } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [addedProducts, setAddedProducts] = useState({});
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const itemsPerPage = 12;
  const toastTimerRef = useRef(null);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "{}");
    } catch {
      return {};
    }
  });

  const toggleFavorite = (productId, e) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [productId]: !prev[productId] };
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products", { params: { limit: 200 } }),
        api.get("/categories"),
      ]);
      setProducts(prodRes.data?.products || []);
      setCategories(catRes.data?.categories || []);
    } catch (err) {
      console.error("Error loading home catalogue:", err);
      setLoadError(err.response?.data?.message || "Failed to load catalogue. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  const handleAdd = (product) => {
    const displayPrice = Number(product.price || 0) * NAIRA_PER_UNIT;
    if (!Number.isFinite(displayPrice) || displayPrice <= 0 || displayPrice > 1_000_000) return;

    addToCart(product);
    setAddedProducts((prev) => ({ ...prev, [product.id]: true }));

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      message: `✓ Added ${product.name} to basket!`,
      type: "success",
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);

    setTimeout(() => {
      setAddedProducts((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  const customerName = user?.first_name || user?.name || user?.email?.split("@")[0] || "there";

  // Available categories list
  const categoryTabs = useMemo(() => {
    const list = [{ id: "all", name: "All Produce", emoji: "🛒" }];
    list.push({ id: "bems_originals", name: "★ Bems Originals", emoji: "🌾" });

    categories.forEach((cat) => {
      const meta = CATEGORY_META[cat.name] || { emoji: "🌱" };
      list.push({ id: cat.name, name: cat.name, emoji: meta.emoji });
    });

    list.push({ id: "favorites", name: "My Wishlist", emoji: "❤️" });
    list.push({ id: "featured", name: "Featured", emoji: "✨" });
    return list;
  }, [categories]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category Filter
    if (activeTab === "bems_originals") {
      result = result.filter(
        (p) => p.name?.toLowerCase().includes("bems") || p.brand?.toLowerCase().includes("bems") || p.is_bems_brand
      );
    } else if (activeTab === "favorites") {
      result = result.filter((p) => Boolean(favorites[p.id]));
    } else if (activeTab === "featured") {
      result = result.filter((p) => p.is_featured);
    } else if (activeTab !== "all") {
      result = result.filter(
        (p) =>
          p.category_name?.toLowerCase() === activeTab.toLowerCase() ||
          p.category_name?.toLowerCase().includes(activeTab.toLowerCase())
      );
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "price-low") {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortBy === "price-high") {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortBy === "rating") {
        return Number(b.avg_rating || 0) - Number(a.avg_rating || 0);
      }
      if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    });

    return result;
  }, [products, activeTab, searchQuery, sortBy, favorites]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F5EE] text-slate-900 pb-20">
        {/* ── CLEAN STOREFRONT PROMO BANNER ── */}
        <section className="px-4 pt-6 pb-2 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#143c2d] to-[#1e5843] p-6 sm:p-8 md:p-10 text-white shadow-md">
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-xs">
                  🌾 Direct From Our Farms
                </span>
                <h1 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-black leading-tight">
                  Fresh Farm Groceries & 100% Stone-Free Staples
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-md">
                  Welcome back, <strong className="text-white">{customerName}</strong>! Order unadulterated cooking oils, sorted grains, and fresh harvests delivered straight to your home.
                </p>

                {/* Quick Delivery Guarantee Chips */}
                <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-emerald-100">
                  <span className="flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1">
                    🚚 Doorstep Delivery
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1">
                    ✨ 100% Stone-Free
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1">
                    🔒 Secure Payment
                  </span>
                </div>
              </div>

              {/* Decorative Background Element */}
              <div
                className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none hidden md:block"
                style={{
                  backgroundImage: "radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, transparent 70%)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ── MAIN MARKETPLACE STOREFRONT ── */}
        <section className="px-4 pt-6 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {/* Header, Search & Sort Bar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#DFD6C2] pb-5">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#143c2d]">
                  Shop Produce
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"} available for delivery
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative min-w-[240px] sm:w-72">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true">🔍</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rice, garri, oils…"
                    className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs outline-none focus:border-[#143c2d] focus:ring-1 focus:ring-[#143c2d]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#143c2d]"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categoryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all ${
                      isActive
                        ? tab.id === "bems_originals"
                          ? "bg-[#143c2d] text-amber-300 ring-2 ring-amber-400/40 shadow-sm"
                          : "bg-[#143c2d] text-white shadow-sm"
                        : "border border-[#DFD6C2] bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Product Grid State */}
            {loadError && (
              <div role="alert" className="mt-8 flex flex-col items-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="font-display text-lg font-bold text-red-900">{loadError}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="mt-4 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-extrabold text-white"
                >
                  Try loading again
                </button>
              </div>
            )}

            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 sm:gap-5">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-[#DFD6C2] bg-white shadow-xs">
                    <div className="aspect-[4/3] animate-pulse bg-[#EDE5D5]" />
                    <div className="space-y-2.5 p-4">
                      <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#DFD6C2]" />
                      <div className="h-4 w-4/5 animate-pulse rounded-md bg-[#DFD6C2]" />
                      <div className="h-3 w-1/2 animate-pulse rounded-md bg-[#DFD6C2]/60" />
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-4 w-14 animate-pulse rounded-md bg-[#DFD6C2]" />
                        <div className="h-7 w-14 animate-pulse rounded-full bg-[#143c2d]/20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <p className="text-3xl">🌾</p>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-800">No produce matched your selection</h3>
                <p className="mt-1 text-xs text-slate-500">Try adjusting your search query or selecting another category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                  }}
                  className="mt-5 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-extrabold text-white"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 sm:gap-5">
                  {paginatedProducts.map((product) => (
                    <ProductGridCard
                      key={product.id}
                      product={product}
                      onAdd={handleAdd}
                      onUpdateQty={updateQuantity}
                      cartQuantity={cart[product.id]?.quantity || 0}
                      isAdded={Boolean(addedProducts[product.id])}
                      onQuickView={(p) => setQuickViewProduct(p)}
                      isFavorite={Boolean(favorites[product.id])}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#DFD6C2] pt-6 sm:flex-row">
                    <p className="text-xs font-bold text-slate-500">
                      Showing <span className="font-extrabold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-extrabold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of <span className="font-extrabold text-slate-900">{filteredProducts.length}</span> products
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-extrabold text-slate-700 transition hover:border-[#143c2d] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ‹ Prev
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 w-8 rounded-full text-xs font-extrabold transition ${
                              currentPage === pageNum
                                ? "bg-[#143c2d] text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-extrabold text-slate-700 transition hover:border-[#143c2d] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── CLEAN QUALITY & TRUST BAR ── */}
        <section className="border-t border-[#DFD6C2] bg-[#EFE8DC] px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-[#143c2d]">🌾</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[#143c2d]">100% Stone-Free</h4>
                  <p className="mt-0.5 text-[11px] text-slate-600">Sorted grains and rice for clean cooking.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg text-amber-700">🌱</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[#143c2d]">Farm Freshness</h4>
                  <p className="mt-0.5 text-[11px] text-slate-600">Fresh harvests from Oyo & Benue fields.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg text-blue-700">🔒</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[#143c2d]">Monnify Secure</h4>
                  <p className="mt-0.5 text-[11px] text-slate-600">Fast cards, transfer & USSD payments.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-lg text-purple-700">🚚</span>
                <div>
                  <h4 className="font-display text-xs font-bold text-[#143c2d]">Doorstep Dispatch</h4>
                  <p className="mt-0.5 text-[11px] text-slate-600">Carefully packed food goods delivered to you.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick View Modal */}
        <QuickViewModal
          product={quickViewProduct}
          isOpen={Boolean(quickViewProduct)}
          onClose={() => setQuickViewProduct(null)}
        />

        {/* Floating Toast Feedback */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </PageWrapper>
  );
}
