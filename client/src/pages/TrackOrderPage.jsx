import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const DELIVERY_VIDEOS = [
  {
    id: 1,
    badge: "Express Doorstep Dispatch",
    badgeColor: "#10B981",
    title: "Rapid Market Logistics",
    subtitle: "Speedy fulfillment direct from our Abia State central hub to your doorstep.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1784552209/Create_an_exiting_carousel_vid_xh7212.mp4",
  },
  {
    id: 2,
    badge: "Certified Sorting & Inspection",
    badgeColor: "#06B6D4",
    title: "Hygienic Sealed Packaging",
    subtitle: "Stone-free sorting, winnowing, and leak-proof container sealing before departure.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166480/A_slow_looping_cinematic_shot_i0swkm.mp4",
  },
  {
    id: 3,
    badge: "Direct Farm Harvest",
    badgeColor: "#F59E0B",
    title: "Fresh Nigerian Farm Produce",
    subtitle: "Direct-from-farm harvests delivered across all 36 States + FCT Abuja.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166618/A_vibrant_top_down_flat_lay_vi_xuitwq.mp4",
  },
  {
    id: 4,
    badge: "Authentic Sun-Drenched Fields",
    badgeColor: "#8B5CF6",
    title: "From Farm to Kitchen",
    subtitle: "Farm-fresh food shopping delivered with care and quality guarantees.",
    src: "https://res.cloudinary.com/dyzkjerez/video/upload/f_auto,q_auto,w_1000/v1786166058/A_warm_sun_drenched_Nigerian_f7oi4i.mp4",
  },
];

function DeliveryVideoSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % DELIVERY_VIDEOS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const activeSlide = DELIVERY_VIDEOS[current];

  return (
    <div className="relative w-full aspect-video sm:aspect-[16/10] md:aspect-[4/3] lg:aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black/60 backdrop-blur-md select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            key={activeSlide.src}
            className="w-full h-full object-cover"
            src={activeSlide.src}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient Shade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

      {/* Video Badge Pill */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 border border-white/20 text-[10px] sm:text-xs font-bold text-white shadow-lg pointer-events-none">
        <span
          className="h-1.5 w-1.5 rounded-full animate-ping"
          style={{ backgroundColor: activeSlide.badgeColor }}
        />
        <span>{activeSlide.badge}</span>
      </div>

      {/* Bottom Caption */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 right-3 sm:right-4 z-10 text-white pointer-events-none">
        <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 drop-shadow-sm">
          {activeSlide.title}
        </p>
        <p className="text-[10px] sm:text-[11px] text-white/90 line-clamp-1 drop-shadow-xs font-medium">
          {activeSlide.subtitle}
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  { key: "confirmed", stepNumber: "01", label: "Confirmed", desc: "Order queued & verified" },
  { key: "processing", stepNumber: "02", label: "Packaging", desc: "Inspected & sealed" },
  { key: "shipped", stepNumber: "03", label: "In Transit", desc: "With dispatch courier" },
  { key: "delivered", stepNumber: "04", label: "Delivered", desc: "Delivered to doorstep" },
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
  processing: ["Packing & Quality Check", "Our warehouse team is sorting, de-stoning, and packaging your items."],
  packed: ["Packed & Sealed", "Your produce is sealed with freshness tamper-proof packaging."],
  ready_for_pickup: ["Awaiting Dispatch", "Order is staged at the dispatch hub ready for courier pickup."],
  driver_assigned: ["Courier Assigned", "A dedicated BemsFarms delivery driver has been assigned."],
  awaiting_pickup: ["Courier Arriving", "Courier is collecting your parcel from our central dispatch hub."],
  shipped: ["In Transit", "Your order has departed our logistics center."],
  en_route: ["On The Way", "Your delivery driver is en route to your destination."],
  out_for_delivery: ["Out for Delivery", "Your courier is nearby and approaching your delivery address."],
  delivery_attempted: ["Delivery Attempted", "Courier attempted contact. Please check your phone or contact dispatch."],
  delivered: ["Delivered Successfully", "Your order was safely delivered to your doorstep."],
  cancelled: ["Order Cancelled", "This order was cancelled. Please contact support if you need assistance."],
};

const COVERAGE_HUBS = [
  {
    name: "Abia State (HQ & Central Hub)",
    tag: "Same-Day / Next-Day",
    areas: "Umuahia, Aba, Ohafia, Arochukwu, Osisioma, Isiala Ngwa & all surrounding towns",
    timing: "Direct doorstep courier dispatch from our Abia State facilities",
  },
  {
    name: "Regional & South-East / South-South",
    tag: "1 – 2 Business Days",
    areas: "Port Harcourt, Owerri, Enugu, Uyo, Calabar, Asaba, Onitsha, Warri, Benin City",
    timing: "Fast regional transit directly to your door",
  },
  {
    name: "Nationwide Across Nigeria (All 36 States + FCT)",
    tag: "2 – 3 Business Days",
    areas: "Lagos, Abuja (FCT), Ibadan, Kano, Kaduna, Jos, and all locations nationwide",
    timing: "Insured nationwide freight and interstate logistics",
  },
];

const FAQS = [
  {
    q: "How does nationwide delivery work from Abia State?",
    a: "Orders within Abia State (Umuahia, Aba, Ohafia, etc.) and neighboring South-East cities are dispatched via our direct courier fleet for same-day or next-day delivery. Orders to Lagos, Abuja, Port Harcourt, and other states across Nigeria are transported via insured inter-state logistics networks.",
  },
  {
    q: "How is delivery fee calculated?",
    a: "Delivery fees are calculated transparently during checkout based on your exact delivery location, package weight, and active promotional discounts.",
  },
  {
    q: "How are fragile goods like palm oil and fresh produce packaged?",
    a: "All oils are packaged in food-grade, airtight, leak-resistant containers with security seals. Fresh produce is sorted into cushioned, ventilated crates to preserve optimal condition during transit.",
  },
  {
    q: "What should I do if I am unavailable when the courier arrives?",
    a: "Our dispatch couriers always call your phone number prior to arrival. You can instruct the courier to leave the package with a designated person or arrange an alternative delivery window with dispatch.",
  },
  {
    q: "Can I update my delivery address after ordering?",
    a: "Yes. If your package has not departed the packaging station, you can contact our dispatch helpline immediately on WhatsApp or Phone with your order reference (BF-...) to update the address.",
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
      title="Live delivery location map"
      src={source}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-64 sm:h-72 w-full border-0 rounded-2xl overflow-hidden shadow-inner"
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
  const [openFaq, setOpenFaq] = useState(null);

  const homePath = user ? "/home" : "/";

  const showPreview = () => {
    setCode("BF-DEMO-2026");
    setError("");
    setOrder({
      id: "BF-DEMO-2026",
      status: "out_for_delivery",
      tracking_status: "out_for_delivery",
      created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
      driver_name: "Chukwudi Nnamdi",
      driver_phone: "+234 803 456 7890",
      driver_lat: 5.5249,
      driver_lng: 7.4943,
      eta_minutes: 20,
      destination_area: "Umuahia Central, Abia State",
      items_count: 3,
      items_summary: "Stone-Free Rice (25kg), Pure Palm Oil (5L), Brown Beans (10kg)",
      location_updated_at: new Date().toISOString(),
      preview: true,
    });
  };

  const trackOrder = async (requestedCode) => {
    const normalized = cleanCode(requestedCode);
    if (!normalized) {
      setError("Please enter the order reference from your confirmation (e.g. BF-ABC12345).");
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
      setError(requestError?.response?.data?.message || "Tracking reference not found. Please verify your reference number and try again.");
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
  const [statusTitle, statusText] = STATUS_COPY[status] || ["Order Status Update", "Your order status is being updated."];
  const isCancelled = status === "cancelled" || order?.status === "cancelled";
  const hasDriverLocation = Number.isFinite(Number(order?.driver_lat)) && Number.isFinite(Number(order?.driver_lng));
  const showDriverMap = hasDriverLocation && activeIndex >= 2 && !isCancelled;

  const handleSubmit = (event) => {
    event.preventDefault();
    trackOrder(code);
  };

  return (
    <PageWrapper>
      <div className="bg-[#FAF8F5] min-h-screen text-slate-900">
        {/* ── 1. CINEMATIC VIDEO & TRACKING BANNER ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0A2E1C] via-[#0F3824] to-[#14422B] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-12 shadow-xl">
          {/* Subtle Ambient Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="relative z-10 mx-auto max-w-6xl">
            {/* Top Navigation Bar Link */}
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
                <span>Abia State HQ &bull; Delivering Everywhere in Nigeria</span>
              </div>
            </div>

            {/* 2-Column Grid: Text & Tracking Form + Video Slider Showcase */}
            <div className="grid md:grid-cols-12 gap-8 items-center">
              {/* Left Column: Tracking Content */}
              <div className="md:col-span-7">
                <span className="inline-block rounded-md bg-amber-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                  Live Dispatch Logistics
                </span>
                <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                  Track Your Delivery
                </h1>
                <p className="mt-2.5 text-xs sm:text-sm md:text-base text-emerald-100/90 max-w-lg leading-relaxed">
                  Direct dispatch from our Abia State central hub to all 36 States + FCT. Enter your reference to track live progress.
                </p>

                {/* Minimalist Search Box */}
                <form
                  onSubmit={handleSubmit}
                  className="mt-6 rounded-2xl bg-white/10 p-2 border border-white/20 backdrop-blur-md shadow-2xl max-w-xl"
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
                        placeholder="Order reference (e.g. BF-ABC12345)"
                        autoComplete="off"
                        spellCheck="false"
                        className="w-full bg-transparent font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none uppercase"
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
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] px-6 py-3 text-sm font-black transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? "Locating..." : "Track Order"}
                    </button>
                  </div>
                </form>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mt-3.5 rounded-xl border border-rose-300/40 bg-rose-950/70 p-3 text-xs sm:text-sm font-medium text-rose-200 text-left max-w-xl flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Sample demo shortcut & trust highlights */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-200">
                  <span className="text-emerald-100/70">Sample tracking:</span>
                  <button
                    type="button"
                    onClick={showPreview}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 font-mono font-bold text-amber-300 border border-white/15 transition cursor-pointer"
                  >
                    <span>BF-DEMO-2026 (Preview)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: High Quality Farm Delivery Video Carousel */}
              <div className="md:col-span-5 w-full flex justify-center md:justify-end">
                <DeliveryVideoSlider />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. LIVE TRACKING RESULT (ORDER ACTIVE) ── */}
        <AnimatePresence>
          {order && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="px-4 sm:px-6 lg:px-12 -mt-8 relative z-20"
            >
              <div className="mx-auto max-w-6xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
                {/* Result Header */}
                <div className={`px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isCancelled ? "bg-rose-900 text-white" : "bg-[#0A2E1C] text-white"
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-white/15 border border-white/20">
                        {order.preview ? "Sample Live Preview" : `Order #${order.id}`}
                      </span>
                      {order.eta_minutes && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400 text-emerald-950">
                          ETA: ~{order.eta_minutes} mins
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-black mt-1 text-white">
                      {statusTitle}
                    </h2>
                    <p className="text-xs text-emerald-100/90">{statusText}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOrder(null)}
                    className="self-start sm:self-auto rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-1 text-xs font-bold text-white transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* 4-Step Milestone Progress Bar */}
                {!isCancelled && (
                  <div className="px-6 py-6 sm:px-8 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-4 gap-2 relative">
                      {STEPS.map((step, index) => {
                        const isDone = index < activeIndex;
                        const isCurrent = index === activeIndex;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center text-center">
                            {/* Connecting Line */}
                            {index < STEPS.length - 1 && (
                              <div
                                className={`hidden sm:block absolute top-4 left-[50%] right-[-50%] h-1 z-0 rounded-full transition-colors ${
                                  index < activeIndex ? "bg-emerald-600" : "bg-slate-200"
                                }`}
                              />
                            )}

                            <div
                              className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                                isDone
                                  ? "bg-emerald-700 text-white"
                                  : isCurrent
                                  ? "bg-amber-400 text-emerald-950 font-black ring-4 ring-amber-100"
                                  : "bg-slate-100 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {isDone ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                step.stepNumber
                              )}
                            </div>

                            <p className={`mt-2 text-xs font-bold ${isCurrent ? "text-emerald-950" : isDone ? "text-slate-800" : "text-slate-400"}`}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-slate-500 hidden md:block">
                              {step.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Driver Details & Live Radar Map */}
                <div className="grid md:grid-cols-12 gap-0 border-t border-slate-200">
                  {/* Courier & Order Metadata Card */}
                  <div className="md:col-span-5 p-5 sm:p-6 bg-slate-50 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Dispatch Personnel
                      </span>
                      <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                        {order.driver_name || "BemsFarms Logistics Courier"}
                      </h3>

                      {order.destination_area && (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Destination:</span> {order.destination_area}
                        </div>
                      )}

                      {order.items_summary && (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Items:</span> {order.items_summary}
                        </div>
                      )}

                      {/* Direct Courier Action Buttons */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {order.driver_phone && (
                          <a
                            href={`tel:${order.driver_phone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-emerald-900 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                            <span>Call Driver</span>
                          </a>
                        )}

                        <a
                          href="https://wa.me/2348000000000"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-[#0A2E1C] px-3.5 py-2 text-xs font-black shadow-xs hover:bg-amber-300 transition"
                        >
                          <span>WhatsApp Dispatch</span>
                        </a>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Status: In Transit</span>
                      <a href="mailto:info@bemsfarms.com" className="font-bold text-emerald-800 hover:underline">
                        Need Dispatch Help?
                      </a>
                    </div>
                  </div>

                  {/* Driver Map Preview */}
                  <div className="md:col-span-7 p-3 bg-white flex items-center">
                    {showDriverMap ? (
                      <DeliveryMap latitude={order.driver_lat} longitude={order.driver_lng} />
                    ) : (
                      <div className="h-64 w-full rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-center p-6 border border-slate-200">
                        <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <p className="text-xs font-bold text-slate-700">Map updates when courier is en route</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Live GPS telemetry activates during doorstep transit.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 3. HOW DELIVERY WORKS (3 SIMPLE STEPS) ── */}
        <section className="py-14 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Simple & Reliable
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                How Our Delivery Process Works
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs mb-3">
                    01
                  </span>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Order Placement
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Select your farm produce and staples. Enter your delivery address during secure checkout.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs mb-3">
                    02
                  </span>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Sorting & Sealed Packaging
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Grains are de-stoned, quality-inspected, and oils are packed into tamper-proof containers at our Abia State hub.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-black text-xs mb-3">
                    03
                  </span>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Doorstep Dispatch Everywhere
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Our direct couriers and inter-state logistics partners deliver safely to your doorstep across Nigeria.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. COVERAGE HUBS ── */}
        <section className="py-12 px-4 sm:px-6 lg:px-12 bg-white border-y border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">
                Delivery Coverage & Dispatch Hubs
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Centrally coordinated from Abia State with nationwide coverage across all states in Nigeria.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {COVERAGE_HUBS.map((hub) => (
                <div
                  key={hub.name}
                  className="rounded-2xl bg-[#FAF8F5] p-5 border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-sm font-bold text-slate-900">{hub.name}</h3>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {hub.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {hub.areas}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Dispatch:</span> {hub.timing}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
        <section className="py-14 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Support & Help
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                Frequently Asked Delivery Questions
              </h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-slate-900 text-xs sm:text-sm cursor-pointer hover:text-emerald-800"
                    >
                      <span>{faq.q}</span>
                      <span className={`text-slate-400 font-bold transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100"
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

        {/* ── 6. DIRECT DISPATCH HOTLINE ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-12 bg-[#0A2E1C] text-white">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold">
                Have questions about your order or dispatch?
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Our customer care and dispatch desk is active Monday – Saturday from 8:00 AM to 6:00 PM.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="mailto:info@bemsfarms.com"
                className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white border border-white/20 transition"
              >
                Email Support
              </a>
              <a
                href="https://wa.me/2348000000000"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-[#0A2E1C] shadow-md transition"
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
