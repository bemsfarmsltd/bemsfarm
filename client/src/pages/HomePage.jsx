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

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
      {/* Image Container */}
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
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1 pointer-events-none">
          {isBemsOriginal ? (
            <span className="rounded-full bg-[#143c2d]/95 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">
              ★ Original
            </span>
          ) : product.is_featured ? (
            <span className="rounded-full bg-[#143c2d] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-md">
              Featured
            </span>
          ) : <span />}

          <div className="flex items-center gap-1 pointer-events-auto">
            {/* Wishlist Heart Button */}
            <button
              type="button"
              onClick={(e) => onToggleFavorite(product.id, e)}
              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white/95 backdrop-blur shadow-xs transition hover:scale-110 ${
                isFavorite ? "text-red-500" : "text-slate-400 hover:text-red-500"
              }`}
              aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
            >
              <span className="text-xs sm:text-sm">{isFavorite ? "❤️" : "🤍"}</span>
            </button>
          </div>
        </div>

        {/* Quick View Button on Desktop Hover Only (Hidden on Mobile) */}
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute bottom-2.5 right-2.5 z-10 hidden md:flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-md transition-all duration-200 hover:bg-[#143c2d] hover:text-white"
          aria-label={`Quick preview ${product.name}`}
        >
          <span>👁️</span>
          <span>Quick View</span>
        </button>

        {isLowStock && !isOutOfStock && (
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <span className="rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
              Only {stock} left
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-800 shadow-md">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#143c2d]/80">
          <span className="truncate">{product.category_name || "Produce"}</span>
          <span className="text-slate-400 font-medium normal-case shrink-0">{product.unit || "Per item"}</span>
        </div>

        <h3 className="mt-1 min-h-[2.1rem] font-display text-xs sm:text-sm font-bold leading-snug text-slate-900">
          <Link to={`/product/${product.id}`} className="transition hover:text-[#c85a17] line-clamp-2">
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className="mt-0.5 flex items-center gap-1 text-[10px]">
          {Number(product.review_count) > 0 ? (
            <>
              <span className="text-[#c85a17]" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
                {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
              </span>
              <span className="text-[10px] font-bold text-slate-400">({product.review_count})</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">Fresh Harvest</span>
          )}
        </div>

        {/* Price & Add / Stepper */}
        <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Price</p>
            <p className="font-display text-xs sm:text-sm md:text-base font-black text-slate-900 truncate">
              {invalidPrice ? "Unavailable" : `₦${price.toLocaleString("en-NG")}`}
            </p>
          </div>

          {cartQuantity > 0 ? (
            /* In-Card Quantity Stepper */
            <div className="flex items-center rounded-full border border-[#143c2d] bg-[#143c2d]/5 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => onUpdateQty(product.id, cartQuantity - 1)}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition"
                aria-label={`Decrease ${product.name} quantity`}
              >
                -
              </button>
              <span className="w-4 sm:w-6 text-center text-xs font-black text-[#143c2d]">
                {cartQuantity}
              </span>
              <button
                type="button"
                disabled={cartQuantity >= stock}
                onClick={() => onUpdateQty(product.id, cartQuantity + 1)}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition disabled:opacity-40"
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
              className={`inline-flex h-7 sm:h-8 items-center justify-center rounded-full px-3 sm:px-3.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 active:scale-95 ${
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
  const [quickViewProduct, setQuickViewProduct] = useState(null);
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
        api.get("/products", { params: { limit: 100 } }),
        api.get("/categories"),
      ]);
      setProducts(prodRes.data?.products || []);
      setCategories(catRes.data?.categories || []);
    } catch (err) {
      console.error("Error loading home hub:", err);
      setLoadError(err.response?.data?.message || "Failed to load produce. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
  const greeting = getTimeGreeting();

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/products");
    }
  };

  // Weekly Staples (Grains, Oils, Tubers, Peppers)
  const staples = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.category_name?.toLowerCase().includes("grain") ||
          p.category_name?.toLowerCase().includes("tuber") ||
          p.category_name?.toLowerCase().includes("oil") ||
          p.is_featured ||
          p.name?.toLowerCase().includes("rice") ||
          p.name?.toLowerCase().includes("yam")
      )
      .slice(0, 6);
  }, [products]);

  // Featured seasonal harvests
  const featuredHarvests = useMemo(() => {
    return products
      .filter((p) => p.is_featured || p.brand?.toLowerCase().includes("bems") || p.is_bems_brand)
      .slice(0, 8);
  }, [products]);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F5EE] text-slate-900 pb-20">
        {/* ── 1. COMPACT CLEAN STOREFRONT HEADER ── */}
        <section className="px-3 pt-4 sm:pt-6 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div
              style={{
                background: "linear-gradient(135deg, #143c2d 0%, #1c523e 60%, #153e2f 100%)",
              }}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 text-white shadow-md border border-[#143c2d]/20 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            >
              {/* Left Side: Greeting & Trust Badges */}
              <div className="relative z-10 max-w-lg">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-xs">
                  <span>🌾</span>
                  <span>Direct From Farm To Table</span>
                </div>
                <h1 className="mt-2 font-display text-lg sm:text-2xl md:text-3xl font-black leading-tight text-white">
                  {greeting}, <span className="text-amber-300">{customerName}</span>!
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                  Shop 100% stone-free grains, cold-pressed oils, and fresh harvests delivered straight to your doorstep.
                </p>

                {/* Quick Trust Badges */}
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-white">
                  <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5">
                    🚚 Doorstep Delivery
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-amber-300">
                    ✨ 100% Stone-Free
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5">
                    🔒 Secure Payment
                  </span>
                </div>
              </div>

              {/* Right Side: Visual Produce Showcase */}
              <div className="relative z-10 hidden md:flex items-center gap-3 lg:gap-4 shrink-0">
                {/* Produce Card 1: Rice */}
                <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                  <div className="h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-xl bg-white shadow-xs">
                    <img
                      src="/hero_food_1.jpg"
                      alt="Stone-Free Rice"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-extrabold text-amber-300">Stone-Free Rice</span>
                  <span className="text-[10px] text-white/80">★ Bems Original</span>
                </div>

                {/* Produce Card 2: Yam */}
                <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                  <div className="h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-xl bg-white shadow-xs">
                    <img
                      src="/hero_food_4.jpg"
                      alt="Abuja Yam Tubers"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-extrabold text-amber-300">Abuja Yam</span>
                  <span className="text-[10px] text-white/80">Fresh Harvest</span>
                </div>

                {/* Produce Card 3: Palm Oil */}
                <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                  <div className="h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-xl bg-white shadow-xs">
                    <img
                      src="/hero_food_3.jpg"
                      alt="Pure Palm Oil"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-extrabold text-amber-300">Pure Palm Oil</span>
                  <span className="text-[10px] text-white/80">Cold-Pressed</span>
                </div>
              </div>

              {/* Subtle Decorative Background Glow */}
              <div
                className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none hidden md:block"
                style={{
                  backgroundImage: "radial-gradient(circle at 80% 50%, rgba(245,158,11,0.5) 0%, transparent 60%)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ── 2. CATALOGUE PRODUCT SEARCH BAR ── */}
        <section className="px-3 pt-3 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#DFD6C2]/80">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3"
              >
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 sm:pl-4 text-slate-400 text-base sm:text-lg">
                    🔍
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search fresh produce catalogue (e.g. Stone-Free Rice, Abuja Yam, Palm Oil, Pepper...)"
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-[#FBF9F5] py-3 pl-11 pr-10 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#2E7D32] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-[#143c2d] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#1b4d3a] active:scale-98 transition-all shrink-0 cursor-pointer"
                >
                  <span>Search Shop</span>
                  <span>→</span>
                </button>
              </form>

              {/* Popular Search Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <span className="font-semibold text-slate-400">Popular:</span>
                {[
                  "Stone-Free Rice",
                  "Abuja Yam",
                  "Plantain",
                  "Pure Palm Oil",
                  "Honey Beans",
                  "Dried Pepper",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => navigate(`/products?search=${encodeURIComponent(tag)}`)}
                    className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-[#143c2d] hover:border-[#143c2d]/30 border border-transparent px-2.5 py-1 font-medium text-slate-600 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. WEEKLY PANTRY STAPLES (QUICK RE-ORDER) ── */}
        <section className="px-3 pt-5 pb-3 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-sm sm:text-lg font-black text-[#143c2d]">
                  Weekly Household Staples
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Quick 1-tap reorder of Nigerian kitchen essentials
                </p>
              </div>
              <Link
                to="/products"
                className="text-[11px] sm:text-xs font-bold text-[#c85a17] hover:underline"
              >
                View Full Shop →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-2xl bg-white border border-[#DFD6C2] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3.5">
                {staples.map((product) => (
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
            )}
          </div>
        </section>

        {/* ── 3. FEATURED HARVESTS & BEMS ORIGINALS ── */}
        <section className="px-3 pt-5 pb-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-sm sm:text-lg font-black text-[#143c2d]">
                  Fresh Seasonal Harvests
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  100% stone-free grains and unadulterated oils direct from farm
                </p>
              </div>
              <Link
                to="/products?category=Grains%20%26%20Cereals"
                className="text-[11px] sm:text-xs font-bold text-[#143c2d] hover:underline"
              >
                See all grains →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl bg-white border border-[#DFD6C2] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 md:gap-5">
                {featuredHarvests.map((product) => (
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
            )}

            {/* ── 4. LINK TO FULL SHOP CATALOGUE ── */}
            <div
              style={{
                background: "linear-gradient(135deg, #143c2d 0%, #1c523e 100%)",
              }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md"
            >
              <div className="max-w-md text-center sm:text-left">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  🛒 Complete Store Inventory
                </span>
                <h3 className="mt-0.5 font-display text-sm sm:text-lg font-bold text-white">
                  Looking for tubers, leafy greens, or bulk bags?
                </h3>
                <p className="mt-0.5 text-[11px] sm:text-xs text-emerald-100/85 leading-relaxed">
                  Browse our full catalogue with comprehensive category filtering and live stock in the Shop.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-amber-300 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#143c2d] shadow-md transition hover:bg-white active:scale-98"
              >
                <span>Explore Full Shop</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. CLEAN QUALITY & TRUST BAR ── */}
        <section className="border-t border-[#DFD6C2] bg-[#EFE8DC] px-3 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              <div className="flex items-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <span className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-emerald-50 text-sm sm:text-lg text-[#143c2d]">🌾</span>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">100% Stone-Free</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Clean sorted grains.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <span className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-amber-50 text-sm sm:text-lg text-amber-700">🌱</span>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">Farm Freshness</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Direct from Oyo & Benue.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <span className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-blue-50 text-sm sm:text-lg text-blue-700">🔒</span>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">Secure Payment</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Cards, Transfer & USSD.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <span className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-purple-50 text-sm sm:text-lg text-purple-700">🚚</span>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">Doorstep Dispatch</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Fast doorstep delivery.</p>
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
