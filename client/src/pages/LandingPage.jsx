import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/bemsfarms_logo.png";

// Actual product images from Cloudinary / database
const PROD_GRAINS = "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg";
const PROD_VEG = "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg";
const PROD_OIL = "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg";

// Live feed products list for float animation
const LIVE_PRODUCTS = [
  { name: "Ofada Grains", emoji: "🌾", category: "Grains" },
  { name: "Fresh Ugu", emoji: "🥬", category: "Vegetables" },
  { name: "Oloyin Beans", emoji: "🟤", category: "Legumes" },
  { name: "Red Tomatoes", emoji: "🍅", category: "Produce" },
  { name: "Zomi Palm Oil", emoji: "🛢️", category: "Oils" },
  { name: "Dried Crayfish", emoji: "🦐", category: "Seafood" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);

  // Auto-redirect if user is logged in
  if (isAuthenticated) {
    navigate("/home");
  }

  // Handle newsletter signup
  const handleSubscribe = (e) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput("");
    }
  };

  // Rotate feed items index
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % LIVE_PRODUCTS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans antialiased overflow-x-hidden">
      
      {/* ────────────────── NAVBAR ────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        {/* Brand Logo only (text removed) */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/launch")}>
          <img
            src={logo}
            alt="BemsFarms Logo"
            className="h-10 w-auto"
          />
        </div>

        {/* Action Buttons (Menu Links Removed) */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="text-[14px] font-bold text-gray-700 hover:text-primary-dark transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-primary hover:bg-primary-dark text-white text-[14px] font-bold px-5 py-2.5 rounded-full transition-all shadow-sm duration-200"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ────────────────── HERO SECTION ────────────────── */}
      <section className="relative pt-32 pb-0 md:pt-40 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-start">
            <span className="text-primary font-bold tracking-wider text-[13px] uppercase bg-primary/10 px-4 py-1.5 rounded-full mb-5 mx-auto lg:mx-0">
              🌿 100% Healthy & Tasty
            </span>
            <h1 className="font-serif text-[42px] md:text-[62px] lg:text-[70px] leading-[1.08] font-bold text-primary-dark mb-6 tracking-tight text-center lg:text-left w-full">
              Farm Fresh <span className="text-primary font-sans font-semibold">Nigerian Foods</span>
            </h1>
            <p className="text-gray-500 text-[16px] md:text-[18px] leading-relaxed max-w-lg mb-8 font-medium text-center lg:text-left mx-auto lg:mx-0">
              A farm-fresh community marketplace designed to help you source fresh, premium local groceries directly from Nigerian farms. Healthy, tasty, and 100% certified.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
              <button
                onClick={() => navigate("/register")}
                className="bg-accent hover:bg-accent-light text-white font-bold text-[15px] px-8 py-3.5 rounded-full shadow-lg shadow-accent/25 transition-all duration-200"
              >
                How to Order
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-800/80 font-bold text-[15px] px-8 py-3.5 rounded-full transition-all duration-200"
              >
                Get Sale
              </button>
            </div>

            {/* Testimonial card replaced with Food Product Rotation Animation */}
            <div className="mt-12 w-full max-w-sm mx-auto lg:mx-0 h-[80px] relative overflow-hidden bg-white/80 backdrop-blur-md border border-gray-100 px-5 py-3.5 rounded-2xl shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={feedIndex}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 w-full"
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-2xl shadow-inner">
                      {LIVE_PRODUCTS[feedIndex].emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
                        Live Fresh Dispatch
                      </div>
                      <div className="text-[14px] font-extrabold text-gray-800 truncate">
                        {LIVE_PRODUCTS[feedIndex].name}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        Category: {LIVE_PRODUCTS[feedIndex].category}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping shrink-0 ml-2" />
            </div>
          </div>

          {/* Hero Right Visuals */}
          <div className="lg:col-span-6 flex justify-center items-center relative py-8">
            <div className="absolute w-[320px] h-[320px] md:w-[480px] md:h-[480px] rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 -z-10 blur-xl animate-pulse" />
            
            {/* Salad Dish circular image container */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[280px] h-[280px] md:w-[430px] md:h-[430px] rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white"
            >
              <img
                src="/fresh_salad_hero.png"
                alt="Fresh organic food plate"
                className="w-full h-full object-cover scale-[1.05]"
              />
            </motion.div>

            {/* Floating Stars card */}
            <div className="absolute bottom-6 right-6 md:right-12 bg-white px-5 py-2.5 rounded-full shadow-lg border border-gray-50 flex items-center gap-1">
              <span className="text-[14px] font-bold text-gray-700 mr-1">5.0</span>
              <div className="flex text-accent text-[13px]">★★★★★</div>
            </div>
          </div>
        </div>

        {/* ── CURVED WAVE AND FEATURES BANNER ── */}
        <div className="relative mt-16 lg:mt-24">
          <svg className="w-full h-auto translate-y-1 block" viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100 C 480 30, 960 30, 1440 100 Z" fill="#2E7D32" />
          </svg>

          {/* Green Features Section (Stats Counters Removed) */}
          <div className="bg-primary text-white py-12 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
              {/* Features inline row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center text-xl mb-3">🚚</div>
                  <h3 className="font-bold text-[16px] mb-1">Fast Delivery</h3>
                  <p className="text-primary-light text-[13px]">Receive order within 2-4 hours locally</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center text-xl mb-3">🥗</div>
                  <h3 className="font-bold text-[16px] mb-1">Fresh Food</h3>
                  <p className="text-primary-light text-[13px]">Directly from farm to your kitchen</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center text-xl mb-3">📦</div>
                  <h3 className="font-bold text-[16px] mb-1">Pick up</h3>
                  <p className="text-primary-light text-[13px]">Convenient pick-up points or doorstep delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── CATEGORIES SECTION ────────────────── */}
      <section id="categories" className="py-20 md:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="text-center mb-16">
            <span className="text-[12px] font-bold tracking-widest text-primary uppercase">What We Offer</span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-3">Our Best Categories</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Card 1 - Grains & Cereals */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-full h-44 rounded-xl overflow-hidden mb-5">
                <img src={PROD_GRAINS} alt="Grains & Cereals" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-800 mb-2">Grains & Cereals</h3>
              <p className="text-gray-500 text-[13px] mb-4">Premium Ofada rice, long-grain basmati, locally farmed millet and guinea corn.</p>
              <button 
                onClick={() => navigate("/login")}
                className="bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[13px] py-2 px-6 rounded-full transition-colors duration-200"
              >
                Order Now
              </button>
            </div>

            {/* Category Card 2 - Vegetables */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-full h-44 rounded-xl overflow-hidden mb-5">
                <img src={PROD_VEG} alt="Vegetables" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-800 mb-2">Vegetables</h3>
              <p className="text-gray-500 text-[13px] mb-4">Fresh organic ugu leaves, ripe red tomatoes, habanero peppers, and fresh greens.</p>
              <button 
                onClick={() => navigate("/login")}
                className="bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[13px] py-2 px-6 rounded-full transition-colors duration-200"
              >
                Order Now
              </button>
            </div>

            {/* Category Card 3 - Oils & Fats */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
              <div className="w-full h-44 rounded-xl overflow-hidden mb-5">
                <img src={PROD_OIL} alt="Oils & Fats" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-800 mb-2">Oils & Fats</h3>
              <p className="text-gray-500 text-[13px] mb-4">Locally pressed red palm oil and refined groundnut oil directly from our millers.</p>
              <button 
                onClick={() => navigate("/login")}
                className="bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[13px] py-2 px-6 rounded-full transition-colors duration-200"
              >
                Order Now
              </button>
            </div>

            {/* Category Card 4: Others Green banner */}
            <div className="bg-primary rounded-2xl p-6 text-white flex flex-col justify-between items-center text-center shadow-md">
              <div className="my-auto py-4">
                <div className="text-4xl mb-4">🍎🌾🥔</div>
                <h3 className="font-serif text-xl font-bold mb-3">Other Categories</h3>
                <p className="text-primary-light text-[13px] leading-relaxed mb-6">
                  Explore Grains, Legumes, Tubers, Local Spices, Oils and more from our farmers.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-white hover:bg-accent text-gray-800 hover:text-white font-bold text-[14px] py-3 rounded-full transition-colors duration-200"
              >
                See Others →
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── "WE ARE HERE FOR YOU" SECTION ────────────────── */}
      <section id="about" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Text details */}
          <div className="lg:col-span-6">
            <span className="text-[12px] font-bold tracking-widest text-primary uppercase">Our Commitment</span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-6 leading-tight">
              We are here for <span className="text-primary">You</span>
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed text-[15px] mb-8">
              At BemsFarms, we bridge the gap between hard-working Nigerian farmers and families across the country. Our focus is ensuring you receive high-quality, fresh produce at fair pricing with complete tracking and transparency.
            </p>

            <ul className="space-y-4">
              <li className="flex items-center gap-3 font-semibold text-gray-700 text-[14px]">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
                Best service and fast response
              </li>
              <li className="flex items-center gap-3 font-semibold text-gray-700 text-[14px]">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
                User-friendly storefront & AI companion
              </li>
              <li className="flex items-center gap-3 font-semibold text-gray-700 text-[14px]">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
                Professional dispatch & quality control staff
              </li>
            </ul>
          </div>

          {/* Right Grid Feature Layout */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Feature Box 1 */}
            <div className="p-6 bg-[#F8FAFC] border border-gray-100 rounded-2xl text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[16px] text-primary font-bold mb-4">🚚</div>
              <h4 className="font-bold text-[15px] text-gray-800 mb-1.5">Fast delivery</h4>
              <p className="text-gray-500 text-[12px] leading-relaxed">Swift delivery across Lagos and key regional centers.</p>
            </div>

            {/* Feature Box 2 */}
            <div className="p-6 bg-[#F8FAFC] border border-gray-100 rounded-2xl text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[16px] text-primary font-bold mb-4">🥗</div>
              <h4 className="font-bold text-[15px] text-gray-800 mb-1.5">Fresh Foods</h4>
              <p className="text-gray-500 text-[12px] leading-relaxed">Direct harvest crops that never sit on retail storage.</p>
            </div>

            {/* Feature Box 3 */}
            <div className="p-6 bg-[#F8FAFC] border border-gray-100 rounded-2xl text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[16px] text-primary font-bold mb-4">🔒</div>
              <h4 className="font-bold text-[15px] text-gray-800 mb-1.5">Secured Payments</h4>
              <p className="text-gray-500 text-[12px] leading-relaxed">Integrates with Paystack for seamless debit card transactions.</p>
            </div>

            {/* Feature Box 4 */}
            <div className="p-6 bg-[#F8FAFC] border border-gray-100 rounded-2xl text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[16px] text-primary font-bold mb-4">🏠</div>
              <h4 className="font-bold text-[15px] text-gray-800 mb-1.5">Pick up</h4>
              <p className="text-gray-500 text-[12px] leading-relaxed">Select home delivery or choose from localized hubs.</p>
            </div>

          </div>

        </div>
      </section>

      {/* ────────────────── CHEF BEMS MASCOT SHOWCASE & FEATURES ────────────────── */}
      <section id="chef-bems" className="py-20 md:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="text-center mb-16">
            <span className="text-[12px] font-bold tracking-widest text-accent uppercase">Agro-Tech Assistant</span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-3">Meet Chef Bems AI</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Chef Bems Mascot Video Card (replaces 3D Canvas) */}
            <div className="lg:col-span-6 bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-md h-[400px] relative flex flex-col justify-center items-center">
              <div className="absolute top-4 left-6 text-left z-10 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-50">
                <span className="text-xs font-bold text-accent uppercase tracking-widest">AI Character</span>
                <h4 className="text-[15px] font-serif font-extrabold text-emerald-950">Chef Bems Mascot</h4>
              </div>
              
              <div className="w-full h-full">
                <video
                  src="https://res.cloudinary.com/dyzkjerez/video/upload/v1784539329/Give_me_a_video_of_the_charact_supd0d.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Chef Bems Features List */}
            <div className="lg:col-span-6 text-left">
              <h3 className="font-serif text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">
                Your Intelligent Culinary Partner
              </h3>
              <p className="text-gray-500 font-medium leading-relaxed text-[15px] mb-8">
                Chef Bems is not just a chatbot—he is a conversational AI companion configured specifically to solve cooking and grocery mapping challenges.
              </p>

              <div className="space-y-6">
                {/* Feature 1 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">💬</div>
                  <div>
                    <h4 className="font-bold text-[16px] text-gray-800 mb-1">Smart Search & Shopping lists</h4>
                    <p className="text-gray-500 text-[13px] leading-relaxed">Ask Chef Bems for specific recipe items. He will map cooking ingredients to real stock items in our warehouse instantly.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">🥗</div>
                  <div>
                    <h4 className="font-bold text-[16px] text-gray-800 mb-1">Personalized Dietary Profiling</h4>
                    <p className="text-gray-500 text-[13px] leading-relaxed">Configure filters based on health goals (e.g. hypertension, heart health, muscle building) to filter recommended products.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">🔄</div>
                  <div>
                    <h4 className="font-bold text-[16px] text-gray-800 mb-1">Instant Ingredient Substitutions</h4>
                    <p className="text-gray-500 text-[13px] leading-relaxed">If a recipe ingredient is currently out of stock, Chef Bems automatically suggests local, available substitutes you can order instead.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── NEWSLETTER SECTION ────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="relative bg-primary rounded-3xl overflow-hidden py-16 px-8 md:px-16 text-center text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="hidden lg:block w-48 h-48 rounded-full overflow-hidden border-4 border-white/20 bg-white/10 shrink-0">
              <img src="/fresh_salad_hero.png" alt="Salad preview" className="w-full h-full object-cover" />
            </div>

            <div className="text-center md:text-left my-auto max-w-xl">
              <h2 className="font-serif text-2xl md:text-4xl font-extrabold mb-3">Subscribe to Our Newsletter</h2>
              <p className="text-primary-light text-[14px]">
                Stay updated with seasonal harvest schedules, special discount coupons, and healthy recipes from Chef Bems.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-center shrink-0">
              {subscribed ? (
                <div className="bg-primary-dark text-primary-light text-[14px] font-bold px-8 py-4.5 rounded-full border border-primary animate-fade-in">
                  ✓ Successfully subscribed! Check your inbox shortly.
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full sm:w-64 md:w-72 bg-white/10 border border-white/25 text-white placeholder-primary-light/70 text-[14px] px-6 py-4 rounded-full focus:outline-none focus:border-white focus:bg-white/20 transition-all font-medium"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white font-bold text-[14px] px-8 py-4 rounded-full shadow-lg shadow-black/10 transition-colors"
                  >
                    Subscribe
                  </button>
                </>
              )}
            </form>
          </div>

        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer id="contact" className="bg-[#111827] text-gray-400 py-16 px-6 md:px-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          
          {/* Brand Info (text removed next to logo) */}
          <div className="md:col-span-4 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-5">
              <img
                src={logo}
                alt="BemsFarms Logo"
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-[13px] leading-relaxed text-gray-400 mb-6 max-w-sm">
              Sourcing fresh, premium, and healthy farm-produce from local agricultural farms straight to your home dining tables. 
            </p>
            <div className="flex gap-4 font-bold text-white text-lg">
              <span className="cursor-pointer hover:text-emerald-500">𝕏</span>
              <span className="cursor-pointer hover:text-emerald-500">📷</span>
              <span className="cursor-pointer hover:text-emerald-500">📘</span>
            </div>
          </div>

          {/* Column 1 */}
          <div className="md:col-span-2">
            <h4 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#categories" className="hover:text-white transition-colors">Shop Categories</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">Service Info</a></li>
              <li><a href="#chef-bems" className="hover:text-white transition-colors">Chef Bems</a></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="md:col-span-2">
            <h4 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Refund & Return Policy</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">FAQ Help Desk</span></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="md:col-span-4">
            <h4 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4">Contact Info</h4>
            <ul className="space-y-3.5 text-[13px]">
              <li className="flex items-start gap-3">
                <span className="text-primary">📍</span>
                <span>Lagos Mainland Hub, Yaba, Lagos, Nigeria.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">✉️</span>
                <span>support@bemsfarms.com</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">📞</span>
                <span>+234 (0) 800-BEMSFARM</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copy bar */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row justify-between items-center text-[12px] gap-4">
          <span>© 2026 BemsFarms Limited. All rights reserved. Registered in Nigeria.</span>
          <span className="text-gray-600 font-mono">Agro-Tech Platform v2.4</span>
        </div>
      </footer>

    </div>
  );
}
