import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import Toast from "../components/ui/Toast";
import QuickViewModal from "../components/ui/QuickViewModal";

const FREE_DELIVERY_THRESHOLD = 15000;

const CATEGORY_META = {
  "Vegetables": { emoji: "🥬", bg: "#E8F5E9", color: "#2E7D32" },
  "Grains & Cereals": { emoji: "🌾", bg: "#FFF8E1", color: "#F57F17" },
  "Cooking Oils": { emoji: "🫒", bg: "#FFF3E0", color: "#E65100" },
  "Legumes": { emoji: "🫘", bg: "#F3E5F5", color: "#7B1FA2" },
  "Tubers & Roots": { emoji: "🍠", bg: "#EFEBE9", color: "#5D4037" },
  "Spices & Seasonings": { emoji: "🌶️", bg: "#FFEBEE", color: "#C62828" },
  "Fruits": { emoji: "🍉", bg: "#FCE4EC", color: "#AD1457" },
  "Leafy Greens": { emoji: "🥗", bg: "#E8F5E9", color: "#1B5E20" },
};

const CHEF_PROMPTS = [
  { icon: "🍲", text: "What can I cook with garri, tomatoes & eggs?" },
  { icon: "🌾", text: "Authentic Nigerian Party Jollof recipe & ingredients" },
  { icon: "🥗", text: "Healthy weekly Nigerian family meal plan" },
  { icon: "🌶️", text: "Best seasoning substitutes for traditional soups" },
];

// Curated 1-Click Recipe Ingredient Bundles
const RECIPE_BUNDLES = [
  {
    id: "bundle-jollof",
    title: "Party Jollof Feast Kit",
    emoji: "🍲",
    badge: "Most Popular",
    prepTime: "45 mins",
    servings: "6-8 servings",
    tagline: "100% stone-free parboiled rice, fresh plum tomatoes, aromatics and pure vegetable oil.",
    totalPrice: 14500,
    itemsCount: 4,
    ingredients: [
      { name: "Bems Stone-Free Rice", qty: "5kg Bag", price: 7800 },
      { name: "Fresh Plum Tomatoes & Tatase", qty: "2kg Basket", price: 3500 },
      { name: "Pure Vegetable Oil", qty: "1 Litre", price: 2200 },
      { name: "Bems Chef Spice Blend", qty: "1 Pack", price: 1000 },
    ],
    itemsToAdd: [
      { id: "bundle-item-rice-1", name: "Bems Stone-Free Parboiled Rice (5kg)", category_name: "Grains & Cereals", unit: "5kg Bag", price: 7800 / NAIRA_PER_UNIT, image_url: "/hero_food_1.jpg", stock_quantity: 50 },
      { id: "bundle-item-tomatoes-1", name: "Fresh Plum Tomatoes & Tatase Basket", category_name: "Vegetables", unit: "2kg Basket", price: 3500 / NAIRA_PER_UNIT, image_url: "/hero_food_4.jpg", stock_quantity: 40 },
      { id: "bundle-item-oil-1", name: "Bems Pure Vegetable Cooking Oil", category_name: "Cooking Oils", unit: "1 Litre", price: 2200 / NAIRA_PER_UNIT, image_url: "/hero_food_3.jpg", stock_quantity: 30 },
      { id: "bundle-item-spice-1", name: "Bems Chef Jollof Seasoning Blend", category_name: "Spices & Seasonings", unit: "1 Pack", price: 1000 / NAIRA_PER_UNIT, image_url: "/hero_food_2.jpg", stock_quantity: 60 },
    ],
  },
  {
    id: "bundle-egusi",
    title: "Traditional Egusi Soup Kit",
    emoji: "🥣",
    badge: "Chef's Choice",
    prepTime: "50 mins",
    servings: "5-7 servings",
    tagline: "Hand-selected stone-free melon seeds, fresh leafy greens, and rich unadulterated palm oil.",
    totalPrice: 12800,
    itemsCount: 4,
    ingredients: [
      { name: "Hand-Sorted Egusi (Melon)", qty: "1 Paint Bucket", price: 6200 },
      { name: "Fresh Ugu & Bitterleaf", qty: "2 Fresh Bundles", price: 1800 },
      { name: "Bems Pure Red Palm Oil", qty: "1 Litre Bottle", price: 3200 },
      { name: "Ground Crayfish & Seasoning", qty: "200g Pack", price: 1600 },
    ],
    itemsToAdd: [
      { id: "bundle-item-egusi-1", name: "Bems Hand-Sorted Egusi (Melon Seeds)", category_name: "Legumes", unit: "1 Paint Bucket", price: 6200 / NAIRA_PER_UNIT, image_url: "/hero_food_1.jpg", stock_quantity: 45 },
      { id: "bundle-item-greens-1", name: "Fresh Harvest Ugu & Bitterleaf", category_name: "Leafy Greens", unit: "2 Bundles", price: 1800 / NAIRA_PER_UNIT, image_url: "/hero_food_4.jpg", stock_quantity: 30 },
      { id: "bundle-item-palmoil-1", name: "Bems Pure Red Palm Oil (Unadulterated)", category_name: "Cooking Oils", unit: "1 Litre", price: 3200 / NAIRA_PER_UNIT, image_url: "/hero_food_3.jpg", stock_quantity: 35 },
      { id: "bundle-item-crayfish-1", name: "Pure Ground Crayfish & Seasoning", category_name: "Spices & Seasonings", unit: "200g", price: 1600 / NAIRA_PER_UNIT, image_url: "/hero_food_2.jpg", stock_quantity: 50 },
    ],
  },
  {
    id: "bundle-asaro",
    title: "Fluffy Yam Porridge (Asaro) Kit",
    emoji: "🍠",
    badge: "Comfort Food",
    prepTime: "40 mins",
    servings: "4-6 servings",
    tagline: "Sweet Abuja yam tubers, unadulterated red palm oil, fresh habanero peppers and seasoning.",
    totalPrice: 11200,
    itemsCount: 4,
    ingredients: [
      { name: "Fresh Abuja Yam Tubers", qty: "2 Medium Tubers", price: 5800 },
      { name: "Bems Pure Red Palm Oil", qty: "750ml Bottle", price: 2500 },
      { name: "Fresh Ata Rodo & Onions", qty: "500g Basket", price: 1500 },
      { name: "Smoked Fish Seasoning", qty: "1 Pack", price: 1400 },
    ],
    itemsToAdd: [
      { id: "bundle-item-yam-1", name: "Fresh Abuja White Yam Tubers (2 Medium)", category_name: "Tubers & Roots", unit: "2 Tubers", price: 5800 / NAIRA_PER_UNIT, image_url: "/hero_food_1.jpg", stock_quantity: 40 },
      { id: "bundle-item-oil-asaro-1", name: "Bems Pure Red Palm Oil (750ml)", category_name: "Cooking Oils", unit: "750ml", price: 2500 / NAIRA_PER_UNIT, image_url: "/hero_food_3.jpg", stock_quantity: 35 },
      { id: "bundle-item-peppers-1", name: "Fresh Ata Rodo & Red Onions", category_name: "Vegetables", unit: "500g", price: 1500 / NAIRA_PER_UNIT, image_url: "/hero_food_4.jpg", stock_quantity: 50 },
      { id: "bundle-item-fishspice-1", name: "Smoked Fish Seasoning Base", category_name: "Spices & Seasonings", unit: "1 Pack", price: 1400 / NAIRA_PER_UNIT, image_url: "/hero_food_2.jpg", stock_quantity: 45 },
    ],
  },
  {
    id: "bundle-peppersoup",
    title: "Sunday Pepper Soup Kit",
    emoji: "🌶️",
    badge: "Warming & Spicy",
    prepTime: "30 mins",
    servings: "4-5 servings",
    tagline: "Fresh aromatic scent leaf (Efirin), traditional roasted pepper soup spice mix, ginger and garlic.",
    totalPrice: 6500,
    itemsCount: 4,
    ingredients: [
      { name: "Fresh Scent Leaf (Efirin)", qty: "2 Fresh Bunches", price: 1200 },
      { name: "Roasted Pepper Soup Blend", qty: "150g Pouch", price: 2200 },
      { name: "Fresh Ginger & Garlic Roots", qty: "400g Pack", price: 1600 },
      { name: "Dry Habanero Pepper Flakes", qty: "100g Pouch", price: 1500 },
    ],
    itemsToAdd: [
      { id: "bundle-item-scentleaf-1", name: "Fresh Scent Leaf / Efirin (2 Bunches)", category_name: "Leafy Greens", unit: "2 Bunches", price: 1200 / NAIRA_PER_UNIT, image_url: "/hero_food_4.jpg", stock_quantity: 30 },
      { id: "bundle-item-psoup-1", name: "Bems Roasted Pepper Soup Spice Blend", category_name: "Spices & Seasonings", unit: "150g", price: 2200 / NAIRA_PER_UNIT, image_url: "/hero_food_2.jpg", stock_quantity: 60 },
      { id: "bundle-item-ginger-1", name: "Fresh Ginger & Garlic Roots", category_name: "Vegetables", unit: "400g", price: 1600 / NAIRA_PER_UNIT, image_url: "/hero_food_1.jpg", stock_quantity: 40 },
      { id: "bundle-item-chili-1", name: "Dry Habanero Pepper Flakes", category_name: "Spices & Seasonings", unit: "100g", price: 1500 / NAIRA_PER_UNIT, image_url: "/hero_food_3.jpg", stock_quantity: 50 },
    ],
  },
];

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

        {/* Quick View Button on Image hover */}
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
    addMultipleToCart,
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
  const [trackingCode, setTrackingCode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [expandedBundle, setExpandedBundle] = useState("bundle-jollof");
  const itemsPerPage = 8;
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
      console.error("Error loading home dashboard:", err);
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

  const handleAddBundle = (bundle) => {
    addMultipleToCart(bundle.itemsToAdd);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      message: `🎉 Added complete ${bundle.title} to your basket!`,
      type: "success",
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
    openCartDrawer();
  };

  const handleTrackingSubmit = (e) => {
    e.preventDefault();
    const code = trackingCode.trim().replace(/^#/, "").toUpperCase();
    navigate(code ? `/track-order?code=${encodeURIComponent(code)}` : "/track-order");
  };

  const handlePromptClick = (promptText) => {
    navigate("/chef-chat", { state: { initialPrompt: promptText } });
  };

  // Customer identity
  const customerName = user?.first_name || user?.name || user?.email?.split("@")[0] || "Chef";
  const greeting = getTimeGreeting();

  // Delivery progress
  const freeDeliveryProgress = Math.min(100, Math.round((cartSubtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - cartSubtotal);

  // Available categories list
  const categoryTabs = useMemo(() => {
    const list = [{ id: "all", name: "All Products", emoji: "🛒" }];
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
        {/* ── CUSTOMER HERO & WELCOME HUB ── */}
        <section className="relative overflow-hidden border-b border-[#DFD6C2] bg-gradient-to-b from-[#EDE5D5]/80 via-[#F8F5EE] to-[#F8F5EE] px-5 pt-8 pb-12 sm:px-8 lg:px-12 lg:pt-10">
          <div className="mx-auto max-w-7xl">
            {/* Top row: Greeting & Quick KPI Bar */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#DFD6C2] bg-white px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#143c2d] shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  Farm-to-Doorstep Marketplace
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#143c2d] sm:text-4xl lg:text-5xl">
                  {greeting}, <span className="text-[#c85a17]">{customerName}</span>!
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
                  What are you cooking today? Explore fresh farm harvests, stone-free staples, or 1-click recipe bundles.
                </p>
              </div>

              {/* Live Basket & Order Status Chips */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="flex items-center gap-3 rounded-2xl border border-[#DFD6C2] bg-white p-3.5 shadow-sm transition hover:border-[#143c2d]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#143c2d]/10 text-xl shadow-inner">
                    🛒
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Your Basket</p>
                    <p className="font-display text-sm font-bold text-[#143c2d]">
                      {cartCount} {cartCount === 1 ? "item" : "items"} · ₦{cartSubtotal.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <span className="ml-2 rounded-full bg-[#143c2d] px-4 py-2 text-xs font-extrabold text-white">
                    View
                  </span>
                </button>

                <Link
                  to="/orders"
                  className="flex items-center gap-2.5 rounded-2xl border border-[#DFD6C2] bg-white px-4 py-3 text-xs font-extrabold text-slate-800 shadow-sm transition hover:border-[#143c2d] hover:text-[#143c2d]"
                >
                  <span>📦</span>
                  <span>Order History</span>
                </Link>
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="mt-8 rounded-2xl border border-[#DFD6C2] bg-white p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold">
                <div className="flex items-center gap-2 text-[#143c2d]">
                  <span className="text-base">🚚</span>
                  {cartSubtotal >= FREE_DELIVERY_THRESHOLD ? (
                    <span className="font-extrabold text-emerald-800">
                      🎉 You qualified for FREE standard delivery!
                    </span>
                  ) : (
                    <span>
                      Add <span className="font-extrabold text-[#c85a17]">₦{amountToFreeDelivery.toLocaleString("en-NG")}</span> more to unlock <span className="font-extrabold text-[#143c2d]">Free Delivery</span> (orders over ₦15,000)
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{freeDeliveryProgress}% of free delivery goal</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#143c2d] transition-all duration-500"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 1-CLICK CHEF BEMS RECIPE-TO-CART BUNDLES ── */}
        <section className="px-5 pt-8 pb-4 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#c85a17]">
                  <span>👨‍🍳</span>
                  <span>Chef Bems Recipe Kits</span>
                </div>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#143c2d]">
                  Cook Authentic Nigerian Dishes in 1 Click
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Pre-portioned, farm-fresh ingredients bundled together so you never forget an essential spice or staple.
                </p>
              </div>
              <Link
                to="/chef-chat"
                className="text-xs font-extrabold text-[#143c2d] hover:text-[#c85a17] transition self-start sm:self-auto"
              >
                Custom Recipe Help with Chef Bems ➔
              </Link>
            </div>

            {/* Bundles Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {RECIPE_BUNDLES.map((bundle) => {
                const isExpanded = expandedBundle === bundle.id;
                return (
                  <div
                    key={bundle.id}
                    className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#DFD6C2] bg-white p-5 shadow-sm transition-all duration-300 hover:border-[#143c2d] hover:shadow-lg"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100/70 text-2xl">
                          {bundle.emoji}
                        </span>
                        <span className="rounded-full bg-[#143c2d]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#143c2d]">
                          {bundle.badge}
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-base font-bold text-slate-900 leading-snug">
                        {bundle.title}
                      </h3>

                      <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <span>⏱️ {bundle.prepTime}</span>
                        <span>•</span>
                        <span>👥 {bundle.servings}</span>
                      </div>

                      <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {bundle.tagline}
                      </p>

                      {/* Ingredients List */}
                      <div className="mt-3.5 rounded-2xl border border-slate-100 bg-[#FBF9F5] p-3 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-700 mb-1.5">
                          <span className="text-[11px] font-black uppercase text-slate-500">Included Produce ({bundle.itemsCount}):</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {bundle.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                              <span className="truncate">• {ing.name}</span>
                              <span className="text-slate-500 font-medium shrink-0 ml-1">{ing.qty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Price & 1-Click Action */}
                    <div className="mt-5 border-t border-slate-100 pt-3">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-[10px] font-extrabold uppercase text-slate-500">Bundle Price</span>
                        <span className="font-display text-lg font-black text-[#143c2d]">
                          ₦{bundle.totalPrice.toLocaleString("en-NG")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddBundle(bundle)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#143c2d] to-[#1d5742] py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110 active:scale-98"
                      >
                        <span>🧺 1-Click Add Kit to Basket</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── QUICK ACTION BENTO GRID ── */}
        <section className="px-5 py-6 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Tile 1: Chef Bems Copilot (Spans 7 cols on desktop) */}
            <div className="relative overflow-hidden rounded-3xl bg-[#143c2d] p-6 text-white shadow-lg lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    👨‍🍳 Chef Bems AI Assistant
                  </span>
                  <span className="text-xs text-emerald-100/70 font-bold">Instant meal help</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                  Not sure what to cook tonight?
                </h2>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-emerald-50/80">
                  Ask Chef Bems for recipes, grocery list suggestions, or ingredient alternatives based on what’s fresh in our shop.
                </p>
              </div>

              {/* Quick Prompt Pills */}
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300/90">Try asking:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHEF_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.text}
                      type="button"
                      onClick={() => handlePromptClick(prompt.text)}
                      className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 p-2.5 text-left text-xs font-bold text-white transition hover:bg-white hover:text-[#143c2d]"
                    >
                      <span className="text-base shrink-0">{prompt.icon}</span>
                      <span className="truncate">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <Link
                  to="/chef-chat"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-emerald-950 transition hover:bg-white"
                >
                  <span>Open Chef Bems</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <span className="text-xs text-emerald-100/70 font-semibold">Ready to help 24/7</span>
              </div>
            </div>

            {/* Tile 2: Bems Originals & Signature Harvests (Spans 5 cols) */}
            <div className="relative overflow-hidden rounded-3xl border border-[#DFD6C2] bg-gradient-to-br from-[#EFE8DC] to-white p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#143c2d]">
                  <span>🌾</span> In-House Packaged
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold text-[#143c2d]">
                  Bems Farms Originals
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                  Stone-free rice, carefully sorted legumes, and pure unadulterated cooking oils direct from our cultivation farms.
                </p>
              </div>

              {/* Fast Feature Bullets */}
              <div className="mt-4 space-y-2 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[#143c2d]">✓</span> 100% Guaranteed Stone-Free Grains
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#143c2d]">✓</span> Cold-Pressed & Natural Cooking Oils
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#143c2d]">✓</span> Harvested at peak freshness
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("bems_originals");
                    document.getElementById("marketplace-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full rounded-full bg-[#143c2d] py-3 text-center text-xs font-extrabold uppercase tracking-wider text-amber-300 transition hover:bg-[#1a4e3b] hover:text-white"
                >
                  View Bems Originals →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAST ORDER TRACKER CARD ── */}
        <section className="px-5 py-2 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 rounded-2xl border border-[#DFD6C2] bg-[#EFE8DC] p-5 sm:flex-row shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <div>
                <h4 className="font-display text-base font-bold text-[#143c2d]">Track an active harvest delivery</h4>
                <p className="text-xs text-slate-600">Enter your order code to see driver progress in real-time.</p>
              </div>
            </div>

            <form onSubmit={handleTrackingSubmit} className="flex w-full sm:w-auto items-center gap-2">
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Code, e.g. BF-ABC12345"
                className="w-full sm:w-56 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-[#143c2d]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#143c2d] px-5 py-2 text-xs font-extrabold text-white transition hover:bg-[#1a4e3b]"
              >
                Track →
              </button>
            </form>
          </div>
        </section>

        {/* ── MAIN MARKETPLACE CATALOGUE ── */}
        <section id="marketplace-section" className="scroll-mt-24 px-5 pt-12 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {/* Header & Controls */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[#DFD6C2] pb-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#143c2d]">
                  Farm Produce Catalogue
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Fresh harvests for your kitchen
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"} with live prices & stock
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative min-w-[240px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true">🔍</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rice, tomatoes, oils…"
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

            {/* Category Filter Pills Carousel */}
            <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-y-6">
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
              <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <p className="text-3xl">🌾</p>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-800">No products matched your selection</h3>
                <p className="mt-1 text-xs text-slate-500">Try changing your search query or selecting another category.</p>
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
                <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 sm:gap-5">
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

            {/* Bottom Full Shop Link Banner */}
            <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-3xl border border-[#DFD6C2] bg-white p-6 sm:flex-row shadow-sm">
              <div>
                <h4 className="font-display text-lg font-bold text-[#143c2d]">Looking for bulk grocery orders or specific staples?</h4>
                <p className="mt-0.5 text-xs text-slate-600">Browse the entire store inventory on our dedicated catalogue page.</p>
              </div>
              <Link
                to="/products"
                className="inline-flex rounded-full bg-[#143c2d] px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#1a4e3b]"
              >
                Browse All Products →
              </Link>
            </div>
          </div>
        </section>

        {/* ── BUYER TRUST & FARM QUALITY GUARANTEE ── */}
        <section className="border-t border-[#DFD6C2] bg-[#EFE8DC] px-5 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl text-[#143c2d]">🌾</span>
                <div>
                  <h5 className="font-display text-sm font-bold text-[#143c2d]">100% Stone-Free</h5>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Mechanically sorted grains and rice for clean, hassle-free cooking.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-xl text-amber-700">🌱</span>
                <div>
                  <h5 className="font-display text-sm font-bold text-[#143c2d]">Daily Farm Freshness</h5>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Harvested and packaged with zero artificial ripening agents.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-xl text-blue-700">🔒</span>
                <div>
                  <h5 className="font-display text-sm font-bold text-[#143c2d]">Monnify Protected</h5>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Fast and encrypted checkout supporting Cards, Bank Transfer & USSD.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-2xs">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-xl text-purple-700">🚚</span>
                <div>
                  <h5 className="font-display text-sm font-bold text-[#143c2d]">Doorstep Dispatch</h5>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Live order tracking and careful packaging for all food goods.</p>
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
