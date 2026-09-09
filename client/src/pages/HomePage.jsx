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
            <span className="rounded-full bg-[#143c2d]/95 backdrop-blur px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">
              ★ Bems Original
            </span>
          ) : product.is_featured ? (
            <span className="rounded-full bg-[#143c2d] px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
              Featured
            </span>
          ) : <span />}

          <div className="flex items-center gap-1 pointer-events-auto">
            {/* Wishlist Heart Button */}
            <button
              type="button"
              onClick={(e) => onToggleFavorite(product.id, e)}
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/95 backdrop-blur shadow-xs transition hover:scale-110 ${
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
          className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-1 text-[10px] sm:text-[11px] font-bold text-slate-800 shadow-md transition-all duration-200 hover:bg-[#143c2d] hover:text-white"
          aria-label={`Quick preview ${product.name}`}
        >
          <span>👁️</span>
          <span className="hidden sm:inline">Quick View</span>
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
            <span className="rounded-full bg-white px-3 py-1 text-[10px] sm:text-[11px] font-bold text-slate-800 shadow-md">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#143c2d]/80">
          <span className="truncate">{product.category_name || "Farm Produce"}</span>
          <span className="text-slate-400 font-medium normal-case shrink-0">{product.unit || "Per item"}</span>
        </div>

        <h3 className="mt-1 min-h-[2.2rem] font-display text-xs sm:text-sm md:text-base font-bold leading-snug text-slate-900">
          <Link to={`/product/${product.id}`} className="transition hover:text-[#c85a17] line-clamp-2">
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs">
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
        <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5">
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Price</p>
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
              <span className="w-5 sm:w-6 text-center text-xs font-black text-[#143c2d]">
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
              className={`inline-flex h-7 sm:h-9 items-center justify-center rounded-full px-3 sm:px-4 text-[11px] sm:text-xs font-extrabold transition-all duration-200 active:scale-95 ${
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [addedProducts, setAddedProducts] = useState({});
  const [toast, setToast] = useState(null);
  const [trackingInput, setTrackingInput] = useState("");
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
      const [prodRes, ordersRes] = await Promise.all([
        api.get("/products", { params: { limit: 50 } }),
        api.get("/orders").catch(() => ({ data: { orders: [] } })),
      ]);
      setProducts(prodRes.data?.products || []);
      setOrders(ordersRes.data?.orders || []);
    } catch (err) {
      console.error("Error loading home hub:", err);
      setLoadError(err.response?.data?.message || "Failed to load dashboard. Please refresh.");
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

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const code = trackingInput.trim().replace(/^#/, "").toUpperCase();
    navigate(code ? `/track-order?code=${encodeURIComponent(code)}` : "/track-order");
  };

  const customerName = user?.first_name || user?.name || user?.email?.split("@")[0] || "Chef";
  const greeting = getTimeGreeting();

  // Active / Recent Orders
  const recentOrder = orders && orders.length > 0 ? orders[0] : null;

  // Filter out staples for quick reorder (Grains, Tubers, Oils, Staples)
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
        {/* ── 1. PERSONALIZED WELCOME & KPI SUMMARY ── */}
        <section className="border-b border-[#DFD6C2] bg-linear-to-b from-[#EDE5D5]/70 via-[#F8F5EE] to-[#F8F5EE] px-3 pt-6 pb-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFD6C2] bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#143c2d]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  Customer Hub
                </span>
                <h1 className="mt-2 font-display text-xl sm:text-2xl md:text-3xl font-black text-[#143c2d]">
                  {greeting}, <span className="text-[#c85a17]">{customerName}</span>!
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
                  Manage your farm pantry, reorder weekly staples, or track doorstep deliveries.
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="flex items-center gap-2 rounded-xl border border-[#DFD6C2] bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-[#143c2d]"
                >
                  <span>🛒</span>
                  <span>Basket:</span>
                  <span className="font-extrabold text-[#143c2d]">
                    {cartCount} ({cartCount === 1 ? "item" : "items"})
                  </span>
                </button>

                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 rounded-xl border border-[#DFD6C2] bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-[#143c2d]"
                >
                  <span>📦</span>
                  <span>My Orders</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ACTIVE DELIVERY TRACKER WIDGET ── */}
        <section className="px-3 pt-5 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            {recentOrder ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 sm:p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-xl text-emerald-800">
                    🚚
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-emerald-950">
                        Recent Order #{recentOrder.order_number || recentOrder.id}
                      </span>
                      <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold capitalize text-emerald-900">
                        {recentOrder.status || "Processing"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-emerald-900/80">
                      Total: ₦{(Number(recentOrder.total_amount || recentOrder.total || 0) * NAIRA_PER_UNIT).toLocaleString()} • {recentOrder.items_count || recentOrder.items?.length || 1} produce items
                    </p>
                  </div>
                </div>

                <Link
                  to={recentOrder.tracking_code ? `/track-order?code=${recentOrder.tracking_code}` : `/orders/${recentOrder.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#143c2d] px-5 py-2 text-xs font-extrabold text-white transition hover:bg-[#0e2c21]"
                >
                  <span>Track Status ➔</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#DFD6C2] bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🚚</span>
                  <div>
                    <h3 className="text-xs font-black text-[#143c2d]">Track an active delivery</h3>
                    <p className="text-[11px] text-slate-500">Enter your order code to see real-time dispatch progress</p>
                  </div>
                </div>

                <form onSubmit={handleTrackSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                    placeholder="Code, e.g. BF-12345"
                    className="w-full sm:w-48 rounded-full border border-slate-300 bg-[#FDFBF7] px-3.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:border-[#143c2d]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-[#143c2d] px-4 py-1.5 text-xs font-extrabold text-white hover:bg-[#0e2c21]"
                  >
                    Track
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* ── 3. WEEKLY PANTRY STAPLES (QUICK RE-ORDER) ── */}
        <section className="px-3 pt-6 pb-4 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base sm:text-xl font-bold text-[#143c2d]">
                  Weekly Household Staples
                </h2>
                <p className="text-xs text-slate-500">
                  Quick 1-tap reorder of Nigerian kitchen essentials
                </p>
              </div>
              <Link
                to="/products"
                className="text-xs font-bold text-[#c85a17] hover:underline"
              >
                View Full Shop →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-white border border-[#DFD6C2] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

        {/* ── 4. FEATURED HARVESTS & BEMS ORIGINALS ── */}
        <section className="px-3 pt-6 pb-12 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base sm:text-xl font-bold text-[#143c2d]">
                  Fresh Seasonal Harvests & Bems Originals
                </h2>
                <p className="text-xs text-slate-500">
                  100% stone-free grains and unadulterated oils direct from farm
                </p>
              </div>
              <Link
                to="/products?category=Grains%20%26%20Cereals"
                className="text-xs font-bold text-[#143c2d] hover:underline"
              >
                See all grains →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-56 rounded-2xl bg-white border border-[#DFD6C2] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 md:gap-5">
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

            {/* ── 5. PROMO BANNER TO FULL SHOP ── */}
            <div
              style={{
                background: "linear-gradient(135deg, #143c2d 0%, #1c523e 100%)",
              }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl p-6 sm:p-8 text-white shadow-md"
            >
              <div className="max-w-md text-center sm:text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  🛒 Complete Inventory
                </span>
                <h3 className="mt-1 font-display text-lg sm:text-xl font-bold text-white">
                  Looking for tubers, leafy greens, or bulk bags?
                </h3>
                <p className="mt-1 text-xs text-emerald-100/85 leading-relaxed">
                  Browse our full catalogue with comprehensive category filtering, price sorting, and live stock in the Shop.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-xs font-black uppercase tracking-wider text-[#143c2d] shadow-md transition hover:bg-white active:scale-98"
              >
                <span>Explore Full Shop Catalogue</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 6. CLEAN QUALITY & TRUST BAR ── */}
        <section className="border-t border-[#DFD6C2] bg-[#EFE8DC] px-3 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 shadow-2xs">
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-emerald-50 text-base sm:text-lg text-[#143c2d]">🌾</span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#143c2d]">100% Stone-Free</h4>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-600">Clean sorted grains.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 shadow-2xs">
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-amber-50 text-base sm:text-lg text-amber-700">🌱</span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#143c2d]">Farm Freshness</h4>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-600">Direct from Oyo & Benue.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 shadow-2xs">
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-blue-50 text-base sm:text-lg text-blue-700">🔒</span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#143c2d]">Monnify Secure</h4>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-600">Cards, Transfer & USSD.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 shadow-2xs">
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-purple-50 text-base sm:text-lg text-purple-700">🚚</span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#143c2d]">Doorstep Dispatch</h4>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-600">Fast doorstep delivery.</p>
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
