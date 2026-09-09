import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import { recordOutOfStockDemand } from "../utils/demandTracker";
import Toast from "../components/ui/Toast";
import QuickViewModal from "../components/ui/QuickViewModal";
import RestockModal from "../components/ui/RestockModal";

const CATEGORY_META = {
  "Vegetables": {},
  "Grains & Cereals": {},
  "Cooking Oils": {},
  "Legumes": {},
  "Tubers & Roots": {},
  "Spices & Seasonings": {},
  "Fruits": {},
  "Leafy Greens": {},
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
  onNotify,
}) {
  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
  const price = Number(product.price || 0) * NAIRA_PER_UNIT;
  const isOutOfStock = stock <= 0 || product.available_for_sale === false || product.status === "out_of_stock";
  const isLowStock = stock > 0 && stock <= 5;
  const rating = Math.min(5, Math.max(0, Number(product.avg_rating) || 0));

  const isBemsOriginal = Boolean(
    product.name?.toLowerCase().includes("bems") ||
    product.brand?.toLowerCase().includes("bems") ||
    product.is_bems_brand
  );

  return (
    <article
      onClick={() => onQuickView(product)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#143c2d]/25 cursor-pointer"
    >
      {/* Product Image Box */}
      <div className="relative aspect-square w-full bg-[#FAF9F6] overflow-hidden">
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

        {/* Top Badges Floating Header */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          {isBemsOriginal ? (
            <span className="rounded-full bg-[#143c2d]/95 backdrop-blur px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-md">
               Bems Original
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
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product.id, e);
              }}
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

        {isLowStock && (
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <span className="rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
              Only {stock} left
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

        <h3 className="mt-1 min-h-[2.1rem] font-display text-xs sm:text-sm font-bold leading-snug text-slate-900 group-hover:text-[#c85a17] transition-colors line-clamp-2">
          {product.name}
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
              ₦{price.toLocaleString("en-NG")}
            </p>
          </div>

          {cartQuantity > 0 ? (
            /* In-Card Quantity Stepper */
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center rounded-full border border-[#143c2d] bg-[#143c2d]/5 p-0.5 shadow-xs"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(product.id, cartQuantity - 1);
                }}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition cursor-pointer"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(product.id, cartQuantity + 1);
                }}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#143c2d] shadow-2xs hover:bg-[#143c2d] hover:text-white transition disabled:opacity-40 cursor-pointer"
                aria-label={`Increase ${product.name} quantity`}
              >
                +
              </button>
            </div>
          ) : (
            /* Default Add Button */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product);
              }}
              className={`inline-flex h-7 sm:h-8 items-center justify-center rounded-full px-3 sm:px-3.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 active:scale-95 ${
                isAdded
                  ? "bg-[#1d6b45] text-white shadow-md"
                  : "bg-[#143c2d] text-white shadow-xs hover:bg-[#1a4e3b] hover:shadow-md"
              } cursor-pointer`}
              aria-label={`Add ${product.name} to basket`}
            >
              {isAdded ? "Added" : "+ Add"}
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
  const [restockProduct, setRestockProduct] = useState(null);
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
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    if (stock === 0 || product.available_for_sale === false || product.status === "out_of_stock") {
      recordOutOfStockDemand(product, "home_page_add_button", user);
      setRestockProduct(product);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({
        message: `${product.name} is presently out of stock. Join the waitlist for instant notice!`,
        type: "error",
      });
      toastTimerRef.current = setTimeout(() => setToast(null), 3500);
      return;
    }

    const displayPrice = Number(product.price || 0) * NAIRA_PER_UNIT;
    if (!Number.isFinite(displayPrice) || displayPrice <= 0 || displayPrice > 1_000_000) return;

    addToCart(product);
    setAddedProducts((prev) => ({ ...prev, [product.id]: true }));

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      message: `Added ${product.name} to basket`,
      type: "success",
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);

    setTimeout(() => {
      setAddedProducts((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  const handleCardClick = (product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    if (stock === 0 || product.available_for_sale === false || product.status === "out_of_stock") {
      recordOutOfStockDemand(product, "home_page_card_click", user);
      setRestockProduct(product);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({
        message: `${product.name} is presently out of stock. Join the waitlist for instant notice!`,
        type: "error",
      });
      toastTimerRef.current = setTimeout(() => setToast(null), 3500);
      return;
    }
    setQuickViewProduct(product);
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

  // Dynamic Real Products Slideshow Groups (3 products per slide)
  const heroSlideGroups = useMemo(() => {
    if (!products || products.length === 0) {
      return [
        [
          {
            id: "rice-featured",
            name: "Stone-Free Parboiled Rice",
            category_name: "Grains & Cereals",
            unit: "1 kg bag",
            price: 3750,
            stock_quantity: 50,
            image_url: "/hero_food_1.jpg",
            is_bems_brand: true,
          },
          {
            id: "yam-featured",
            name: "Abuja Yam Tubers (Puna)",
            category_name: "Tubers & Roots",
            unit: "1 tuber",
            price: 3000,
            stock_quantity: 40,
            image_url: "/hero_food_4.jpg",
          },
          {
            id: "oil-featured",
            name: "Pure Cold-Pressed Palm Oil",
            category_name: "Cooking Oils",
            unit: "1 Litre bottle",
            price: 2500,
            stock_quantity: 35,
            image_url: "/hero_food_3.jpg",
          },
        ]
      ];
    }

    const available = products.filter((p) => Number(p.stock_quantity ?? p.stock ?? 0) > 0 || p.is_featured);
    const pool = available.length >= 3 ? available : products;

    const groups = [];
    for (let i = 0; i < pool.length; i += 3) {
      const chunk = pool.slice(i, i + 3);
      if (chunk.length === 3) {
        groups.push(chunk);
      } else if (chunk.length > 0 && groups.length > 0) {
        // Pad the remainder to make 3
        groups.push([...chunk, ...pool.slice(0, 3 - chunk.length)]);
      }
    }
    return groups.slice(0, 5); // Up to 5 slides (15 real products)
  }, [products]);

  const [heroSlide, setHeroSlide] = useState(0);
  const [heroHovered, setHeroHovered] = useState(false);

  // Auto-advance hero product slideshow every 3.5 seconds
  useEffect(() => {
    if (heroSlideGroups.length <= 1 || heroHovered) return;
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlideGroups.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [heroSlideGroups.length, heroHovered]);

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
        {/* ── 1. LUXURY STOREFRONT HERO BANNER ── */}
        <section className="px-3 pt-4 sm:pt-6 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div
              style={{
                background: "linear-gradient(135deg, #092016 0%, #0d2c20 30%, #133f2d 65%, #0a2419 100%)",
              }}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 lg:p-10 text-white shadow-2xl border border-emerald-800/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7"
            >
              {/* Organic Topographic & Botanical Background SVG Pattern */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none opacity-20"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                viewBox="0 0 1000 300"
              >
                <defs>
                  <linearGradient id="hero-pattern-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 C200,140 380,20 620,110 C860,200 950,40 1000,80 L1000,300 L0,300 Z"
                  fill="none"
                  stroke="url(#hero-pattern-grad)"
                  strokeWidth="1.5"
                />
                <path
                  d="M0,130 C240,210 420,70 660,170 C810,230 920,110 1000,150"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
                <path
                  d="M0,190 C290,270 510,130 760,220 C910,270 960,180 1000,210"
                  fill="none"
                  stroke="rgba(251,191,36,0.15)"
                  strokeWidth="1"
                />
                <circle cx="850" cy="140" r="140" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <circle cx="850" cy="140" r="90" fill="none" stroke="rgba(251,191,36,0.08)" strokeWidth="1" />
                <circle cx="150" cy="40" r="110" fill="none" stroke="rgba(52,211,153,0.06)" strokeWidth="1" />
              </svg>

              {/* Ambient Radiant Lighting Orbs */}
              <div
                className="absolute -right-12 -top-12 h-72 w-72 rounded-full pointer-events-none opacity-35"
                style={{
                  background: "radial-gradient(circle, rgba(245,158,11,0.65) 0%, transparent 70%)",
                  filter: "blur(50px)",
                }}
              />
              <div
                className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full pointer-events-none opacity-25"
                style={{
                  background: "radial-gradient(circle, rgba(52,211,153,0.55) 0%, transparent 70%)",
                  filter: "blur(45px)",
                }}
              />

              {/* Left Side: Editorial Typography & Actions */}
              <div className="relative z-10 max-w-xl">
                {/* Floating Farm Badge (No emoji) */}
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 border border-white/15 backdrop-blur-md shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  <span>Direct From Farm To Table</span>
                </div>

                {/* Main Headline */}
                <h1 className="mt-3 font-display text-xl sm:text-3xl lg:text-4xl font-black leading-tight text-white drop-shadow-sm">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                    {customerName}
                  </span>
                  !
                </h1>

                {/* Narrative Subtitle */}
                <p className="mt-2 text-xs sm:text-sm md:text-base text-emerald-100/90 leading-relaxed font-normal">
                  Shop 100% stone-free grains, authentic cold-pressed oils, and farm-fresh harvests delivered right to your doorstep.
                </p>

                {/* Navigation Action Buttons in Banner (No Emojis — Shop, Delivery, Chef Bems, My Orders) */}
                <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#143c2d] px-5 py-2.5 text-xs sm:text-sm font-black shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 active:scale-95 text-decoration-none"
                  >
                    <span>Shop</span>
                  </Link>

                  <Link
                    to="/track-order"
                    className="inline-flex items-center justify-center rounded-full bg-black/30 hover:bg-black/45 border border-white/20 hover:border-white/40 text-white px-5 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-md shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 text-decoration-none"
                  >
                    <span>Delivery</span>
                  </Link>

                  <Link
                    to="/chef-chat"
                    className="inline-flex items-center justify-center rounded-full bg-black/30 hover:bg-black/45 border border-amber-400/30 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 px-5 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-md shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 text-decoration-none"
                  >
                    <span>Chef Bems</span>
                  </Link>

                  <Link
                    to="/orders"
                    className="inline-flex items-center justify-center rounded-full bg-black/30 hover:bg-black/45 border border-white/20 hover:border-white/40 text-white px-5 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-md shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 text-decoration-none"
                  >
                    <span>My Orders</span>
                  </Link>
                </div>
              </div>

              {/* Right Side: Larger Dynamic Real Product Slideshow (In Groups of 3) */}
              <div
                onMouseEnter={() => setHeroHovered(true)}
                onMouseLeave={() => setHeroHovered(false)}
                className="relative z-10 flex flex-col items-center lg:items-end gap-3 shrink-0 w-full lg:w-auto"
              >
                {/* Product 3-Cards Row with Animated Slide Transition */}
                <div className="relative min-h-[200px] sm:min-h-[235px] lg:min-h-[260px] w-full flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroSlide}
                      initial={{ opacity: 0, x: 30, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, scale: 0.98 }}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:gap-4.5"
                    >
                      {(heroSlideGroups[heroSlide] || heroSlideGroups[0] || []).map((product) => {
                        const price = Number(product.price || 0) * NAIRA_PER_UNIT;
                        const isBemsOriginal = Boolean(
                          product.name?.toLowerCase().includes("bems") ||
                          product.brand?.toLowerCase().includes("bems") ||
                          product.is_bems_brand
                        );

                        return (
                          <div
                            key={product.id}
                            onClick={() => setQuickViewProduct(product)}
                            className="group relative flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl border border-white/25 bg-white/15 p-3 sm:p-4 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/25 hover:border-amber-300/70 cursor-pointer w-[105px] sm:w-[140px] lg:w-[160px] xl:w-[170px]"
                            title={`Click to view ${product.name}`}
                          >
                            <div className="h-16 w-16 sm:h-24 sm:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32 overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-md group-hover:rotate-1 transition-transform shrink-0">
                              <img
                                src={getProductImage(product)}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/hero_food_4.jpg";
                                }}
                              />
                            </div>
                            <span className="mt-2 text-[11px] sm:text-xs lg:text-sm font-black text-amber-300 group-hover:text-amber-200 line-clamp-1 text-center w-full">
                              {product.name}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-white/80 font-medium line-clamp-1 text-center w-full">
                              {isBemsOriginal ? "Bems Original" : product.category_name || "Fresh Harvest"}
                            </span>
                            <span className="mt-1.5 rounded-full bg-black/45 border border-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-black text-white shadow-xs">
                              ₦{price.toLocaleString("en-NG")}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. CATALOGUE PRODUCT SEARCH BAR (SLEEK & CLEAN) ── */}
        <section className="px-3 pt-3 pb-2 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full"
            >
              <div className="pointer-events-none absolute left-3.5 sm:left-4 flex items-center text-slate-400">
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh produce catalogue (e.g. Rice, Yam, Palm Oil, Pepper...)"
                className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl border border-[#DFD6C2] bg-white pl-10 sm:pl-12 pr-28 sm:pr-32 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#2E7D32] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-24 sm:right-28 flex items-center text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
                >
                  ×
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 sm:right-2 h-9 sm:h-10 px-4 sm:px-5 rounded-lg sm:rounded-xl bg-[#143c2d] hover:bg-[#1b4d3a] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>Search</span>
                <span className="hidden sm:inline">Shop</span>
                <span>→</span>
              </button>
            </form>
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
                    onQuickView={(p) => handleCardClick(p)}
                    isFavorite={Boolean(favorites[product.id])}
                    onToggleFavorite={toggleFavorite}
                    onNotify={setRestockProduct}
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
                    onQuickView={(p) => handleCardClick(p)}
                    isFavorite={Boolean(favorites[product.id])}
                    onToggleFavorite={toggleFavorite}
                    onNotify={setRestockProduct}
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
                  Complete Store Inventory
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
                <span></span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. CLEAN QUALITY & TRUST BAR ── */}
        <section className="border-t border-[#DFD6C2] bg-[#EFE8DC] px-3 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              <div className="flex items-start gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <div className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-800">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296a3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043a3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">100% Stone-Free</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Clean sorted grains.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <div className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-700">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">Farm Freshness</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Direct from Oyo & Benue.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <div className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-700">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display text-[11px] sm:text-sm font-bold text-[#143c2d]">Secure Payment</h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-600">Cards, Transfer & USSD.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs">
                <div className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-purple-50 text-purple-700">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.125 1.125 0 00-.987 1.106v7.635m12-6.676v6.676" />
                  </svg>
                </div>
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

        {/* Restock Notification Modal */}
        <RestockModal
          product={restockProduct}
          isOpen={Boolean(restockProduct)}
          onClose={() => setRestockProduct(null)}
        />

        {/* Floating Toast Feedback */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </PageWrapper>
  );
}
