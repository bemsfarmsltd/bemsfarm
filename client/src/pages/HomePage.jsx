import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import ProductCard from "../components/ui/ProductCard";
import PageWrapper from "../components/layout/PageWrapper";

// Real system product representations for hero cards
const REAL_OFADA = {
  id: 1, // Matches typical seed id
  name: "Ofada Rice",
  price: 4050 / 1500, // Converts to USD price
  unit: "1 kg bag",
  description: "Premium unpolished local rice, rich in dietary fiber and essential nutrients.",
  image_url: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
};

const REAL_PALM_OIL = {
  id: 2,
  name: "Palm Oil",
  price: 1800 / 1500,
  unit: "1 Litre bottle",
  description: "Naturally processed local red palm oil, perfect for cooking traditional stews.",
  image_url: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg",
};

const REAL_TOMATOES = {
  id: 3,
  name: "Fresh Tomatoes",
  price: 2250 / 1500,
  unit: "1 basket",
  description: "Plump, juicy, field-fresh red tomatoes directly harvested from our growers.",
  image_url: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg",
};

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Load real catalog database products
  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/categories")])
      .then(([p, c]) => {
        setProducts(p.data.products || []);
        const productCategoryIds = new Set(
          (p.data.products || []).map((prod) => prod.category_id)
        );
        const categoriesWithStock = (c.data.categories || []).filter((cat) =>
          productCategoryIds.has(cat.id)
        );
        setCategories(categoriesWithStock);
      })
      .catch((err) => console.error("Error loading products:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "All") return matchesSearch;
    return matchesSearch && categories.find((c) => c.name === activeTab)?.id === p.category_id;
  });

  return (
    <PageWrapper>
      <div className="min-h-screen bg-white text-gray-800 font-sans antialiased overflow-x-hidden">
        
        {/* ────────────────── HERO SECTION (MATCHING SYSTEM COLORS) ────────────────── */}
        <section className="relative pt-8 pb-12 md:pt-14 bg-gradient-to-b from-white via-white to-emerald-50/10 overflow-hidden">
          
          {/* Curving emerald green backdrop block on hero */}
          <div className="absolute top-0 right-0 w-[55%] h-[95%] bg-[#2E7D32] rounded-bl-[200px] -z-10 hidden lg:block" />

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start">
              <h1 className="text-[44px] md:text-[62px] lg:text-[70px] leading-[1.08] font-extrabold text-gray-900 mb-6 font-serif tracking-tight">
                From Food Bar <br />
                to Your <span className="text-[#2E7D32]">Door</span>
              </h1>
              <p className="text-gray-500 text-[15px] md:text-[17px] leading-relaxed max-w-lg mb-8 font-medium">
                Explore the endless possibilities of food with Savory. With exquisite local Nigerian cuisines, you'll never run out of options. Sign up now and embark on your delicious journey.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                <a
                  href="#menu"
                  className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-[14px] px-8 py-3.5 rounded-full shadow-lg shadow-emerald-700/25 transition-all duration-200"
                >
                  Order Now
                </a>
                <button
                  onClick={() => navigate("/chef-chat")}
                  className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-800/80 font-bold text-[14px] px-8 py-3.5 rounded-full transition-all duration-200"
                >
                  Start exploring →
                </button>
              </div>
            </div>

            {/* Hero Right Visuals: Circular rotating food dishes */}
            <div className="lg:col-span-6 flex justify-center items-center relative py-6">
              
              {/* Main revolving circle dish */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                className="relative w-[280px] h-[280px] md:w-[420px] md:h-[420px] rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white shrink-0"
              >
                <img
                  src="https://res.cloudinary.com/dyzkjerez/image/upload/v1784547066/Gemini_Generated_Image_gm16lpgm16lpgm16_s7uw3a.png"
                  alt="Fresh Nigerian food platter"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Sub-orbiter floating plates (mini illustrations - matched to system products) */}
              <div className="absolute w-[360px] h-[360px] md:w-[500px] md:h-[500px] rounded-full -z-10 pointer-events-none">
                <div className="absolute top-[8%] left-[10%] w-14 h-14 md:w-18 md:h-18 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                  <img src={REAL_OFADA.image_url} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute top-[50%] right-[-4%] w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                  <img src={REAL_PALM_OIL.image_url} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute bottom-[4%] left-[45%] w-14 h-14 md:w-18 md:h-18 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                  <img src={REAL_TOMATOES.image_url} className="w-full h-full object-cover" alt="" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Hero Cards Showcase Row (Matched to System Products) ─── */}
          <div className="max-w-7xl mx-auto px-6 md:px-12 mt-16 md:mt-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1: Ofada Rice */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-md flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2E7D32] bg-white absolute -top-12 shadow-md">
                  <img src={REAL_OFADA.image_url} alt="Ofada Rice" className="w-full h-full object-cover" />
                </div>
                <div className="pt-14 flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{REAL_OFADA.name}</h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
                    {REAL_OFADA.description}
                  </p>
                </div>
                <div className="w-full flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="font-extrabold text-[#2E7D32] text-[15px]">₦4,050</span>
                  <button
                    onClick={() => addToCart(REAL_OFADA)}
                    className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-xs py-1.5 px-4 rounded-full transition-colors"
                  >
                    Buy now
                  </button>
                </div>
              </div>

              {/* Card 2: Palm Oil */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-md flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2E7D32] bg-white absolute -top-12 shadow-md">
                  <img src={REAL_PALM_OIL.image_url} alt="Palm Oil" className="w-full h-full object-cover" />
                </div>
                <div className="pt-14 flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{REAL_PALM_OIL.name}</h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
                    {REAL_PALM_OIL.description}
                  </p>
                </div>
                <div className="w-full flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="font-extrabold text-[#2E7D32] text-[15px]">₦1,800</span>
                  <button
                    onClick={() => addToCart(REAL_PALM_OIL)}
                    className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-xs py-1.5 px-4 rounded-full transition-colors"
                  >
                    Buy now
                </button>
              </div>
            </div>

            {/* Card 3: Fresh Tomatoes */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-md flex flex-col items-center text-center relative hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2E7D32] bg-white absolute -top-12 shadow-md">
                <img src={REAL_TOMATOES.image_url} alt="Fresh Tomatoes" className="w-full h-full object-cover" />
              </div>
              <div className="pt-14 flex-1">
                <h3 className="font-bold text-lg text-gray-800 mb-2">{REAL_TOMATOES.name}</h3>
                <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
                  {REAL_TOMATOES.description}
                </p>
              </div>
              <div className="w-full flex justify-between items-center pt-3 border-t border-gray-50">
                <span className="font-extrabold text-[#2E7D32] text-[15px]">₦2,250</span>
                <button
                  onClick={() => addToCart(REAL_TOMATOES)}
                  className="bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-xs py-1.5 px-4 rounded-full transition-colors"
                >
                  Buy now
                </button>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ────────────────── WHY CHOOSE US? (MATCHING SYSTEM COLORS) ────────────────── */}
      <section id="why-choose-us" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#2E7D32] tracking-tight uppercase mb-4">
              Why Choose Us?
            </h2>
            <p className="text-gray-500 font-medium text-[15px] leading-relaxed">
              We are No.1 at preparing the best Nigerian delicacies that soothe your taste whether you are an indigene or a foreigner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Box 1 */}
            <div className="bg-white border-2 border-emerald-50 p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center text-xl mb-5">📁</div>
              <h3 className="font-bold text-[16px] text-gray-800 mb-2">Best Quality</h3>
              <p className="text-gray-500 text-[12.5px] leading-relaxed">
                We create the best dishes from fresh farm produce to give you healthy consumption as much as we can.
              </p>
            </div>

            {/* Box 2 */}
            <div className="bg-white border-2 border-emerald-50 p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center text-xl mb-5">🍲</div>
              <h3 className="font-bold text-[16px] text-gray-800 mb-2">Variety of Dishes</h3>
              <p className="text-gray-500 text-[12.5px] leading-relaxed">
                We bring to live several local cuisines from the deep roots of Nigeria to soothe your taste buds.
              </p>
            </div>

            {/* Box 3 */}
            <div className="bg-white border-2 border-emerald-50 p-8 rounded-3xl text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center text-xl mb-5">🎁</div>
              <h3 className="font-bold text-[16px] text-gray-800 mb-2">Reusable Packs</h3>
              <p className="text-gray-500 text-[12.5px] leading-relaxed">
                Our food packaging are durable and can be reused at home for food packs, we charge nothing for.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ────────────────── REAL PRODUCT CATALOGUE (MAINTAINS SYSTEM FUNCTIONALITY) ────────────────── */}
      <section id="menu" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-[#F57C00] uppercase">Store Catalogue</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-1 mb-2">Our Fresh Farm Products</h2>
            <div className="w-12 h-1 bg-[#2E7D32] mx-auto rounded-full mb-8" />
            
            {/* Catalog search bar */}
            <input
              type="text"
              placeholder="Search farm fresh ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full px-5 py-3 border-2 border-gray-150 focus:border-[#2E7D32] rounded-full text-[14px] font-medium outline-none transition-all placeholder-gray-300 bg-white"
            />
          </div>

          {/* Categories Tab selectors */}
          <div className="flex justify-center gap-2 border-b border-gray-200/50 pb-4 mb-8 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("All")}
              className={`text-xs px-4 py-2 rounded-full font-bold border transition-colors ${
                activeTab === "All"
                  ? "bg-[#2E7D32] border-[#2E7D32] text-white shadow-sm"
                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.name)}
                className={`text-xs px-4 py-2 rounded-full font-bold border transition-colors white-space-nowrap ${
                  activeTab === cat.name
                    ? "bg-[#2E7D32] border-[#2E7D32] text-white shadow-sm"
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Loader or Product grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-56 bg-gray-50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-gray-400 font-semibold py-12">No products found matching filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredProducts.slice(0, 10).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

        </div>
      </section>

      </div>
    </PageWrapper>
  );
}
