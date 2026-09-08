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

export default function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addToCart, cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [catalogueView, setCatalogueView] = useState("featured");
  const [addedProducts, setAddedProducts] = useState({});

  useEffect(() => {
    if (isLoggedIn) navigate("/home", { replace: true });
  }, [isLoggedIn, navigate]);

  const loadProducts = async (term = "") => {
    setProductsLoading(true);
    setProductsError("");
    setAppliedSearch(term);
    try {
      const response = await api.get("/products", { params: { search: term || undefined, limit: 12 } });
      setProducts(response.data.products || []);
    } catch {
      setProductsError("The live catalogue is taking a little longer to load.");
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

  const displayedProducts = [...products].sort((a, b) => {
    if (catalogueView === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
  });

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
            <a href="#featured-products" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Shop</a>
            <a href="#categories" className="text-sm font-bold text-slate-600 transition hover:text-emerald-800">Categories</a>
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
                {[['#featured-products', 'Shop products'], ['#categories', 'Categories'], ['#how-it-works', 'How it works'], ['#chef-bems', 'Chef Bems'], ['#faq', 'FAQs']].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50">{label}</a>)}
                <Link to="/track-order" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50">Track an order</Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3"><Link to="/login" className="rounded-full border border-emerald-800 px-4 py-3 text-center text-sm font-extrabold text-emerald-900">Sign in</Link><Link to="/register" className="rounded-full bg-[#1d6b45] px-4 py-3 text-center text-sm font-extrabold text-white">Join now</Link></div>
              <Link to="/cart" className="mt-3 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-800"><span>🛒 View basket</span><span>{cartCount} {cartCount === 1 ? "item" : "items"}</span></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:min-h-[800px] lg:px-12 lg:pb-28 lg:pt-40">
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="text-center lg:text-left">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800 shadow-sm"><span className="h-2 w-2 rounded-full bg-orange-500" /> Fresh food, thoughtfully sourced</div>
              <h1 className="font-display text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.93] tracking-[-0.055em] text-[#143c2d]">Good food starts <span className="text-[#d86d20]">closer to the farm.</span></h1>
              <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-slate-600 lg:mx-0">Shop fresh Nigerian produce, pantry staples and everyday kitchen essentials in one welcoming place—supported by smart meal ideas from Chef Bems.</p>
              <form onSubmit={handleSearch} className="mx-auto mt-7 flex max-w-xl items-center rounded-full border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 lg:mx-0">
                <label htmlFor="landing-search" className="sr-only">Search the BemsFarms catalogue</label>
                <span className="ml-3 text-lg" aria-hidden="true">⌕</span>
                <input id="landing-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rice, beans, vegetables…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400" />
                <button type="submit" className="rounded-full bg-orange-500 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-orange-600">Search</button>
              </form>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"><Link to="/products" className="rounded-full bg-[#1d6b45] px-8 py-4 text-center text-base font-extrabold text-white shadow-xl shadow-emerald-900/20 transition hover:-translate-y-1 hover:bg-[#155637]">Start shopping <span aria-hidden="true">→</span></Link><a href="#how-it-works" className="rounded-full border border-slate-300 bg-white/80 px-8 py-4 text-center text-base font-extrabold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800">See how it works</a></div>
              <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-bold text-slate-600 lg:justify-start"><span>✓ Fresh selection</span><span>✓ Flexible delivery</span><span>✓ Secure checkout</span></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.12 }} className="relative mx-auto w-full max-w-[610px]">
              <div className="relative aspect-[4/4.6] overflow-hidden rounded-[2.5rem] bg-[#dfeade] shadow-2xl shadow-emerald-950/15 sm:rounded-[3.5rem]"><img src="/hero_food_2.jpg" alt="A colourful selection of fresh Nigerian vegetables and ingredients" className="h-full w-full object-cover" fetchPriority="high" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-950/45 to-transparent" /><div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/30 bg-white/90 p-4 shadow-lg backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:w-[290px]"><div><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">From basket to table</p><p className="mt-1 font-display text-lg font-bold text-slate-900">Fresh choices, less stress.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-100 text-xl">🌱</span></div></div>
              <div className="absolute -right-3 top-10 hidden rounded-2xl border border-white bg-[#fff9ed] p-4 shadow-xl sm:block lg:-right-10"><p className="text-2xl">🥬</p><p className="mt-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">Seasonal picks</p></div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-emerald-900/10 bg-[#143c2d] px-5 py-7 text-white sm:px-8 lg:px-12"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 text-center md:grid-cols-4">{[['Fresh', 'produce selections'], ['Easy', 'online ordering'], ['Helpful', 'meal inspiration'], ['Simple', 'order tracking']].map(([lead, text]) => <div key={lead}><p className="font-display text-xl font-bold text-amber-300 sm:text-2xl">{lead}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-100/70">{text}</p></div>)}</div></section>

        <section id="featured-products" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading align="left" eyebrow="Shop the farm" title={appliedSearch ? `Results for “${appliedSearch}”` : "Fresh picks for your basket"} text="Real products and current prices from the BemsFarms catalogue." />
              <div className="flex flex-wrap gap-2">
                {!appliedSearch && <><button type="button" onClick={() => setCatalogueView("featured")} className={`rounded-full px-5 py-2.5 text-sm font-extrabold ${catalogueView === "featured" ? "bg-[#17352a] text-white" : "border border-slate-300 text-slate-700"}`}>Featured</button><button type="button" onClick={() => setCatalogueView("newest")} className={`rounded-full px-5 py-2.5 text-sm font-extrabold ${catalogueView === "newest" ? "bg-[#17352a] text-white" : "border border-slate-300 text-slate-700"}`}>New arrivals</button></>}
                {appliedSearch && <button type="button" onClick={() => { setSearch(""); loadProducts(); }} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-extrabold text-slate-700 hover:border-emerald-700 hover:text-emerald-800">Clear search</button>}
              </div>
            </div>

            {productsLoading && <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><div className="aspect-[4/3] animate-pulse bg-slate-100" /><div className="space-y-3 p-4"><div className="h-3 w-20 animate-pulse rounded bg-slate-100" /><div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" /><div className="h-9 animate-pulse rounded bg-slate-100" /></div></div>)}</div>}

            {!productsLoading && productsError && <div role="alert" className="mt-10 flex flex-col items-center rounded-3xl border border-orange-200 bg-orange-50 px-6 py-10 text-center"><p className="font-display text-xl font-bold text-slate-900">{productsError}</p><button type="button" onClick={() => loadProducts(search)} className="mt-4 rounded-full bg-[#17352a] px-6 py-3 text-sm font-extrabold text-white">Try again</button></div>}

            {!productsLoading && !productsError && products.length === 0 && <div role="status" className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center"><p className="font-display text-xl font-bold text-slate-900">No products matched that search.</p><p className="mt-2 text-sm text-slate-600">Try a broader ingredient or browse the categories below.</p></div>}

            {!productsLoading && !productsError && products.length > 0 && <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 xl:gap-4">{displayedProducts.map((product) => <StoreProductCard key={product.id} product={product} added={Boolean(addedProducts[product.id])} onAdd={handleAdd} />)}</div>}

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
