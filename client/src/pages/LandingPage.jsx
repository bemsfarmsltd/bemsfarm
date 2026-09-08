import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getProductImage } from "../utils/productImages";
import logo from "../assets/bemsfarms_logo.png";

const categories = [
  { name: "Grains & Cereals", detail: "Rice and everyday pantry essentials.", image: "/hero_food_1.jpg" },
  { name: "Vegetables", detail: "Peppers, tomatoes and leafy greens.", image: "/hero_food_2.jpg" },
  { name: "Cooking Oils", detail: "Quality oils for familiar Nigerian meals.", image: "/hero_food_3.jpg" },
  { name: "Legumes", detail: "Beans and wholesome plant-based staples.", image: "/fresh_salad_hero.png" },
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
  { icon: "🚚", title: "Delivery choices", text: "Available options and fees are shown for your address at checkout." },
  { icon: "↩", title: "7-day returns", text: "Eligible delivered items can be submitted for return from your account." },
  { icon: "🔒", title: "Protected payment", text: "Complete your online payment securely through Monnify." },
  { icon: "✉", title: "Customer support", text: "Questions about shopping or an order? Email info@bemsfarms.com." },
];

const faqs = [
  { question: "Do I need an account to place an order?", answer: "Yes. Your account keeps your delivery details, orders and preferences together, making future purchases quicker." },
  { question: "Where does BemsFarms deliver?", answer: "Available delivery choices are shown during checkout based on your address. This keeps the options and fees accurate for each order." },
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

function HeroSlideBanner() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
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
      className="relative aspect-[4/4.6] overflow-hidden rounded-[2.5rem] bg-[#dfeade] shadow-2xl shadow-emerald-950/20 sm:rounded-[3.5rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
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
      <div className="absolute left-5 top-5 rounded-full border border-white/40 bg-white/90 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-900 shadow-lg backdrop-blur sm:left-7 sm:top-7">
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
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">{slide.eyebrow}</p>
          <p className="mt-0.5 truncate font-display text-base font-bold text-slate-900 sm:text-lg">{slide.heading}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-100 text-xl shadow-inner">
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
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
      <h2 className="font-display text-3xl font-bold leading-tight text-[#17352a] sm:text-4xl lg:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-base leading-7 text-slate-600">{text}</p>}
    </div>
  );
}

function StoreProductCard({ product, added, onAdd }) {
  const stock = Number(product.stock_quantity ?? product.stock ?? 0);
  const unavailable = stock <= 0 || product.available_for_sale === false;
  const price = Number(product.price || 0) * NAIRA_PER_UNIT;
  const rating = Math.min(5, Math.max(0, Number(product.avg_rating) || 0));
  const isBemsOriginal = Boolean(
    product.name?.toLowerCase().includes("bems") ||
    product.brand?.toLowerCase().includes("bems") ||
    product.is_bems_brand
  );

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#f5f4ee]" aria-label={`View ${product.name}`}>
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.is_featured && <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">Featured</span>}
        {isBemsOriginal && <span className="absolute right-3 top-3 rounded-full bg-[#143c2d]/90 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 shadow-md">★ Bems Original</span>}
        {unavailable && <span className="absolute inset-x-3 bottom-3 rounded-full bg-slate-900/85 px-3 py-2 text-center text-xs font-bold text-white">Currently unavailable</span>}
      </Link>
      <div className="p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">{product.category_name || "Farm produce"}</p>
        <h3 className="mt-1.5 min-h-[2.5rem] font-display text-base font-bold leading-5 text-[#17352a]"><Link to={`/product/${product.id}`} className="transition hover:text-orange-600">{product.name}</Link></h3>
        <p className="mt-1 truncate text-xs text-slate-500">{product.unit || "Per item"}</p>
        <div className="mt-2 flex min-h-4 items-center gap-1 text-[11px]">
          {Number(product.review_count) > 0 ? <><span className="text-orange-500" aria-label={`${rating.toFixed(1)} out of 5 stars`}><span aria-hidden="true">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span></span><span className="text-slate-400">({product.review_count})</span></> : <span className="text-slate-400">New to the shop</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-base font-extrabold text-slate-900">₦{price.toLocaleString("en-NG")}</p>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={unavailable}
            className={`h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold text-white transition ${added ? "bg-emerald-700" : "bg-orange-500 hover:bg-orange-600"} disabled:cursor-not-allowed disabled:bg-slate-300`}
            aria-label={`Add ${product.name} to basket`}
          >
            {added ? "✓ Added" : "+ Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: "Bems Premium Parboiled Rice (50kg)",
    price: 68000,
    unit: "50kg bag",
    category_name: "Grains & Cereals",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_1.jpg",
    stock: 50,
    avg_rating: 5,
    review_count: 24,
  },
  {
    id: 2,
    name: "Farm-Fresh Round Tomatoes",
    price: 4500,
    unit: "Big basket",
    category_name: "Vegetables",
    is_featured: true,
    image_url: "/hero_food_2.jpg",
    stock: 80,
    avg_rating: 4.8,
    review_count: 18,
  },
  {
    id: 3,
    name: "Bems Pure Cold-Pressed Palm Oil (5L)",
    price: 9500,
    unit: "5 Litres",
    category_name: "Cooking Oils",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_3.jpg",
    stock: 45,
    avg_rating: 5,
    review_count: 32,
  },
  {
    id: 4,
    name: "Bems Clean White Honey Beans (25kg)",
    price: 18500,
    unit: "25kg bag",
    category_name: "Legumes",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/fresh_salad_hero.png",
    stock: 60,
    avg_rating: 4.9,
    review_count: 15,
  },
  {
    id: 5,
    name: "Fresh Scotch Bonnet Peppers (Rodo)",
    price: 3200,
    unit: "Paint bucket",
    category_name: "Vegetables",
    is_featured: true,
    image_url: "/hero_food_2.jpg",
    stock: 35,
    avg_rating: 4.7,
    review_count: 12,
  },
  {
    id: 6,
    name: "Bems Premium Ofada Rice (10kg)",
    price: 24000,
    unit: "10kg bag",
    category_name: "Grains & Cereals",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_1.jpg",
    stock: 30,
    avg_rating: 5,
    review_count: 29,
  },
  {
    id: 7,
    name: "Giant Abuja White Yam",
    price: 6500,
    unit: "5 large tubers",
    category_name: "Tubers & Roots",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_4.jpg",
    stock: 40,
    avg_rating: 4.9,
    review_count: 21,
  },
  {
    id: 8,
    name: "Fresh Red Tatashe Bell Peppers",
    price: 4000,
    unit: "500g pack",
    category_name: "Vegetables",
    is_featured: false,
    image_url: "/hero_food_2.jpg",
    stock: 55,
    avg_rating: 4.8,
    review_count: 9,
  },
  {
    id: 9,
    name: "Bems Pure Refined Vegetable Oil (5L)",
    price: 11000,
    unit: "5 Litres",
    category_name: "Cooking Oils",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_3.jpg",
    stock: 40,
    avg_rating: 5,
    review_count: 19,
  },
  {
    id: 10,
    name: "Fresh Red Onions",
    price: 5500,
    unit: "10kg bag",
    category_name: "Vegetables",
    is_featured: false,
    image_url: "/hero_food_2.jpg",
    stock: 65,
    avg_rating: 4.7,
    review_count: 14,
  },
  {
    id: 11,
    name: "Bems White Garri Ijebu (Clean Sort)",
    price: 12500,
    unit: "25kg bag",
    category_name: "Grains & Cereals",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_1.jpg",
    stock: 75,
    avg_rating: 5,
    review_count: 36,
  },
  {
    id: 12,
    name: "Bems Sokoto Brown Sweet Beans",
    price: 19500,
    unit: "25kg bag",
    category_name: "Legumes",
    is_featured: false,
    is_bems_brand: true,
    image_url: "/fresh_salad_hero.png",
    stock: 50,
    avg_rating: 4.9,
    review_count: 16,
  },
  {
    id: 13,
    name: "Fresh Sweet Potatoes",
    price: 3500,
    unit: "Large basket",
    category_name: "Tubers & Roots",
    is_featured: false,
    image_url: "/hero_food_4.jpg",
    stock: 60,
    avg_rating: 4.8,
    review_count: 11,
  },
  {
    id: 14,
    name: "Fresh Green Leafy Spinach (Efo Tete)",
    price: 1200,
    unit: "3 bundles",
    category_name: "Vegetables",
    is_featured: false,
    image_url: "/fresh_salad_hero.png",
    stock: 40,
    avg_rating: 4.6,
    review_count: 8,
  },
  {
    id: 15,
    name: "Bems Golden Dried Maize Grain",
    price: 15000,
    unit: "25kg bag",
    category_name: "Grains & Cereals",
    is_featured: false,
    is_bems_brand: true,
    image_url: "/hero_food_1.jpg",
    stock: 35,
    avg_rating: 4.8,
    review_count: 13,
  },
  {
    id: 16,
    name: "Fresh Ginger & Garlic Basket Pack",
    price: 3800,
    unit: "1kg mixed pack",
    category_name: "Vegetables",
    is_featured: false,
    image_url: "/hero_food_2.jpg",
    stock: 45,
    avg_rating: 4.9,
    review_count: 17,
  },
  {
    id: 17,
    name: "Bems Traditional Palm Oil (25L Jerrycan)",
    price: 46000,
    unit: "25 Litres",
    category_name: "Cooking Oils",
    is_featured: true,
    is_bems_brand: true,
    image_url: "/hero_food_3.jpg",
    stock: 25,
    avg_rating: 5,
    review_count: 42,
  },
  {
    id: 18,
    name: "Crisp Fresh Cucumbers & Green Peppers",
    price: 2500,
    unit: "Mixed pack (12 pcs)",
    category_name: "Vegetables",
    is_featured: false,
    image_url: "/fresh_salad_hero.png",
    stock: 50,
    avg_rating: 4.7,
    review_count: 10,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addToCart, cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [catalogueView, setCatalogueView] = useState("all");
  const [addedProducts, setAddedProducts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (isLoggedIn) navigate("/home", { replace: true });
  }, [isLoggedIn, navigate]);

  // Reset to page 1 when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [catalogueView, appliedSearch]);

  const loadProducts = async (term = "") => {
    setProductsLoading(true);
    setProductsError("");
    setAppliedSearch(term);
    try {
      const response = await api.get("/products", { params: { search: term || undefined, limit: 24 } });
      if (response.data?.products && Array.isArray(response.data.products) && response.data.products.length > 0) {
        setProducts(response.data.products);
      } else {
        const query = term.toLowerCase().trim();
        const fallback = query
          ? FALLBACK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query) || p.category_name.toLowerCase().includes(query))
          : FALLBACK_PRODUCTS;
        setProducts(fallback);
      }
    } catch {
      // Graceful fallback to default catalogue products so the store stays functional
      const query = term.toLowerCase().trim();
      const fallback = query
        ? FALLBACK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query) || p.category_name.toLowerCase().includes(query))
        : FALLBACK_PRODUCTS;
      setProducts(fallback);
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
    addToCart(product);
    setAddedProducts((current) => ({ ...current, [product.id]: true }));
    window.setTimeout(() => setAddedProducts((current) => ({ ...current, [product.id]: false })), 1200);
  };

  const displayedProducts = [...products]
    .filter((product) => {
      if (catalogueView === "bems_originals") {
        return (
          product.name?.toLowerCase().includes("bems") ||
          product.brand?.toLowerCase().includes("bems") ||
          product.is_bems_brand
        );
      }
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
    <div className="min-h-screen overflow-x-hidden bg-[#fffdf8] text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">Skip to main content</a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-950/5 bg-[#fffdf8]/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Main navigation">
          <Link to="/" className="shrink-0" aria-label="BemsFarms home" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="BemsFarms" className="h-10 w-auto" />
          </Link>
          <div className="hidden items-center gap-6 xl:flex">
            <a href="#featured-products" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Shop Products</a>
            <a href="#categories" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Categories</a>
            <a href="#our-brand" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Our Brand</a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">How it works</a>
            <Link to="/track-order" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Track order</Link>
            <a href="#chef-bems" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Chef Bems</a>
            <a href="#faq" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">FAQs</a>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/cart" className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-lg" aria-label={`Basket with ${cartCount} items`}>
              <span aria-hidden="true">🛒</span>
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold text-white">{cartCount}</span>}
            </Link>
            <Link to="/login" className="rounded-full px-5 py-2.5 text-sm font-extrabold text-emerald-900 transition hover:bg-emerald-50">Sign in</Link>
            <Link to="/register" className="rounded-full bg-[#1d6b45] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#155637]">Create account</Link>
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-xl xl:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Toggle navigation menu">{menuOpen ? "×" : "☰"}</button>
        </nav>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-slate-100 bg-white px-5 pb-6 pt-4 shadow-xl xl:hidden">
              <div className="flex flex-col gap-1">
                {[['#featured-products', 'Shop products'], ['#categories', 'Categories'], ['#our-brand', 'Our Brand'], ['#how-it-works', 'How it works'], ['#chef-bems', 'Chef Bems'], ['#faq', 'FAQs']].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50">{label}</a>)}
                <Link to="/track-order" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50">Track an order</Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3"><Link to="/login" className="rounded-full border border-emerald-800 px-4 py-3 text-center text-sm font-extrabold text-emerald-900">Sign in</Link><Link to="/register" className="rounded-full bg-[#1d6b45] px-4 py-3 text-center text-sm font-extrabold text-white">Join now</Link></div>
              <Link to="/cart" className="mt-3 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"><span>🛒 View basket</span><span>{cartCount} {cartCount === 1 ? "item" : "items"}</span></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:min-h-[760px] lg:px-12 lg:pb-24 lg:pt-36">
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800 shadow-sm"><span className="h-2 w-2 rounded-full bg-orange-500" /> Direct from Bems Farms & Processing</div>
              <h1 className="font-display text-[clamp(2.75rem,6.5vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.055em] text-[#143c2d]">Fresh harvests, <span className="text-[#d86d20]">our own brand.</span></h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600 lg:mx-0">Shop Bems Farms’ signature packaged staples, pure cooking oils and freshly harvested produce alongside everyday kitchen essentials—cultivated with care and paired with Chef Bems.</p>
              
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/products" className="rounded-full bg-[#1d6b45] px-8 py-4 text-center text-base font-extrabold text-white shadow-xl shadow-emerald-900/20 transition hover:-translate-y-1 hover:bg-[#155637]">Start shopping <span aria-hidden="true">→</span></Link>
                <a href="#how-it-works" className="rounded-full border border-slate-300 bg-white/80 px-8 py-4 text-center text-base font-extrabold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800">See how it works</a>
              </div>
              <div className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-bold text-slate-600 lg:justify-start">
                <span>✓ Bems Farms Brand Originals</span>
                <span>✓ Direct Farm Quality</span>
                <span>✓ Fast & Reliable Delivery</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.12 }} className="relative mx-auto w-full max-w-[580px]">
              <HeroSlideBanner />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-emerald-900/10 bg-[#143c2d] px-5 py-7 text-white sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[['Our Farm', 'branded products'], ['Fresh', 'harvest selections'], ['Helpful', 'meal inspiration'], ['Simple', 'order tracking']].map(([lead, text]) => (
              <div key={lead}>
                <p className="font-display text-xl font-bold text-amber-300 sm:text-2xl">{lead}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-100/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── OUR BRAND SPOTLIGHT ── */}
        <section id="our-brand" className="scroll-mt-24 bg-[#faf8f2] px-5 py-16 sm:px-8 lg:px-12 lg:py-20 border-b border-emerald-900/10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-orange-700">The Bems Farms Difference</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-[#143c2d] sm:text-4xl">Our Own Products. Straight from Our Farm to Your Kitchen.</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">Unlike ordinary markets, Bems Farms cultivates, sorts, and packages our own line of signature food staples and crops. Every bag of grains, bottle of oil, and fresh harvest is inspected for supreme quality and natural taste.</p>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="text-xl">🌾</p>
                    <h3 className="mt-2 font-display text-base font-bold text-[#17352a]">In-House Packaged</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Carefully sorted, stone-free grains and pure culinary oils.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="text-xl">🚜</p>
                    <h3 className="mt-2 font-display text-base font-bold text-[#17352a]">Harvested Daily</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Crops harvested at peak freshness with zero artificial tampering.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-900/10 bg-[#143c2d] p-7 text-white shadow-xl sm:p-9">
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">Bems Guarantee</p>
                <h3 className="mt-2 font-display text-2xl font-bold">Look for the “Bems Original” Badge</h3>
                <p className="mt-3 text-sm leading-6 text-emerald-100/80">When browsing our catalogue, look out for items marked with the <span className="font-bold text-amber-300">★ Bems Original</span> badge—our promise of direct farm origin, honest weighing, and premium quality.</p>
                <div className="mt-6">
                  <a href="#featured-products" onClick={() => setCatalogueView("bems_originals")} className="inline-flex rounded-full bg-amber-300 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-emerald-950 transition hover:bg-white">View Bems Originals →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATALOGUE WITH PROMINENT SEARCH ── */}
        <section id="featured-products" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading align="left" eyebrow="Shop the farm" title={appliedSearch ? `Results for “${appliedSearch}”` : "Fresh picks for your basket"} text="Explore our in-house brand items and full catalogue with live stock and prices." />
              
              {/* Search Bar right inside Catalogue section */}
              <form onSubmit={handleSearch} className="flex w-full max-w-md items-center rounded-full border border-slate-300 bg-[#faf8f2] p-1.5 shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
                <label htmlFor="catalogue-search" className="sr-only">Search products</label>
                <span className="ml-3 text-slate-400" aria-hidden="true">🔍</span>
                <input
                  id="catalogue-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search rice, oils, peppers, Bems items…"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
                />
                <button type="submit" className="rounded-full bg-[#143c2d] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1a4e3b]">
                  Search
                </button>
              </form>
            </div>

            {/* Filter Tabs */}
            <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => { setCatalogueView("all"); if (appliedSearch) { setSearch(""); loadProducts(); } }}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "all" && !appliedSearch ? "bg-[#17352a] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                All Products
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("bems_originals")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "bems_originals" ? "bg-emerald-800 text-amber-300 ring-2 ring-amber-400/40" : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}
              >
                ★ Bems Originals
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("featured")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "featured" ? "bg-[#17352a] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                Featured
              </button>
              <button
                type="button"
                onClick={() => setCatalogueView("newest")}
                className={`rounded-full px-5 py-2 text-xs font-extrabold transition ${catalogueView === "newest" ? "bg-[#17352a] text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                New Arrivals
              </button>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); loadProducts(); }}
                  className="ml-auto rounded-full border border-orange-300 bg-orange-50 px-4 py-1.5 text-xs font-extrabold text-orange-800 hover:bg-orange-100"
                >
                  Clear search ({appliedSearch}) ✕
                </button>
              )}
            </div>

            {productsLoading && <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><div className="aspect-[4/3] animate-pulse bg-slate-100" /><div className="space-y-3 p-4"><div className="h-3 w-20 animate-pulse rounded bg-slate-100" /><div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-9 animate-pulse rounded bg-slate-100" /></div></div>)}</div>}

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

            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#f3f0e6] px-6 py-5 sm:flex-row">
              <p className="text-center text-sm font-bold text-slate-700 sm:text-left">Your basket is saved while you create an account.</p>
              <div className="flex flex-wrap items-center justify-center gap-3"><span className="text-sm font-extrabold text-emerald-800">{cartCount} {cartCount === 1 ? "item" : "items"}</span><Link to="/products" className="rounded-full border border-emerald-900 px-5 py-2.5 text-sm font-extrabold text-emerald-900">View full catalogue</Link><Link to={cartCount ? "/cart" : "/register"} className="rounded-full bg-[#17352a] px-5 py-2.5 text-sm font-extrabold text-white">{cartCount ? "View basket" : "Create account"}</Link></div>
            </div>
          </div>
        </section>

        <section id="categories" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Explore the pantry" title="Shop by category" text="Jump into the part of the market you need and discover useful choices for the way you cook." /><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category, index) => <motion.article key={category.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.06 }} className="group overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><Link to={`/products?category=${encodeURIComponent(category.name)}`} className="block"><div className="h-56 overflow-hidden"><img src={category.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></div><div className="p-6"><h3 className="font-display text-xl font-bold text-[#17352a]">{category.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{category.detail}</p><span className="mt-5 inline-flex text-sm font-extrabold text-emerald-700 group-hover:text-orange-700">Explore category <span className="ml-2" aria-hidden="true">→</span></span></div></Link></motion.article>)}</div><div className="mt-9 text-center"><Link to="/products" className="inline-flex rounded-full border border-emerald-900 px-6 py-3 text-sm font-extrabold text-emerald-900 transition hover:bg-emerald-900 hover:text-white">Browse every category →</Link></div></div></section>

        <section aria-labelledby="shopping-details-title" className="border-y border-emerald-900/10 bg-white px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Shop with clarity</p><h2 id="shopping-details-title" className="mt-2 font-display text-2xl font-bold text-[#17352a] sm:text-3xl">Know what happens after you add to basket</h2></div>
              <a href="mailto:info@bemsfarms.com" className="text-sm font-extrabold text-orange-700 hover:text-orange-800">Contact support →</a>
            </div>
            <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              {shoppingDetails.map((item) => <article key={item.title} className="bg-[#fffdf8] p-6"><span className="text-2xl" aria-hidden="true">{item.icon}</span><h3 className="mt-4 font-display text-lg font-bold text-[#17352a]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-[#f3f0e6] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="A smarter shopping journey" title="From meal idea to doorstep" text="Shop at your own pace, with Chef Bems ready to help when you need inspiration." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => <article key={step.number} className={`relative overflow-hidden rounded-3xl p-6 shadow-sm ${step.accent ? "bg-[#143c2d] text-white" : "bg-white"}`}>
                {step.accent && <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />}
                <div className="relative flex items-center justify-between"><p className={`font-display text-3xl font-bold ${step.accent ? "text-amber-300" : "text-orange-500"}`}>{step.number}</p><span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg ${step.accent ? "bg-white/10" : "bg-emerald-50 text-emerald-800"}`} aria-hidden="true">{step.icon}</span></div>
                <h3 className={`relative mt-8 font-display text-xl font-bold ${step.accent ? "text-white" : "text-[#17352a]"}`}>{step.title}</h3>
                <p className={`relative mt-3 text-sm leading-6 ${step.accent ? "text-emerald-50/75" : "text-slate-600"}`}>{step.text}</p>
                {step.accent && <Link to="/register" className="relative mt-5 inline-flex text-xs font-extrabold text-amber-300 hover:text-white">Meet Chef Bems →</Link>}
              </article>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center"><div className="relative"><img src="/jollof_rice_hero.png" alt="Jollof rice served with grilled chicken and plantain" className="aspect-square w-full rounded-[2.5rem] object-cover shadow-xl" loading="lazy" /><div className="absolute -bottom-5 right-5 max-w-[240px] rounded-2xl bg-orange-500 p-5 text-white shadow-xl sm:right-8"><p className="font-display text-xl font-bold">Made for the meals you love.</p></div></div><div><SectionHeading align="left" eyebrow="Why BemsFarms" title="More confidence in every basket" text="A thoughtful shopping experience that helps you move from food inspiration to a completed order without confusion." /><div className="mt-9 grid gap-5 sm:grid-cols-2">{promises.map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-800">{item.icon}</span><h3 className="mt-4 font-display text-lg font-bold text-[#17352a]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}</div></div></div></section>

        <section id="chef-bems" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#143c2d] px-6 py-12 text-white sm:px-10 lg:px-16 lg:py-16">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">Your food companion</p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">Meet Chef Bems</h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/75">Need meal inspiration or help building a useful shopping list? Chef Bems connects your cooking ideas with ingredients you can find in the store.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2"><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🍲 Meal and recipe ideas</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🛒 Smarter shopping lists</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">🥕 Ingredient alternatives</p><p className="rounded-2xl bg-white/10 p-4 text-sm font-bold">💬 Conversational guidance</p></div>
                <Link to="/register" className="mt-9 inline-flex rounded-full bg-amber-300 px-7 py-3.5 text-sm font-extrabold text-emerald-950 transition hover:bg-white">Join to meet Chef Bems</Link>
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
                <div className="absolute -bottom-4 -left-3 rounded-2xl border border-white/20 bg-white/95 p-4 text-slate-900 shadow-xl"><p className="text-xs font-bold text-slate-500">Try asking</p><p className="mt-1 text-sm font-extrabold">“What can I cook tonight?”</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28" aria-labelledby="track-delivery-title">
          <div className="mx-auto grid max-w-7xl gap-7 overflow-hidden rounded-[2rem] bg-[#edf5ed] p-6 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-10">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-700">Already ordered?</p><h2 id="track-delivery-title" className="mt-2 font-display text-2xl font-bold text-[#17352a] sm:text-3xl">Track your delivery</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use the order reference from your confirmation. No login is required.</p></div>
            <form onSubmit={handleTracking} className="flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-lg shadow-emerald-950/5 sm:flex-row">
              <label htmlFor="landing-tracking-code" className="sr-only">Delivery code</label>
              <input id="landing-tracking-code" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="Delivery code, e.g. BF-ABC12345" autoComplete="off" spellCheck="false" className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-5 py-4 font-mono text-sm font-bold uppercase tracking-wide outline-none ring-emerald-600 transition focus:ring-2" />
              <button type="submit" className="rounded-2xl bg-[#17352a] px-7 py-4 text-sm font-extrabold text-white transition hover:bg-emerald-700">Track delivery →</button>
            </form>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.8fr_1.2fr]"><SectionHeading align="left" eyebrow="Good to know" title="Questions before your first order?" text="Here are quick answers to the things new customers usually want to understand." /><div className="divide-y divide-slate-200 border-y border-slate-200">{faqs.map((item, index) => { const isOpen = openFaq === index; return <div key={item.question}><button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} className="flex w-full items-center justify-between gap-6 py-6 text-left" aria-expanded={isOpen}><span className="font-display text-lg font-bold text-[#17352a]">{item.question}</span><span className="text-2xl text-emerald-700" aria-hidden="true">{isOpen ? "−" : "+"}</span></button><AnimatePresence initial={false}>{isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="pb-6 pr-10 text-sm leading-7 text-slate-600">{item.answer}</p></motion.div>}</AnimatePresence></div>; })}</div></div></section>

        <section className="px-5 py-20 sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-orange-100 px-6 py-12 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16"><div className="max-w-xl"><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-orange-700">Harvest notes</p><h2 className="mt-3 font-display text-3xl font-bold text-[#17352a] sm:text-4xl">Fresh updates for your inbox</h2><p className="mt-3 text-sm leading-6 text-slate-600">Receive product news, seasonal ideas and practical inspiration from BemsFarms.</p></div><form onSubmit={handleSubscribe} className="mt-8 w-full max-w-xl lg:mt-0"><div className="flex flex-col gap-3 sm:flex-row"><label htmlFor="newsletter-email" className="sr-only">Email address</label><input id="newsletter-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" className="min-w-0 flex-1 rounded-full border border-orange-200 bg-white px-6 py-4 text-sm outline-none ring-emerald-600 transition focus:ring-2" /><button type="submit" disabled={subscribeState === "loading"} className="rounded-full bg-[#17352a] px-7 py-4 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{subscribeState === "loading" ? "Joining…" : "Keep me updated"}</button></div>{subscribeMessage && <p role="status" className={`mt-3 text-sm font-bold ${subscribeState === "error" ? "text-red-700" : "text-emerald-800"}`}>{subscribeMessage}</p>}</form></div></section>

        <section className="px-5 pb-20 pt-8 text-center sm:px-8 lg:px-12 lg:pb-28"><div className="mx-auto max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700">Ready when you are</p><h2 className="mt-4 font-display text-4xl font-bold leading-tight text-[#17352a] sm:text-5xl">Bring something fresh to the table.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">Create your BemsFarms account and start building a basket that fits your kitchen.</p><Link to="/register" className="mt-8 inline-flex rounded-full bg-[#1d6b45] px-9 py-4 text-base font-extrabold text-white shadow-xl shadow-emerald-900/15 transition hover:-translate-y-1 hover:bg-[#155637]">Create your account <span className="ml-2" aria-hidden="true">→</span></Link></div></section>
      </main>

      <footer className="relative overflow-hidden bg-[#0b281e] px-5 pb-8 pt-14 text-emerald-50/70 sm:px-8 lg:px-12">
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">Fresh ideas meet fresh food</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Find the ingredients. Ask Chef Bems. Make something memorable.</h2></div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link to="/products" className="rounded-full bg-amber-300 px-7 py-3.5 text-center text-sm font-extrabold text-emerald-950 transition hover:bg-white">Shop the catalogue</Link><Link to="/register" className="rounded-full border border-white/25 px-7 py-3.5 text-center text-sm font-extrabold text-white transition hover:bg-white/10">Meet Chef Bems</Link></div>
          </div>

          <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_.75fr_.75fr_.9fr]">
            <div><img src={logo} alt="BemsFarms" className="h-10 w-auto brightness-0 invert" /><p className="mt-5 max-w-sm text-sm leading-7">Fresh Nigerian food, everyday kitchen essentials and practical meal inspiration in one welcoming marketplace.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">🌱 Fresh selection</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs">🔒 Secure checkout</span></div></div>
            <div><h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Shop</h2><div className="mt-5 flex flex-col gap-3 text-sm"><Link to="/products" className="hover:text-white">All products</Link><a href="#categories" className="hover:text-white">Categories</a><a href="#featured-products" className="hover:text-white">Fresh picks</a><a href="#chef-bems" className="hover:text-white">Chef Bems</a></div></div>
            <div><h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Help</h2><div className="mt-5 flex flex-col gap-3 text-sm"><Link to="/track-order" className="hover:text-white">Track an order</Link><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#faq" className="hover:text-white">FAQs</a><a href="mailto:info@bemsfarms.com" className="hover:text-white">Contact support</a></div></div>
            <div><h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Your account</h2><p className="mt-5 text-sm leading-6">Keep delivery details, orders and preferences together.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">Sign in</Link><Link to="/register" className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-600">Join</Link></div></div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-7 text-xs sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} BemsFarms Limited. All rights reserved.</p><p>Fresh food · Smart help · Easier shopping</p></div>
        </div>
      </footer>
    </div>
  );
}
