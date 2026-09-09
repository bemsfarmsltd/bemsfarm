import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import logo from "../assets/bemsfarms_logo_compact.png";
import Toast from "../components/ui/Toast";

const DEFAULT_CATEGORIES = [
  {
    name: "Vegetables",
    detail: "Hand-picked farm fresh tomatoes, tatase, rodo, leafy greens and peppers.",
    image: "/hero_food_2.jpg",
  },
  {
    name: "Grains & Cereals",
    detail: "Stone-free Nigerian rice, premium brown rice, and wholesome grains.",
    image: "/hero_food_1.jpg",
  },
  {
    name: "Cooking Oils",
    detail: "Pure unadulterated palm oil, groundnut oil, and natural culinary oils.",
    image: "/hero_food_3.jpg",
  },
  {
    name: "Legumes",
    detail: "Quality honey beans, white beans, and daily pantry staples.",
    image: "/fresh_salad_hero.png",
  },
];


const steps = [
  { number: "01", icon: "⌕", title: "Browse the shop", text: "Explore fresh produce, pantry staples and kitchen favourites." },
  { number: "02", icon: "👨‍🍳", title: "Ask Chef Bems", text: "Get meal ideas, ingredient alternatives and help building a useful shopping list.", accent: true },
  { number: "03", icon: "🛒", title: "Fill your basket", text: "Open products for full details, choose what you need and review your basket." },
  { number: "04", icon: "✓", title: "Checkout", text: "Sign in, add your delivery address and complete your secure payment." },
];

const promises = [
  { icon: "✦", title: "Carefully selected", text: "Products are chosen with freshness and quality in mind." },
  { icon: "⌁", title: "Simple ordering", text: "Clear product details and an easy path from basket to checkout." },
  { icon: "◌", title: "Helpful guidance", text: "Chef Bems helps turn available ingredients into practical meal ideas." },
  { icon: "✓", title: "Secure checkout", text: "Payments are handled through a trusted payment provider." },
];

const shoppingDetails = [
  { icon: "🚚", title: "Clear delivery costs", text: "Standard delivery is ₦1,500; orders over ₦15,000 qualify for free standard delivery." },
  { icon: "↩", title: "Eligible 7-day returns", text: "Eligible items can be submitted within 7 days of delivery; exclusions apply to some perishable goods." },
  { icon: "🔒", title: "Protected payment", text: "Complete your online payment securely through our encrypted payment gateway." },
  { icon: "✉", title: "Customer support", text: "Questions about shopping or an order? Email info@bemsfarms.com." },
];

const faqs = [
  { question: "Do I need an account to place an order?", answer: "Yes. Your account keeps your delivery details, orders and preferences together, making future purchases quicker." },
  { question: "What does delivery cost?", answer: "Standard delivery is ₦1,500, and orders over ₦15,000 qualify for free standard delivery. Available options are confirmed for your address at checkout." },
  { question: "What can Chef Bems help me with?", answer: "Chef Bems can suggest meals, build shopping ideas and help you find useful alternatives from products available in the store." },
  { question: "Can I review my order after payment?", answer: "Yes. Signed-in customers can follow order progress and review previous purchases from their account." },
];

const HERO_SLIDES = [
  {
    image: "/hero_food_2.jpg",
    alt: "Bems Farms fresh vegetables, peppers and harvest produce",
    tag: "🌱 100% Farm-Fresh",
    eyebrow: "Bems Farms Harvests",
    heading: "Fresh from our farm, delivered with care.",
    badgeIcon: "🥬",
  },
  {
    image: "/hero_food_1.jpg",
    alt: "Bems Farms premium sorted grains, rice and pantry staples",
    tag: "🌾 Bems Brand Staples",
    eyebrow: "In-House Packaged",
    heading: "Stone-free grains & everyday pantry staples.",
    badgeIcon: "🍚",
  },
  {
    image: "/hero_food_3.jpg",
    alt: "Bems Farms pure cooking oils and natural seasonings",
    tag: "✨ Pure & Unadulterated",
    eyebrow: "Bems Signature Oils",
    heading: "Healthy, authentic oils for familiar meals.",
    badgeIcon: "🫒",
  },
  {
    image: "/jollof_rice_hero.png",
    alt: "Delicious Nigerian meals made with Bems Farms ingredients",
    tag: "👨‍🍳 Chef Bems Approved",
    eyebrow: "Farm-to-Kitchen",
    heading: "Everything you need for the food you love.",
    badgeIcon: "🍲",
  },
];

function useModalFocus(isOpen, returnFocusRef) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = () => Array.from(dialog?.querySelectorAll(focusableSelector) || []);

    (focusable()[0] || dialog)?.focus();
    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (returnFocusRef?.current || previousFocus)?.focus?.();
    };
  }, [isOpen, returnFocusRef]);

  return dialogRef;
}

function HeroSlideBanner() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[current];

  return (
    <div
      className="relative aspect-[4/4.6] overflow-hidden rounded-[2.5rem] bg-[#EDE5D5] shadow-2xl shadow-emerald-950/20 sm:rounded-[3.5rem]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M0 14 L14 0 L28 14 L14 28 Z' fill='none' stroke='%23143c2d' stroke-width='1.2' stroke-opacity='0.16'/%3E%3Ccircle cx='14' cy='14' r='1.5' fill='%23143c2d' fill-opacity='0.22'/%3E%3C/svg%3E")`,
        backgroundSize: "28px 28px",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.image}
          src={slide.image}
          alt={slide.alt}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="h-full w-full object-cover"
        />
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-emerald-950/80 via-emerald-950/35 to-transparent" />

      {/* Floating Top Tag */}
      <div className="absolute left-5 top-5 rounded-full border border-white/40 bg-white/90 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#143c2d] shadow-lg backdrop-blur sm:left-7 sm:top-7">
        {slide.tag}
      </div>

      {/* Manual Prev / Next Buttons */}
      <div className="absolute right-4 top-4 flex gap-1.5 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-white/85 text-sm font-bold text-slate-800 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-white/85 text-sm font-bold text-slate-800 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
        >
          ›
        </button>
      </div>

      {/* Slide Content Card Overlay */}
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur sm:bottom-7 sm:left-7 sm:right-7">
        <div className="min-w-0 pr-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#143c2d]">{slide.eyebrow}</p>
          <p className="mt-0.5 truncate font-display text-base font-bold text-slate-900 sm:text-lg">{slide.heading}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#143c2d]/10 text-xl shadow-inner">
          {slide.badgeIcon}
        </span>
      </div>

      {/* Slide Indicators / Dots */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 sm:bottom-28">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current ? "w-7 bg-amber-300 shadow-sm" : "w-2 bg-white/60 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = "center" }) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#143c2d]">{eyebrow}</p>
      <h2 className="font-display text-3xl font-bold leading-tight text-[#143c2d] sm:text-4xl lg:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-base leading-7 text-slate-600">{text}</p>}
    </div>
  );
}

function StoreProductCard({ product, added, onAdd }) {
  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
  const price = Number(product.price || 0) * NAIRA_PER_UNIT;
  const invalidPrice = !Number.isFinite(price) || price <= 0 || price > 1_000_000;
  const unavailable = stock <= 0 || product.available_for_sale === false || invalidPrice;
  const rating = Math.min(5, Math.max(0, Number(product.avg_rating) || 0));
  const isBemsOriginal = Boolean(
    product.name?.toLowerCase().includes("bems") ||
    product.brand?.toLowerCase().includes("bems") ||
    product.is_bems_brand
  );

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#FAF9F6]" aria-label={`View ${product.name}`}>
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/hero_food_4.jpg";
          }}
        />
        {/* Prioritize Bems Original over generic Featured to prevent badge overlap */}
        {isBemsOriginal ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#143c2d]/95 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">
            ★ Bems Original
          </span>
        ) : product.is_featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-[#143c2d] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            Featured
          </span>
        ) : null}
        {unavailable && <span className="absolute inset-x-3 bottom-3 rounded-full bg-slate-900/85 px-3 py-2 text-center text-xs font-bold text-white">Currently unavailable</span>}
      </Link>
      <div className="p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#143c2d]/80">{product.category_name || "Farm produce"}</p>
        <h3 className="mt-1.5 min-h-[2.5rem] font-display text-base font-bold leading-5 text-[#143c2d]"><Link to={`/product/${product.id}`} className="transition hover:text-[#c85a17]">{product.name}</Link></h3>
        <p className="mt-1 truncate text-xs text-slate-500">{product.unit || "Per item"}</p>
        <div className="mt-2 flex min-h-4 items-center gap-1 text-[11px]">
          {Number(product.review_count) > 0 ? <><span className="text-[#c85a17]" aria-label={`${rating.toFixed(1)} out of 5 stars`}><span aria-hidden="true">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span></span><span className="text-slate-400">({product.review_count})</span></> : <span className="text-slate-400">New to the shop</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-1.5">
          <p className="font-extrabold text-slate-900 text-sm xl:text-base whitespace-nowrap">{invalidPrice ? "Price unavailable" : `₦${price.toLocaleString("en-NG")}`}</p>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={unavailable}
            className={`h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold text-white transition ${added ? "bg-[#1d6b45]" : "bg-[#143c2d] hover:bg-[#1a4e3b]"} disabled:cursor-not-allowed disabled:bg-slate-300`}
            aria-label={invalidPrice ? `${product.name} price is unavailable` : `Add ${product.name} to basket`}
          >
            {invalidPrice ? "Reviewing" : added ? "✓ Added" : "+ Add"}
          </button>
        </div>
      </div>
    </article>
  );
}


function LoginPromptModal({ isOpen, onClose, cartCount, cartSubtotal, onLogin, onRegister }) {
  const dialogRef = useModalFocus(isOpen);
  if (!isOpen) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-emerald-900/10 bg-[#fffdf8] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-inner">
            🔒
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <h3 id="login-prompt-title" className="mt-4 font-display text-2xl font-bold text-[#143c2d]">
          Sign in to place your order
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your selected goods ({cartCount} {cartCount === 1 ? "item" : "items"}, worth <span className="font-extrabold text-slate-900">₦{cartSubtotal.toLocaleString()}</span>) are securely saved in your basket.
        </p>
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs font-bold leading-5 text-emerald-900">
          💡 An account is needed so we can verify your delivery address, provide live tracking, and protect your order details.
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-full bg-[#143c2d] py-3.5 text-center text-sm font-extrabold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#1a4e3b]"
          >
            Sign in & place order →
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="w-full rounded-full border-2 border-[#143c2d] bg-white py-3 text-center text-sm font-extrabold text-[#143c2d] transition hover:bg-emerald-50"
          >
            Create an account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 text-center text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Keep browsing catalogue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FullScreenCatalogueModal({
  isOpen,
  onClose,
  products,
  addedProducts,
  onAdd,
  cartCount,
  cartSubtotal,
  onProceedToOrder,
  returnFocusRef,
}) {
  const [modalSearch, setModalSearch] = useState("");
  const [modalFilter, setModalFilter] = useState("all");
  const dialogRef = useModalFocus(isOpen, returnFocusRef);

  if (!isOpen) return null;

  const liveCategories = [...new Set(products.map((product) => product.category_name).filter(Boolean))];
  const categoriesList = [
    { key: "all", label: "All Items" },
    { key: "bems_originals", label: "★ Bems Originals" },
    ...liveCategories.map((category) => ({ key: category, label: category })),
    { key: "featured", label: "Featured" },
    { key: "newest", label: "New Arrivals" },
  ];

  const filtered = products
    .filter((p) => {
      if (modalFilter === "bems_originals") {
        return (
          p.name?.toLowerCase().includes("bems") ||
          p.brand?.toLowerCase().includes("bems") ||
          p.is_bems_brand
        );
      }
      if (modalFilter === "featured") return Boolean(p.is_featured);
      if (modalFilter === "all" || modalFilter === "newest") return true;
      return (
        p.category_name?.toLowerCase() === modalFilter.toLowerCase()
      );
    })
    .filter((p) => {
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase().trim();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.unit?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (modalFilter === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    });

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex flex-col bg-[#faf8f2] text-slate-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalogue-dialog-title"
      tabIndex={-1}
    >
      <h2 id="catalogue-dialog-title" className="sr-only">Full Screen Store Catalogue</h2>
      {/* Background dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23143c2d' fill-opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Top Bar Header */}
      <div className="relative z-10 border-b border-emerald-950/10 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BemsFarms" className="h-9 w-auto" />
            <div className="hidden sm:block">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                Full Screen Store Catalogue
              </span>
            </div>
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md min-w-[220px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">🔍</span>
            <input
              type="search"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Search rice, oils, peppers, Bems items…"
              className="w-full rounded-full border border-slate-300 bg-[#faf8f2] py-2 pl-9 pr-8 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              autoFocus
            />
            {modalSearch && (
              <button
                type="button"
                onClick={() => setModalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label={`View basket with ${cartCount} items`}
            >
              <span aria-hidden="true">🛒</span>
              <span>Basket</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-95"
              aria-label="Close full screen catalogue"
            >
              <span>✕</span>
              <span>Close (Esc)</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categoriesList.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setModalFilter(cat.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 font-extrabold transition ${
                modalFilter === cat.key
                  ? cat.key === "bems_originals"
                    ? "bg-emerald-800 text-amber-300 ring-2 ring-amber-400/40"
                    : "bg-[#17352a] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-[11px] font-bold text-slate-500">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </span>
        </div>
      </div>

      {/* Reassuring Notice Banner */}
      <div className="relative z-10 border-b border-slate-200 bg-[#F4F1EA] px-4 py-2.5 text-center text-xs text-slate-700">
        <span className="font-extrabold text-[#143c2d]">🛒 Add items freely to your basket!</span>{" "}
        <span className="text-slate-600">
          Even after selecting goods and adding them to your basket, you will sign in (or register) to enter your delivery location and place your order.
        </span>
      </div>

      {/* Scrollable Products Grid */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-32 lg:p-8 lg:pb-32">
        <div className="mx-auto max-w-7xl">
          {filtered.length === 0 ? (
            <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="font-display text-2xl font-bold text-slate-800">No products matched that filter</p>
              <p className="mt-2 text-sm text-slate-500">Try clearing your search or selecting another category.</p>
              <button
                type="button"
                onClick={() => {
                  setModalSearch("");
                  setModalFilter("all");
                }}
                className="mt-5 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-extrabold text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
              {filtered.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  added={Boolean(addedProducts[product.id])}
                  onAdd={onAdd}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Dock: Basket & Place Order */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur-lg sm:p-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#143c2d]/10 text-xl shadow-inner">
              🛒
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Basket: {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
              <p className="font-display text-lg font-bold text-[#143c2d]">
                Subtotal: ₦{cartSubtotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-[#FAF9F6] px-3.5 py-1.5 text-xs font-bold text-[#143c2d]">
            <span aria-hidden="true">🔒</span>
            <span>Login required to place order & choose delivery</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/cart"
              className="rounded-full border-2 border-slate-300 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-800 transition hover:border-[#143c2d] hover:text-[#143c2d]"
            >
              View Basket
            </Link>
            <button
              type="button"
              onClick={onProceedToOrder}
              disabled={cartCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-[#1a4e3b] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <span>{cartCount === 0 ? "Add items to order" : "Place Order"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addToCart, cartCount, cartSubtotal } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullScreenModalOpen, setFullScreenModalOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [catalogueView, setCatalogueView] = useState("all");
  const [addedProducts, setAddedProducts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const catalogueTriggerRef = useRef(null);
  const itemsPerPage = 6;

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Lock body scroll while either modal is open.
  useEffect(() => {
    if (fullScreenModalOpen || loginPromptOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullScreenModalOpen, loginPromptOpen]);

  // Listen for Escape key to close modal or login prompt
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (loginPromptOpen) setLoginPromptOpen(false);
        else if (fullScreenModalOpen) setFullScreenModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullScreenModalOpen, loginPromptOpen]);

  const handleProceedToOrder = () => {
    if (cartCount === 0) return;
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
    } else {
      navigate("/checkout");
    }
  };

  // Reset to page 1 when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [catalogueView, appliedSearch]);

  const loadProducts = async (term = "") => {
    setProductsLoading(true);
    setProductsError("");
    setAppliedSearch(term);
    try {
      const response = await api.get("/products", { params: { search: term || undefined, limit: 200 } });
      setProducts(Array.isArray(response.data?.products) ? response.data.products : []);
    } catch (error) {
      setProducts([]);
      setProductsError(error?.response?.data?.message || "The live catalogue is temporarily unavailable. Please try again.");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    loadProducts(search.trim());
    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTracking = (event) => {
    event.preventDefault();
    const code = trackingCode.trim().replace(/^#/, "").toUpperCase();
    navigate(code ? `/track-order?code=${encodeURIComponent(code)}` : "/track-order");
  };

  const handleAdd = (product) => {
    const displayPrice = Number(product.price || 0) * NAIRA_PER_UNIT;
    if (!Number.isFinite(displayPrice) || displayPrice <= 0 || displayPrice > 1_000_000) return;
    addToCart(product);
    setAddedProducts((current) => ({ ...current, [product.id]: true }));

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      message: `✓ Added ${product.name} to basket`,
      type: "success",
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);

    window.setTimeout(() => setAddedProducts((current) => ({ ...current, [product.id]: false })), 1200);
  };

  const categoryImages = ["/hero_food_1.jpg", "/hero_food_2.jpg", "/hero_food_3.jpg", "/fresh_salad_hero.png", "/hero_food_4.jpg"];
  const dynamicCategories = [...new Set(products.map((product) => product.category_name).filter(Boolean))].map((name, index) => ({
    name,
    detail: `Browse available ${name.toLowerCase()} from the live BemsFarms catalogue.`,
    image: categoryImages[index % categoryImages.length],
  }));
  const categoryCards = dynamicCategories.length > 0 ? dynamicCategories : DEFAULT_CATEGORIES;

  const displayedProducts = [...products]
    .filter((product) => {
      if (catalogueView === "bems_originals") {
        return (
          product.name?.toLowerCase().includes("bems") ||
          product.brand?.toLowerCase().includes("bems") ||
          product.is_bems_brand
        );
      }
      if (catalogueView === "featured") return Boolean(product.is_featured);
      return true;
    })
    .sort((a, b) => {
      if (catalogueView === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    });

  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = displayedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubscribe = async (event) => {
    event.preventDefault();
    if (!email.trim() || subscribeState === "loading") return;
    setSubscribeState("loading");
    setSubscribeMessage("");
    try {
      const response = await api.post("/subscribe", { email: email.trim() });
      setSubscribeState("success");
      setSubscribeMessage(response.data?.message || "You’re on the list. Watch your inbox for BemsFarms updates.");
      setEmail("");
    } catch (error) {
      setSubscribeState("error");
      setSubscribeMessage(error?.response?.data?.message || "We could not add you right now. Please try again.");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8F5EE] text-slate-900">
      <style>{`
        @keyframes driftPattern {
          0% { background-position: 0px 0px; }
          100% { background-position: 56px 56px; }
        }
        @keyframes driftBacking {
          0% { background-position: 0px 0px; }
          100% { background-position: -56px 56px; }
        }
        .animate-pattern-drift {
          animation: driftPattern 32s linear infinite;
        }
        .animate-backing-drift {
          animation: driftBacking 24s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pattern-drift,
          .animate-backing-drift {
            animation: none;
          }
          *, *::before, *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">Skip to main content</a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#DFD6C2] bg-[#F8F5EE]/95 backdrop-blur-xl">
        <nav className="flex h-[76px] w-full items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Main navigation">
          <Link to="/" className="shrink-0" aria-label="BemsFarms home" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="BemsFarms" className="h-10 w-auto" />
          </Link>
          <div className="hidden items-center gap-6 xl:flex">
            <a href="#featured-products" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">Shop Products</a>
            <a href="#categories" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">Categories</a>
            <a href="#our-brand" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">Bems Originals</a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">How it works</a>
            <Link to="/track-order" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">Track order</Link>
            <a href="#chef-bems" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">Chef Bems</a>
            <a href="#faq" className="text-sm font-bold text-slate-600 transition hover:text-[#143c2d]">FAQs</a>
          </div>
          <div className="hidden items-center gap-3 xl:flex">
            <Link to="/cart" className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-lg" aria-label={`Basket with ${cartCount} items`}>
              <span aria-hidden="true">🛒</span>
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#143c2d] px-1 text-[10px] font-extrabold text-white">{cartCount}</span>}
            </Link>
            {isLoggedIn ? (
              <Link to="/home" className="rounded-full bg-[#143c2d] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b]">My account</Link>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-5 py-2.5 text-sm font-extrabold text-[#143c2d] transition hover:bg-[#143c2d]/5">Sign in</Link>
                <Link to="/register" className="rounded-full bg-[#143c2d] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b]">Create account</Link>
              </>
            )}
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-xl xl:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Toggle navigation menu">{menuOpen ? "×" : "☰"}</button>
        </nav>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-slate-100 bg-white px-5 pb-6 pt-4 shadow-xl xl:hidden">
              <div className="flex flex-col gap-1">
                {[['#featured-products', 'Shop products'], ['#categories', 'Categories'], ['#our-brand', 'Bems Originals'], ['#how-it-works', 'How it works'], ['#chef-bems', 'Chef Bems'], ['#faq', 'FAQs']].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#FAF9F6]">{label}</a>)}
                <Link to="/track-order" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#FAF9F6]">Track an order</Link>
              </div>
              {isLoggedIn ? <Link to="/home" className="mt-4 block rounded-full bg-[#143c2d] px-4 py-3 text-center text-sm font-extrabold text-white">My account</Link> : <div className="mt-4 grid grid-cols-2 gap-3"><Link to="/login" className="rounded-full border border-[#143c2d] px-4 py-3 text-center text-sm font-extrabold text-[#143c2d]">Sign in</Link><Link to="/register" className="rounded-full bg-[#143c2d] px-4 py-3 text-center text-sm font-extrabold text-white">Join now</Link></div>}
              <Link to="/cart" className="mt-3 flex items-center justify-between rounded-2xl bg-[#143c2d] px-4 py-3 text-sm font-extrabold text-white"><span>🛒 View basket</span><span>{cartCount} {cartCount === 1 ? "item" : "items"}</span></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:min-h-[760px] lg:px-12 lg:pb-24 lg:pt-36">
          {/* Moving Pattern background across hero banner section with soft fade-out gradient */}
          <div
            className="animate-pattern-drift absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cpath d='M0 28 L28 0 L56 28 L28 56 Z' fill='none' stroke='%23143c2d' stroke-width='0.75' stroke-opacity='0.04'/%3E%3Ccircle cx='28' cy='28' r='1' fill='%23143c2d' fill-opacity='0.04'/%3E%3Ccircle cx='0' cy='0' r='0.8' fill='%23143c2d' fill-opacity='0.03'/%3E%3Ccircle cx='56' cy='0' r='0.8' fill='%23143c2d' fill-opacity='0.03'/%3E%3Ccircle cx='0' cy='56' r='0.8' fill='%23143c2d' fill-opacity='0.03'/%3E%3Ccircle cx='56' cy='56' r='0.8' fill='%23143c2d' fill-opacity='0.03'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "56px 56px",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.06) 70%, transparent 92%)",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.06) 70%, transparent 92%)",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#143c2d] shadow-sm"><span className="h-2 w-2 rounded-full bg-[#143c2d]" /> Fresh food &amp; trusted brands</div>
              <h1 className="font-display text-[clamp(2.75rem,6.5vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.055em] text-[#143c2d]">Fresh harvests, <span className="text-[#c85a17]">trusted brands.</span></h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600 lg:mx-0">Shop fresh produce, trusted grocery brands and everyday kitchen essentials in one place—including Bems Farms’ own packaged staples and cooking oils.</p>
              
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/products" className="rounded-full bg-[#143c2d] px-8 py-4 text-center text-base font-extrabold text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b]">Start shopping <span aria-hidden="true">→</span></Link>
                <a href="#how-it-works" className="rounded-full border border-slate-300 bg-white px-8 py-4 text-center text-base font-extrabold text-slate-800 transition hover:border-[#143c2d] hover:text-[#143c2d]">See how it works</a>
              </div>
              <div className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-bold text-slate-600 lg:justify-start">
                <span>✓ Trusted Grocery Brands</span>
                <span>✓ Bems Farms Originals</span>
                <span>✓ Fast & Reliable Delivery</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.12 }} className="relative mx-auto w-full max-w-[580px]">
              {/* Soft Moving Pattern Backdrop Frame at the back of the banner */}
              <div
                className="animate-backing-drift absolute -inset-4 sm:-inset-6 lg:-inset-7 rounded-[2.8rem] sm:rounded-[3.8rem] bg-[#F3EDE2] border-2 border-dashed border-[#143c2d]/15 shadow-md -rotate-1 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M0 14 L14 0 L28 14 L14 28 Z' fill='none' stroke='%23143c2d' stroke-width='0.75' stroke-opacity='0.06'/%3E%3Ccircle cx='14' cy='14' r='1' fill='%23143c2d' fill-opacity='0.07'/%3E%3C/svg%3E")`,
                  backgroundSize: "28px 28px",
                  WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.4) 85%, transparent 100%)",
                  maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.4) 85%, transparent 100%)",
                }}
              />
              {/* Decorative Corner Badge */}
              <div className="absolute -top-3 -right-2 z-10 hidden sm:flex items-center gap-1.5 rounded-full bg-[#143c2d] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300 shadow-lg rotate-2 border border-amber-300/30">
                <span>🌾</span> Fresh Harvest
              </div>
              <HeroSlideBanner />
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-emerald-900/10 bg-[#143c2d] px-5 py-7 text-white sm:px-8 lg:px-12">
          {/* Subtle agricultural pattern overlay on green stats banner */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M0 14 L14 0 L28 14 L14 28 Z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3Ccircle cx='14' cy='14' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[['Trusted', 'grocery brands'], ['Fresh', 'harvest selections'], ['Helpful', 'meal inspiration'], ['Simple', 'order tracking']].map(([lead, text]) => (
              <div key={lead}>
                <p className="font-display text-xl font-bold text-amber-300 sm:text-2xl">{lead}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-100/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── OUR BRAND SPOTLIGHT ── */}
        <section id="our-brand" className="scroll-mt-24 bg-[#EFE8DC] px-5 py-16 sm:px-8 lg:px-12 lg:py-20 border-b border-[#DDD3BF]">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#143c2d]">From Bems Farms</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-[#143c2d] sm:text-4xl">Meet Our Originals Within Our Wider Marketplace.</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">Unlike ordinary markets, Bems Farms cultivates, sorts, and packages our own line of signature food staples and crops. Every bag of grains, bottle of oil, and fresh harvest is inspected for supreme quality and natural taste.</p>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#DFD6C2] bg-white p-5 shadow-sm">
                    <p className="text-xl">🌾</p>
                    <h3 className="mt-2 font-display text-base font-bold text-[#143c2d]">In-House Packaged</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Carefully sorted, stone-free grains and pure culinary oils.</p>
                  </div>
                  <div className="rounded-2xl border border-[#DFD6C2] bg-white p-5 shadow-sm">
                    <p className="text-xl">🚜</p>
                    <h3 className="mt-2 font-display text-base font-bold text-[#143c2d]">Harvested Daily</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Crops harvested at peak freshness with zero artificial tampering.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-900/10 bg-[#143c2d] p-7 text-white shadow-xl sm:p-9">
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">Bems Guarantee</p>
                <h3 className="mt-2 font-display text-2xl font-bold">Look for the “Bems Original” Badge</h3>
                <p className="mt-3 text-sm leading-6 text-emerald-100/80">Our catalogue includes products from a range of trusted brands. Items marked with the <span className="font-bold text-amber-300">★ Bems Original</span> badge are produced or packaged by Bems Farms.</p>
                <div className="mt-6">
                  <a href="#featured-products" onClick={() => setCatalogueView("bems_originals")} className="inline-flex rounded-full bg-amber-300 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-emerald-950 transition hover:bg-white">View Bems Originals →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATALOGUE WITH PROMINENT SEARCH ── */}
        <section id="featured-products" className="scroll-mt-24 bg-[#F8F5EE] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading align="left" eyebrow="Shop the farm" title={appliedSearch ? `Results for “${appliedSearch}”` : "Fresh picks for your basket"} text="Explore our in-house brand items and full catalogue with live stock and prices." />
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Prominent Full Screen Button */}
                <button
                  ref={catalogueTriggerRef}
                  type="button"
                  onClick={() => setFullScreenModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#143c2d] bg-[#143c2d] px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-amber-300 shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b] hover:text-white active:scale-95"
                  aria-label="Open full screen catalogue modal"
                >
                  <span className="text-base" aria-hidden="true">⛶</span>
                  <span>Full Screen Catalogue</span>
                </button>

                {/* Search Bar right inside Catalogue section */}
                <form onSubmit={handleSearch} className="flex w-full sm:w-80 md:w-96 items-center rounded-full border border-[#DDD3BF] bg-white p-1.5 shadow-sm focus-within:border-[#143c2d] focus-within:ring-2 focus-within:ring-emerald-600/20">
                  <label htmlFor="catalogue-search" className="sr-only">Search products</label>
                  <span className="ml-3 text-slate-400" aria-hidden="true">🔍</span>
                  <input
                    id="catalogue-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search rice, oils, peppers…"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
                  />
                  <button type="submit" className="rounded-full bg-[#143c2d] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1a4e3b]">
                    Search
                  </button>
                </form>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => { setCatalogueView("all"); if (appliedSearch) { setSearch(""); loadProducts(); } }}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "all" && !appliedSearch ? "bg-[#143c2d] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                All Products
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("bems_originals")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "bems_originals" ? "bg-[#143c2d] text-amber-300 ring-2 ring-amber-400/40" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                ★ Bems Originals
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("featured")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "featured" ? "bg-[#143c2d] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                Featured
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("newest")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "newest" ? "bg-[#143c2d] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                New Arrivals
              </button>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); loadProducts(); }}
                  className="ml-auto rounded-full border border-[#DDD3BF] bg-white px-4 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-[#F3EDE2]"
                >
                  Clear search ({appliedSearch}) ✕
                </button>
              )}
            </div>

            {productsLoading && (
              <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 xl:gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-[#DFD6C2] bg-white shadow-sm">
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
            )}

            {!productsLoading && productsError && <div role="alert" className="mt-10 flex flex-col items-center rounded-3xl border border-orange-200 bg-orange-50 px-6 py-10 text-center"><p className="font-display text-xl font-bold text-slate-900">{productsError}</p><button type="button" onClick={() => loadProducts(search)} className="mt-4 rounded-full bg-[#17352a] px-6 py-3 text-sm font-extrabold text-white">Try again</button></div>}

            {!productsLoading && !productsError && displayedProducts.length === 0 && (
              <div role="status" className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="font-display text-xl font-bold text-slate-900">
                  {catalogueView === "bems_originals" ? "No Bems Original products currently listed." : "No products matched that query."}
                </p>
                <p className="mt-2 text-sm text-slate-600">Try a broader ingredient or browse all products.</p>
                <button type="button" onClick={() => { setCatalogueView("all"); setSearch(""); loadProducts(); }} className="mt-4 rounded-full bg-[#143c2d] px-6 py-2.5 text-xs font-extrabold text-white">
                  Reset view
                </button>
              </div>
            )}

            {!productsLoading && !productsError && displayedProducts.length > 0 && (
              <>
                <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 xl:gap-4">
                  {paginatedProducts.map((product) => (
                    <StoreProductCard key={product.id} product={product} added={Boolean(addedProducts[product.id])} onAdd={handleAdd} />
                  ))}
                </div>

                {/* Pagination Controls (Previous / Next + Numbers) */}
                {totalPages > 1 && (
                  <div className="mt-9 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
                    <p className="text-xs font-bold text-slate-500">
                      Showing <span className="font-extrabold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-extrabold text-slate-900">{Math.min(currentPage * itemsPerPage, displayedProducts.length)}</span> of <span className="font-extrabold text-slate-900">{displayedProducts.length}</span> products
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Previous page"
                      >
                        <span aria-hidden="true">‹</span> Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, index) => {
                          const pageNum = index + 1;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => goToPage(pageNum)}
                              className={`h-8 w-8 rounded-full text-xs font-extrabold transition ${
                                currentPage === pageNum
                                  ? "bg-[#143c2d] text-white shadow-md"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                              aria-label={`Go to page ${pageNum}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Next page"
                      >
                        Next <span aria-hidden="true">›</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#DDD3BF] bg-[#EFE8DC] px-6 py-5 sm:flex-row shadow-sm">
              <p className="text-center text-sm font-bold text-slate-700 sm:text-left">
                {isLoggedIn ? "Your basket items are securely saved to your account." : "Your basket is saved while you create an account."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-sm font-extrabold text-[#143c2d]">{cartCount} {cartCount === 1 ? "item" : "items"}</span>
                <Link to="/products" className="rounded-full border border-[#DDD3BF] bg-white px-5 py-2.5 text-sm font-extrabold text-slate-800 transition hover:border-[#143c2d]">
                  View catalogue page
                </Link>
                <Link
                  to={cartCount ? "/cart" : isLoggedIn ? "/products" : "/register"}
                  className="rounded-full bg-[#143c2d] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1a4e3b]"
                >
                  {cartCount ? "View basket" : isLoggedIn ? "Browse catalogue" : "Create account"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="categories" className="scroll-mt-24 bg-[#F8F5EE] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Explore the pantry" title="Shop by category" text="Jump into the part of the market you need and discover useful choices for the way you cook." />{categoryCards.length > 0 ? <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{categoryCards.map((category, index) => <motion.article key={category.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: Math.min(index, 6) * 0.06 }} className="group overflow-hidden rounded-[1.75rem] border border-[#DFD6C2] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><Link to={`/products?category=${encodeURIComponent(category.name)}`} className="block"><div className="h-56 overflow-hidden"><img src={category.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></div><div className="p-6"><h3 className="font-display text-xl font-bold text-[#143c2d]">{category.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{category.detail}</p><span className="mt-5 inline-flex text-sm font-extrabold text-[#143c2d] group-hover:text-[#c85a17]">Explore category <span className="ml-2" aria-hidden="true">→</span></span></div></Link></motion.article>)}</div> : <p className="mx-auto mt-10 max-w-xl text-center text-sm text-slate-600">Categories will appear when the live catalogue is available.</p>}<div className="mt-9 text-center"><Link to="/products" className="inline-flex rounded-full border border-[#143c2d] px-6 py-3 text-sm font-extrabold text-[#143c2d] transition hover:bg-[#143c2d] hover:text-white">Browse every category →</Link></div></div></section>

        <section aria-labelledby="shopping-details-title" className="border-y border-[#DDD3BF] bg-[#EFE8DC] px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#143c2d]">Shop with clarity</p><h2 id="shopping-details-title" className="mt-2 font-display text-2xl font-bold text-[#143c2d] sm:text-3xl">Know what happens after you add to basket</h2></div>
              <a href="mailto:info@bemsfarms.com" className="text-sm font-extrabold text-[#c85a17] hover:underline">Contact support →</a>
            </div>
            <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-[#DFD6C2] bg-[#DFD6C2] sm:grid-cols-2 lg:grid-cols-4">
              {shoppingDetails.map((item) => <article key={item.title} className="bg-white p-6"><span className="text-2xl" aria-hidden="true">{item.icon}</span><h3 className="mt-4 font-display text-lg font-bold text-[#143c2d]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-[#F8F5EE] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="A smarter shopping journey" title="From meal idea to doorstep" text="Shop at your own pace, with Chef Bems ready to help when you need inspiration." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => <article key={step.number} className={`relative overflow-hidden rounded-3xl border border-[#DFD6C2] p-6 shadow-sm ${step.accent ? "bg-[#143c2d] text-white border-[#143c2d]" : "bg-white"}`}>
                {step.accent && <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />}
                <div className="relative flex items-center justify-between"><p className={`font-display text-3xl font-bold ${step.accent ? "text-amber-300" : "text-[#143c2d]"}`}>{step.number}</p><span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg ${step.accent ? "bg-white/10" : "bg-[#F8F5EE] text-[#143c2d] border border-[#DFD6C2]"}`} aria-hidden="true">{step.icon}</span></div>
                <h3 className={`relative mt-8 font-display text-xl font-bold ${step.accent ? "text-white" : "text-[#143c2d]"}`}>{step.title}</h3>
                <p className={`relative mt-3 text-sm leading-6 ${step.accent ? "text-emerald-50/75" : "text-slate-600"}`}>{step.text}</p>
                {step.accent && <Link to="/chef-chat" className="relative mt-5 inline-flex text-xs font-extrabold text-amber-300 hover:text-white">Open Chef Bems →</Link>}
              </article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#EFE8DC] border-y border-[#DDD3BF] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center"><div className="relative"><img src="/jollof_rice_hero.png" alt="Jollof rice served with grilled chicken and plantain" className="aspect-square w-full rounded-[2.5rem] object-cover shadow-xl" loading="lazy" /><div className="absolute -bottom-5 right-5 max-w-[240px] rounded-2xl bg-[#143c2d] p-5 text-white shadow-xl sm:right-8"><p className="font-display text-xl font-bold">Made for the meals you love.</p></div></div><div><SectionHeading align="left" eyebrow="Why BemsFarms" title="More confidence in every basket" text="A thoughtful shopping experience that helps you move from food inspiration to a completed order without confusion." /><div className="mt-9 grid gap-5 sm:grid-cols-2">{promises.map((item) => <article key={item.title} className="rounded-2xl border border-[#DFD6C2] bg-white p-5 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F8F5EE] font-bold text-[#143c2d]">{item.icon}</span><h3 className="mt-4 font-display text-lg font-bold text-[#143c2d]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}</div></div></div></section>

        <section id="chef-bems" className="scroll-mt-24 bg-[#F8F5EE] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#143c2d] px-6 py-12 text-white sm:px-10 lg:px-16 lg:py-16">
            <div className="relative grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">Your food companion</p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">Meet Chef Bems</h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/75">Need meal inspiration or help building a useful shopping list? Chef Bems connects your cooking ideas with ingredients you can find in the store.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2"><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🍲 Meal and recipe ideas</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🛒 Smarter shopping lists</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🥕 Ingredient alternatives</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">💬 Conversational guidance</p></div>
                <Link to="/chef-chat" className="mt-9 inline-flex rounded-full bg-amber-300 px-7 py-3.5 text-sm font-extrabold text-[#143c2d] transition hover:bg-white">Open Chef Bems</Link>
              </div>
              <div className="relative mx-auto w-full max-w-md">
                <div className="aspect-square overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl">
                  <video
                    src="https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_640/v1784539329/Give_me_a_video_of_the_charact_supd0d.mp4"
                    poster="/fresh_salad_hero.png"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    aria-label="Chef Bems animated character"
                    className="h-full w-full object-cover"
                  />
                </div>
                <Link
                  to="/chef-chat"
                  className="group absolute -bottom-4 -left-3 rounded-2xl border border-white/20 bg-white/95 p-4 text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
                  aria-label="Ask Chef Bems: What can I cook tonight?"
                >
                  <p className="text-xs font-bold text-slate-500">Try asking</p>
                  <p className="mt-1 text-sm font-extrabold text-[#143c2d] group-hover:text-[#c85a17]">
                    “What can I cook tonight?” →
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F5EE] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28" aria-labelledby="track-delivery-title">
          <div className="mx-auto grid max-w-7xl gap-7 overflow-hidden rounded-[2rem] border border-[#DDD3BF] bg-[#EFE8DC] p-6 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-10 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3BF] bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#143c2d]">
                <span>🚚</span> Real-time tracking
              </div>
              <h2 id="track-delivery-title" className="mt-3 font-display text-2xl font-bold text-[#143c2d] sm:text-3xl">Track your harvest delivery</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use the order reference from your confirmation. No password or login required.</p>
            </div>
            <form onSubmit={handleTracking} className="flex flex-col gap-3 rounded-3xl bg-white p-3 border border-[#DDD3BF] shadow-sm sm:flex-row">
              <label htmlFor="landing-tracking-code" className="sr-only">Delivery code</label>
              <input id="landing-tracking-code" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="Delivery code, e.g. BF-ABC12345" autoComplete="off" spellCheck="false" className="min-w-0 flex-1 rounded-2xl bg-[#F8F5EE] px-5 py-4 font-mono text-sm font-bold uppercase tracking-wide outline-none ring-[#143c2d] transition focus:ring-2" />
              <button type="submit" className="rounded-2xl bg-[#143c2d] px-7 py-4 text-sm font-extrabold text-white transition hover:bg-[#1a4e3b]">Track delivery →</button>
            </form>
          </div>
        </section>

        {/* ── TACTILE FAQ SECTION ── */}
        <section id="faq" className="scroll-mt-24 border-t border-[#DDD3BF] bg-[#EFE8DC] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <SectionHeading align="left" eyebrow="Good to know" title="Questions before your first order?" text="Clear answers about our packaging, farm origins, ordering process and doorstep delivery." />
              <div className="mt-8 rounded-2xl border border-[#DFD6C2] bg-white p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#143c2d]">Need personal assistance?</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Our customer care and farm delivery support teams are available Mon–Sat.</p>
                <a href="mailto:info@bemsfarms.com" className="mt-3 inline-flex text-xs font-extrabold text-[#c85a17] hover:underline">
                  Contact customer care →
                </a>
              </div>
            </div>

            {/* Tactile Elevated Cards for FAQ items */}
            <div className="space-y-3.5">
              {faqs.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={item.question}
                    className={`rounded-2xl border transition duration-200 ${
                      isOpen
                        ? "border-[#143c2d] bg-white shadow-md ring-2 ring-[#143c2d]/10"
                        : "border-[#DFD6C2] bg-white hover:border-[#143c2d]/50 shadow-xs"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-display text-base font-bold text-[#143c2d] sm:text-lg">
                        {item.question}
                      </span>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold transition ${
                        isOpen ? "bg-[#143c2d] text-white" : "bg-[#F3EDE2] text-[#143c2d]"
                      }`}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="border-t border-slate-100 px-5 pb-5 pt-3 text-sm leading-7 text-slate-600">
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── RICH HARVEST NOTES NEWSLETTER ── */}
        <section className="bg-[#EFE8DC] px-5 pb-20 sm:px-8 lg:px-12 sm:pb-24">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#143c2d] px-6 py-12 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 shadow-2xl">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                <span>🌾</span> Harvest Notes & Updates
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl text-white">
                Fresh updates straight to your inbox
              </h2>
              <p className="mt-3 text-sm leading-6 text-emerald-100/80">
                Receive product news, seasonal produce alerts, Chef Bems recipes, and practical food inspiration from BemsFarms.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-emerald-100/70">
                <span className="rounded-full bg-white/10 px-3 py-1">✓ Weekly harvest updates</span>
                <span className="rounded-full bg-white/10 px-3 py-1">✓ Chef Bems meal tips</span>
                <span className="rounded-full bg-white/10 px-3 py-1">✓ Zero spam</span>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="relative z-10 mt-8 w-full max-w-xl lg:mt-0">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address…"
                  className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm text-white placeholder:text-emerald-100/60 outline-none ring-amber-300 transition focus:bg-white/15 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={subscribeState === "loading"}
                  className="shrink-0 rounded-full bg-amber-300 px-7 py-4 text-sm font-extrabold text-[#143c2d] shadow-lg transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                >
                  {subscribeState === "loading" ? "Joining…" : "Keep me updated →"}
                </button>
              </div>
              {subscribeMessage && (
                <p role="status" className={`mt-3 text-sm font-bold ${subscribeState === "error" ? "text-red-300" : "text-amber-300"}`}>
                  {subscribeMessage}
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">By subscribing, you agree to receive BemsFarms updates. You can unsubscribe from any email. See our <Link to="/privacy" className="font-bold text-amber-300 hover:underline">privacy policy</Link>.</p>
            </form>
          </div>
        </section>

        <section className="border-t border-[#DDD3BF] bg-[#F8F5EE] px-5 pb-20 pt-16 text-center sm:px-8 lg:px-12 lg:pb-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#143c2d]">Ready when you are</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-[#143c2d] sm:text-5xl">
              Bring something fresh to the table.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">
              {isLoggedIn
                ? "Explore today's fresh harvests and pantry staples for your kitchen."
                : "Create your BemsFarms account and start building a basket that fits your kitchen."}
            </p>
            {isLoggedIn ? (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  to="/products"
                  className="inline-flex rounded-full bg-[#143c2d] px-9 py-4 text-base font-extrabold text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b]"
                >
                  Shop the catalogue <span className="ml-2" aria-hidden="true">→</span>
                </Link>
                <Link
                  to="/home"
                  className="inline-flex rounded-full border-2 border-[#143c2d] bg-white px-8 py-3.5 text-base font-extrabold text-[#143c2d] transition hover:bg-[#143c2d]/5"
                >
                  Go to my account
                </Link>
              </div>
            ) : (
              <Link
                to="/register"
                className="mt-8 inline-flex rounded-full bg-[#143c2d] px-9 py-4 text-base font-extrabold text-white shadow-md shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#1a4e3b]"
              >
                Create your account <span className="ml-2" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-[#0e241c] px-5 pb-8 pt-14 text-emerald-50/70 sm:px-8 lg:px-12">
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">Fresh ideas meet fresh food</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Find the ingredients. Ask Chef Bems. Make something memorable.</h2></div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link to="/products" className="rounded-full bg-amber-300 px-7 py-3.5 text-center text-sm font-extrabold text-[#143c2d] transition hover:bg-white">Shop the catalogue</Link><Link to="/chef-chat" className="rounded-full border border-white/25 px-7 py-3.5 text-center text-sm font-extrabold text-white transition hover:bg-white/10">Open Chef Bems</Link></div>
          </div>

          <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_.75fr_.75fr_.9fr]">
            <div><img src={logo} alt="BemsFarms" className="h-10 w-auto brightness-0 invert" /><p className="mt-5 max-w-sm text-sm leading-7">Fresh Nigerian food, everyday kitchen essentials and practical meal inspiration in one welcoming marketplace.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">🌱 Fresh selection</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">🔒 Secure checkout</span></div></div>
            <div><h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Shop</h2><div className="mt-5 flex flex-col gap-3 text-sm"><Link to="/products" className="hover:text-white">All products</Link><a href="#categories" className="hover:text-white">Categories</a><a href="#featured-products" className="hover:text-white">Fresh picks</a><a href="#chef-bems" className="hover:text-white">Chef Bems</a></div></div>
            <div><h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Help</h2><div className="mt-5 flex flex-col gap-3 text-sm"><Link to="/track-order" className="hover:text-white">Track an order</Link><Link to="/contact" className="hover:text-white">Contact support</Link><Link to="/shipping" className="hover:text-white">Shipping & delivery</Link><Link to="/returns-policy" className="hover:text-white">Returns & refunds</Link></div></div>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Your account</h2>
              <p className="mt-5 text-sm leading-6">
                {isLoggedIn
                  ? "Manage your orders, profile and saved delivery details."
                  : "Keep delivery details, orders and preferences together."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {isLoggedIn ? (
                  <>
                    <Link to="/home" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">My account</Link>
                    <Link to="/orders" className="rounded-full bg-[#143c2d] border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#1a4e3b]">Orders</Link>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">Sign in</Link>
                    <Link to="/register" className="rounded-full bg-[#143c2d] border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#1a4e3b]">Join</Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-7 text-xs sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} BemsFarms Limited. All rights reserved.</p><p>Fresh food · Smart help · Easier shopping</p></div>
          <nav aria-label="Legal" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs"><Link to="/about" className="hover:text-white">About us</Link><Link to="/terms" className="hover:text-white">Terms & conditions</Link><Link to="/privacy" className="hover:text-white">Privacy policy</Link><Link to="/shipping" className="hover:text-white">Shipping policy</Link><Link to="/returns-policy" className="hover:text-white">Returns policy</Link></nav>
        </div>
      </footer>

      {/* Full Screen Store Catalogue Modal */}
      <AnimatePresence>
        {fullScreenModalOpen && (
          <FullScreenCatalogueModal
            isOpen={fullScreenModalOpen}
            onClose={() => setFullScreenModalOpen(false)}
            products={products}
            addedProducts={addedProducts}
            onAdd={handleAdd}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            onProceedToOrder={handleProceedToOrder}
            returnFocusRef={catalogueTriggerRef}
          />
        )}
      </AnimatePresence>

      {/* Sign In Required Modal when placing order */}
      <AnimatePresence>
        {loginPromptOpen && (
          <LoginPromptModal
            isOpen={loginPromptOpen}
            onClose={() => setLoginPromptOpen(false)}
            cartCount={cartCount}
            cartSubtotal={cartSubtotal}
            onLogin={() => navigate("/login", { state: { from: "/checkout" } })}
            onRegister={() => navigate("/register", { state: { from: "/checkout" } })}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification for Basket Actions */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
