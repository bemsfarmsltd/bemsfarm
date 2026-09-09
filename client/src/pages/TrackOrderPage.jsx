import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "../utils/delivery";

const STEPS = [
  { key: "confirmed", label: "Order Confirmed", desc: "Payment verified & order queued" },
  { key: "processing", label: "Freshly Packed", desc: "Produce inspected and boxed" },
  { key: "shipped", label: "Out with Courier", desc: "Dispatched with live courier" },
  { key: "delivered", label: "Safely Delivered", desc: "Delivered to your doorstep" },
];

const STATUS_INDEX = {
  pending: 0,
  order_placed: 0,
  confirmed: 0,
  processing: 1,
  packed: 1,
  ready_for_pickup: 1,
  driver_assigned: 2,
  awaiting_pickup: 2,
  shipped: 2,
  en_route: 2,
  out_for_delivery: 2,
  delivery_attempted: 2,
  delivered: 3,
};

const STATUS_COPY = {
  pending: ["Order Received", "Your order has been logged and is awaiting confirmation."],
  order_placed: ["Order Received", "Your farm produce order has been received."],
  confirmed: ["Order Confirmed", "Your payment is confirmed. Farm produce is queued for packing."],
  processing: ["Packing & Quality Check", "Our warehouse team is sorting and packaging your items."],
  packed: ["Packed & Sealed", "Your produce is sealed with freshness tamper-proof packaging."],
  ready_for_pickup: ["Awaiting Dispatch", "Order is staged at the dispatch hub ready for courier pickup."],
  driver_assigned: ["Courier Assigned", "A dedicated BemsFarms delivery driver has been assigned."],
  awaiting_pickup: ["Courier Arriving", "Courier is collecting your parcel from our central hub."],
  shipped: ["In Transit", "Your order has departed our logistics center."],
  en_route: ["On The Way", "Your delivery driver is en route to your destination."],
  out_for_delivery: ["Out for Delivery", "Your courier is nearby and approaching your delivery address."],
  delivery_attempted: ["Delivery Attempted", "Courier attempted contact. Please check your phone or contact dispatch."],
  delivered: ["Delivered Successfully", "Your order was safely delivered to your doorstep."],
  cancelled: ["Order Cancelled", "This order was cancelled. Please contact support if you need help."],
};

const COVERAGE_ZONES = [
  {
    id: "mainland",
    name: "Lagos Mainland",
    tag: "Same-Day / Next-Day",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    areas: ["Ikeja", "Yaba", "Surulere", "Maryland", "Gbagada", "Magodo", "Ogba", "Festac", "Anthony", "Ilupeju"],
    timing: "Deliveries dispatched daily between 9:00 AM – 6:00 PM.",
    flatFee: "₦1,500 (Free over ₦15,000)",
  },
  {
    id: "island",
    name: "Lagos Island & Lekki Axis",
    tag: "Same-Day / Next-Day",
    tagColor: "bg-amber-100 text-amber-800 border-amber-300",
    areas: ["Victoria Island", "Ikoyi", "Lekki Phase 1", "Chevron", "Ikate", "Osapa London", "Ajah", "Sangotedo", "VGC"],
    timing: "Dedicated dispatch van routes running morning and afternoon shifts.",
    flatFee: "₦1,500 (Free over ₦15,000)",
  },
  {
    id: "greater",
    name: "Greater Lagos & Environs",
    tag: "Next-Day Guaranteed",
    tagColor: "bg-blue-100 text-blue-800 border-blue-300",
    areas: ["Ikorodu", "Epe", "Badagry", "Alimosho", "Iba", "Abule Egba", "Ayobo", "Akowonjo"],
    timing: "Scheduled next-day delivery morning dispatch.",
    flatFee: "₦1,500 (Free over ₦15,000)",
  },
  {
    id: "interstate",
    name: "Interstate & Bulk Freight",
    tag: "2 – 3 Business Days",
    tagColor: "bg-purple-100 text-purple-800 border-purple-300",
    areas: ["Abuja (FCT)", "Port Harcourt", "Ibadan", "Abeokuta", "Benin City", "Enugu", "Warri"],
    timing: "Handled via insured inter-state cold and dry freight logistics partners.",
    flatFee: "Calculated based on cargo volume & state",
  },
];

const DELIVERY_FAQS = [
  {
    q: "How fast will I receive my farm produce order?",
    a: "Orders placed within Lagos before 12:00 PM are eligible for Same-Day dispatch. All other Lagos orders are delivered within 24 hours (Next-Day). For interstate destinations, delivery typically takes 2 to 3 business days.",
  },
  {
    q: "How does Free Delivery work?",
    a: "Any order with a total basket value of ₦15,000 or above automatically receives 100% Free Doorstep Delivery across standard coverage zones. For orders below ₦15,000, a flat delivery fee of ₦1,500 is applied at checkout.",
  },
  {
    q: "How is produce protected during transit?",
    a: "All items are packed in heavy-duty food-grade boxes, sealed grain sacks, or leak-proof oil containers. Fragile items like fresh tomatoes and peppers are placed in cushioned, ventilated crates to prevent bruising.",
  },
  {
    q: "What if I am not available when the driver arrives?",
    a: "Our dispatch drivers always call prior to arrival. If you are temporarily unavailable, you can authorize drop-off with a security guard, neighbor, or request a free redelivery attempt within 24 hours.",
  },
  {
    q: "Can I change my delivery address after placing an order?",
    a: "Yes! If your order has not left the packaging station (statuses 'Confirmed' or 'Being Prepared'), contact our dispatch hotline immediately with your order reference (BF-...) and updated address.",
  },
  {
    q: "Do you offer doorstep bulk delivery for catering and restaurants?",
    a: "Yes. We offer commercial bulk delivery (50kg rice bags, full tins of palm oil, wholesale tuber crates) with scheduled offloading right at your kitchen or restaurant warehouse.",
  },
];

function cleanCode(value) {
  return value.trim().replace(/^#/, "").toUpperCase();
}

function DeliveryMap({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const spread = 0.018;
  const bbox = `${lng - spread},${lat - spread},${lng + spread},${lat + spread}`;
  const source = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;

  return (
    <iframe
      title="Current delivery location"
      src={source}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-72 w-full border-0 sm:h-80 rounded-2xl overflow-hidden shadow-inner"
    />
  );
}

export default function TrackOrderPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialCode = cleanCode(params.get("code") || "");
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedZone, setSelectedZone] = useState("mainland");
  const [openFaq, setOpenFaq] = useState(0);

  // Delivery Calculator state
  const [calcAmount, setCalcAmount] = useState(12000);

  const homePath = user ? "/home" : "/";

  const showPreview = () => {
    setCode("BF-PREVIEW01");
    setError("");
    setOrder({
      id: "BF-PREVIEW01",
      status: "out_for_delivery",
      tracking_status: "out_for_delivery",
      created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
      driver_name: "Emmanuel Okon",
      driver_phone: "+234 803 123 4567",
      driver_lat: 6.4541,
      driver_lng: 3.3947,
      eta_minutes: 24,
      destination_area: "Ikeja GRA, Lagos",
      items_count: 4,
      location_updated_at: new Date().toISOString(),
      preview: true,
    });
  };

  const trackOrder = async (requestedCode) => {
    const normalized = cleanCode(requestedCode);
    if (!normalized) {
      setError("Please enter the delivery reference from your receipt (e.g. BF-ABC12345).");
      setOrder(null);
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const response = await api.get(`/orders/track/${encodeURIComponent(normalized)}`);
      setOrder(response.data.order);
      setCode(normalized);
      setParams({ code: normalized }, { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Tracking reference not found. Please double-check your order code and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV && params.get("preview") === "1") {
      showPreview();
    } else if (initialCode) {
      trackOrder(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = order?.tracking_status || order?.status || "pending";
  const activeIndex = STATUS_INDEX[status] ?? 0;
  const [statusTitle, statusText] = STATUS_COPY[status] || ["Order Status Update", "Your order status is currently being updated."];
  const isCancelled = status === "cancelled" || order?.status === "cancelled";
  const hasDriverLocation = Number.isFinite(Number(order?.driver_lat)) && Number.isFinite(Number(order?.driver_lng));
  const showDriverMap = hasDriverLocation && activeIndex >= 2 && !isCancelled;

  const handleSubmit = (event) => {
    event.preventDefault();
    trackOrder(code);
  };

  const calcRemaining = Math.max(0, FREE_DELIVERY_THRESHOLD - calcAmount);
  const calcFee = calcAmount >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;

  return (
    <PageWrapper>
      <div className="bg-[#FAF8F5] min-h-screen">
        {/* ── 1. HERO & TRACKING INPUT PORTAL ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0A2E1C] via-[#0F3824] to-[#14422B] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-12 shadow-xl">
          {/* Subtle Ambient Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 mx-auto max-w-6xl">
            {/* Breadcrumb / Back Link */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link
                to={homePath}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-200 hover:text-amber-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back to {user ? "Home" : "Produce Market"}</span>
              </Link>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 border border-white/15 backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Dispatch Network Active</span>
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Heading & Tracker Search Box */}
              <div className="lg:col-span-7">
                <span className="inline-block rounded-lg bg-amber-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                  BemsFarms Express Logistics
                </span>
                <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                  Track Your Fresh Delivery & Explore Logistics
                </h1>
                <p className="mt-3 text-sm sm:text-base text-emerald-100/90 max-w-xl leading-relaxed">
                  Real-time GPS dispatch tracking, guaranteed temperature-controlled handling, and rapid doorstep delivery across Lagos and beyond.
                </p>

                {/* Tracking Search Input Card */}
                <form
                  onSubmit={handleSubmit}
                  className="mt-6 rounded-2xl bg-white/10 p-2 sm:p-2.5 border border-white/20 backdrop-blur-xl shadow-2xl"
                >
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="relative flex-1 flex items-center bg-white rounded-xl px-3.5 py-3 shadow-inner">
                      <svg className="w-5 h-5 text-emerald-800 shrink-0 mr-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        id="delivery-code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Enter order reference (e.g. BF-ABC12345)"
                        autoComplete="off"
                        spellCheck="false"
                        className="w-full bg-transparent font-mono text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none uppercase"
                      />
                      {code && (
                        <button
                          type="button"
                          onClick={() => setCode("")}
                          className="text-slate-400 hover:text-slate-600 font-bold px-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0a2e1c] px-7 py-3 text-sm font-black transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-[#0a2e1c]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Locating...</span>
                        </>
                      ) : (
                        <span>Track Order</span>
                      )}
                    </button>
                  </div>
                </form>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mt-3.5 rounded-xl border border-rose-300/40 bg-rose-950/60 p-3 text-xs sm:text-sm font-medium text-rose-200 backdrop-blur-md flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-200">
                  <span className="font-semibold text-white/80">Try sample tracking:</span>
                  <button
                    type="button"
                    onClick={showPreview}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 font-mono font-bold text-amber-300 border border-white/15 transition cursor-pointer"
                  >
                    <span>BF-PREVIEW01</span>
                    <span className="text-[10px] text-emerald-300 font-sans font-normal">(Click to test)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Quick Trust & Milestone Highlights */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-2.5 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-white">Same-Day Dispatch</h2>
                  <p className="mt-1 text-xs text-emerald-100/70">Orders placed before 12 PM ship same day in Lagos.</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
                  <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center mb-2.5 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75c0-.621-.504-1.125-1.125-1.125h-9.75C2.504 2.625 2 3.129 2 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-white">Free Over ₦15,000</h2>
                  <p className="mt-1 text-xs text-emerald-100/70">Zero delivery fee on all qualifying orders.</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
                  <div className="w-9 h-9 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center mb-2.5 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-white">Stone-Free Quality</h2>
                  <p className="mt-1 text-xs text-emerald-100/70">Cleaned, de-stoned, and hygienic produce.</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
                  <div className="w-9 h-9 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center mb-2.5 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-white">Live Courier GPS</h2>
                  <p className="mt-1 text-xs text-emerald-100/70">Track courier directly to your doorstep.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. LIVE TRACKING RESULT SECTION (WHEN ORDER ACTIVE) ── */}
        <AnimatePresence>
          {order && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 sm:px-6 lg:px-12 -mt-6 relative z-20"
            >
              <div className="mx-auto max-w-6xl rounded-3xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden">
                {/* Header Banner */}
                <div className={`px-6 py-6 sm:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isCancelled ? "bg-rose-900 text-white" : "bg-[#0F3824] text-white"
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-white/15 border border-white/20">
                        {order.preview ? "Sample Live Preview" : `Order #${order.id}`}
                      </span>
                      {order.eta_minutes && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400 text-emerald-950">
                          ETA: ~{order.eta_minutes} mins
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-black mt-2 text-white">
                      {statusTitle}
                    </h2>
                    <p className="text-sm text-emerald-100/90 mt-1">{statusText}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200 border border-white/20">
                      {status.replaceAll("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrder(null)}
                      className="rounded-full bg-white/20 hover:bg-white/30 px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>

                {/* Progress Steps Pipeline */}
                {!isCancelled && (
                  <div className="px-6 py-8 sm:px-10 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative">
                      {STEPS.map((step, index) => {
                        const isDone = index < activeIndex;
                        const isCurrent = index === activeIndex;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center text-center">
                            {/* Connecting Line */}
                            {index < STEPS.length - 1 && (
                              <div
                                className={`hidden md:block absolute top-5 left-[50%] right-[-50%] h-1 z-0 rounded-full transition-colors ${
                                  index < activeIndex ? "bg-emerald-600" : "bg-slate-200"
                                }`}
                              />
                            )}

                            {/* Step Badge */}
                            <div
                              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                                isDone
                                  ? "bg-emerald-700 text-white ring-4 ring-emerald-100"
                                  : isCurrent
                                  ? "bg-amber-400 text-emerald-950 ring-4 ring-amber-100 font-black animate-bounce"
                                  : "bg-slate-100 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {isDone ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>

                            <p className={`mt-3 text-xs sm:text-sm font-bold ${isCurrent ? "text-emerald-900" : isDone ? "text-slate-800" : "text-slate-400"}`}>
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 max-w-[150px] hidden sm:block">
                              {step.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Courier Details & Driver Map Embed */}
                {showDriverMap && (
                  <div className="grid lg:grid-cols-12 gap-0 border-t border-slate-200">
                    <div className="lg:col-span-5 p-6 sm:p-8 bg-slate-50 flex flex-col justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-3">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Live Dispatch Radar</span>
                        </div>
                        <h2 className="font-display text-xl font-bold text-slate-900">
                          Courier On The Move
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600">
                          Your fresh farm produce is currently in transit with our delivery personnel.
                        </p>

                        {/* Driver Contact Box */}
                        <div className="mt-5 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Courier</p>
                              <p className="text-sm font-black text-slate-900">{order.driver_name || "BemsFarms Dispatch Driver"}</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </span>
                          </div>

                          {order.destination_area && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              <span>Delivering to: <strong className="text-slate-900">{order.destination_area}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 text-[11px] text-slate-500 border-t border-slate-200 pt-3 flex items-center justify-between">
                        <span>Updated: {order.location_updated_at ? new Date(order.location_updated_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "Live"}</span>
                        <a href="tel:+234800000000" className="font-bold text-emerald-700 hover:underline">
                          Need Dispatch Help?
                        </a>
                      </div>
                    </div>

                    <div className="lg:col-span-7 p-4 bg-white flex items-center">
                      <DeliveryMap latitude={order.driver_lat} longitude={order.driver_lng} />
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 3. INTERACTIVE DELIVERY FEE & THRESHOLD CALCULATOR ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Transparent Pricing
              </span>
              <h2 className="mt-2.5 font-display text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
                Delivery Fee & Free Shipping Calculator
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                Qualify for 100% Free Doorstep Delivery when your basket reaches ₦15,000.
              </p>
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-center bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-lg">
              {/* Left Column: Interactive Slider */}
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="basket-slider" className="text-sm font-bold text-slate-800">
                      Estimated Order Value
                    </label>
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#0A2E1C]">
                      ₦{calcAmount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="basket-slider"
                    type="range"
                    min="2000"
                    max="30000"
                    step="500"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 font-semibold">
                    <span>₦2,000</span>
                    <span className="text-amber-700 font-bold">₦15,000 (Free Threshold)</span>
                    <span>₦30,000+</span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="rounded-2xl bg-[#FAF8F5] p-4 border border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold mb-2">
                    <span className="text-slate-700">Free Delivery Progress</span>
                    <span className={calcFee === 0 ? "text-emerald-700" : "text-amber-700"}>
                      {calcFee === 0 ? "100% Free Unlocked" : `${Math.round((calcAmount / FREE_DELIVERY_THRESHOLD) * 100)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        calcFee === 0 ? "bg-emerald-600" : "bg-gradient-to-r from-amber-500 to-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, (calcAmount / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2.5 text-xs text-slate-600">
                    {calcFee === 0 ? (
                      <span className="font-bold text-emerald-800">
                        Awesome! Your basket qualifies for FREE Doorstep Delivery.
                      </span>
                    ) : (
                      <span>
                        Add just <strong className="font-bold text-amber-700">₦{calcRemaining.toLocaleString()}</strong> more to eliminate the ₦1,500 delivery fee!
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Column: Dynamic Fee Summary Card */}
              <div className="md:col-span-5 rounded-2xl bg-gradient-to-br from-[#0F3824] to-[#0A2E1C] text-white p-6 sm:p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Delivery Cost Breakdown
                  </span>
                  <div className="mt-4 flex items-baseline justify-between border-b border-white/15 pb-4">
                    <span className="text-sm text-white/80">Standard Rate</span>
                    <span className="font-mono text-sm text-white/80">₦1,500</span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between border-b border-white/15 pb-4">
                    <span className="text-sm text-white/80">Threshold Discount</span>
                    <span className="font-mono text-sm text-amber-400 font-bold">
                      {calcFee === 0 ? "-₦1,500 (Free)" : "₦0"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-base font-bold text-white">Your Delivery Fee</span>
                    <span className="font-mono text-2xl font-black text-amber-300">
                      {calcFee === 0 ? "FREE" : "₦1,500"}
                    </span>
                  </div>
                </div>

                <Link
                  to="/products"
                  className="mt-6 block text-center rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] px-5 py-3 text-sm font-black transition-all shadow-md"
                >
                  Shop Produce Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. COVERAGE ZONES & LOGISTICS REGIONS ── */}
        <section className="py-14 px-4 sm:px-6 lg:px-12 bg-white border-y border-slate-200">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Coverage Radar
                </span>
                <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-black text-slate-900">
                  Where We Deliver
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Select a regional delivery hub to view coverage areas, delivery speeds, and flat-rate charges.
                </p>
              </div>

              {/* Zone Tab Switches */}
              <div className="flex flex-wrap gap-2">
                {COVERAGE_ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZone(zone.id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      selectedZone === zone.id
                        ? "bg-[#0F3824] text-white shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Zone Display Card */}
            {(() => {
              const zone = COVERAGE_ZONES.find((z) => z.id === selectedZone) || COVERAGE_ZONES[0];
              return (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-[#FAF8F5] p-6 sm:p-8 border border-slate-200/80 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-black text-[#0A2E1C]">
                        {zone.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">{zone.timing}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${zone.tagColor}`}>
                        {zone.tag}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-slate-800 border border-slate-200">
                        {zone.flatFee}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Covered Neighborhoods & Landmarks:
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {zone.areas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-800 border border-slate-200/80 shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </section>

        {/* ── 5. FRESHNESS & SAFE HANDLING STANDARDS ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Our Guarantee
              </span>
              <h2 className="mt-2.5 font-display text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
                The BemsFarms Delivery Promise
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600">
                We safeguard freshness from our farm sorting tables directly to your cooking pot.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">100% Stone-Free Guarantee</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every grain batch of rice and beans undergoes multi-stage destoning and winnowing before packaging.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">Tamper-Proof Oil Seals</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Pure palm oil and vegetable oils are packaged in food-grade, airtight, leak-resistant containers with security seals.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">Hassle-Free Replacement</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  If any item is damaged during transit or fails quality inspection upon delivery, we replace or refund promptly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. DELIVERY FAQ ACCORDION ── */}
        <section className="py-14 px-4 sm:px-6 lg:px-12 bg-white border-t border-slate-200">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Need Help?
              </span>
              <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-black text-slate-900">
                Frequently Asked Delivery Questions
              </h2>
            </div>

            <div className="space-y-3">
              {DELIVERY_FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-slate-200/80 bg-[#FAF8F5] overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base cursor-pointer hover:text-emerald-800"
                    >
                      <span>{faq.q}</span>
                      <span className={`text-slate-400 font-black text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 7. DISPATCH SUPPORT & HOTLINE BANNER ── */}
        <section className="py-12 px-4 sm:px-6 lg:px-12 bg-[#0A2E1C] text-white">
          <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                Have questions about an active delivery?
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-200">
                Our logistics and customer care desk is active Monday – Saturday from 8:00 AM to 7:00 PM.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="mailto:info@bemsfarms.com"
                className="rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/20 transition"
              >
                Email Support
              </a>
              <a
                href="https://wa.me/2348000000000"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-xs sm:text-sm font-black text-[#0a2e1c] shadow-md transition"
              >
                WhatsApp Dispatch Desk
              </a>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
