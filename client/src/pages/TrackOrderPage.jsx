import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LiveOrderMap from "../components/ui/LiveOrderMap";

const DISPATCH_SLIDES = [
  {
    id: 1,
    type: "image",
    badge: "Central Hub & Staging",
    badgeColor: "#10B981",
    title: "Bems Farms Operations & Dispatch Center",
    subtitle: "Our central facility in Abia State with dedicated courier fleet staging on the red apron.",
    src: "/bems_farms_hub.jpg",
  },
  {
    id: 2,
    type: "image",
    badge: "Show-Glass Storefront",
    badgeColor: "#F59E0B",
    title: "Fresh Produce & Grocery Showroom",
    subtitle: "Two large glass displays showing fresh yams, vegetables, fruits, and groceries inside Bems Farms.",
    src: "/bems_farms_storefront.jpg",
  },
  {
    id: 3,
    type: "image",
    badge: "Evening Logistics Dispatch",
    badgeColor: "#8B5CF6",
    title: "Round-the-Clock Fulfillment",
    subtitle: "Evening dispatch operations ensuring fast next-day deliveries across Nigeria.",
    src: "/bems_farms_twilight.jpg",
  },
];

function DeliveryVideoSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % DISPATCH_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const activeSlide = DISPATCH_SLIDES[current];

  return (
    <div className="relative w-full aspect-video sm:aspect-[16/10] md:aspect-[4/3] lg:aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black/40 backdrop-blur-md select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={activeSlide.src}
            alt={activeSlide.title || "Bems Farms Facility"}
            key={activeSlide.src}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const STEPS = [
  { key: "confirmed", stepNumber: "01", label: "Confirmed", desc: "Order queued & verified" },
  { key: "processing", stepNumber: "02", label: "Processing", desc: "Inspected & sorted" },
  { key: "packed", stepNumber: "03", label: "Packed", desc: "Sealed & ready at store" },
  { key: "shipped", stepNumber: "04", label: "In Transit", desc: "Courier confirmed pickup" },
  { key: "delivered", stepNumber: "05", label: "Delivered", desc: "Delivered to doorstep" },
];

const STATUS_INDEX = {
  pending_payment: 0,
  payment_verification_pending: 0,
  pending: 0,
  order_placed: 0,
  confirmed: 0,
  paid: 0,
  packaging: 1,
  processing: 1,
  partially_packed: 1,
  packaging_exception: 1,
  packed: 2,
  packed_ready: 2,
  ready_for_pickup: 2,
  awaiting_driver_confirmation: 2,
  driver_assigned: 2,
  awaiting_pickup: 2,
  picked_up: 3,
  in_transit: 3,
  shipped: 3,
  en_route: 3,
  out_for_delivery: 3,
  arrived: 3,
  driver_arrived: 3,
  at_location: 3,
  delivery_attempted: 3,
  delivery_exception: 3,
  customer_unreachable: 3,
  delivered: 4,
  completed: 4,
};

const STATUS_COPY = {
  pending_payment: ["Payment Pending", "Order placed. Awaiting payment verification."],
  payment_verification_pending: ["Payment Verification Pending", "We are verifying your transaction with the payment gateway."],
  pending: ["Order Received", "Your order has been logged and is awaiting confirmation."],
  order_placed: ["Order Received", "Your farm produce order has been received."],
  confirmed: ["Order Confirmed", "Your payment is confirmed. Farm produce is queued for packing."],
  paid: ["Order Confirmed", "Payment verified. Produce queued for packaging."],
  packaging: ["Processing & Inspection", "Our warehouse team is picking, verifying, and packaging your items."],
  processing: ["Processing & Inspection", "Our warehouse team is picking, verifying, and packaging your items."],
  partially_packed: ["Partially Packed", "Items are currently being scanned and packed at the store terminal."],
  packaging_exception: ["Packaging Notice", "An item in your order is being reviewed by the warehouse team."],
  packed: ["Packed & Sealed", "Your produce is sealed and staged at store counter, awaiting courier pickup."],
  packed_ready: ["Packed & Ready", "Your order is sealed and verified at the store counter."],
  ready_for_pickup: ["Awaiting Pickup", "Order is staged at the store dispatch counter ready for courier pickup."],
  awaiting_driver_confirmation: ["Finding Courier", "Looking for the nearest available courier driver to collect your order."],
  driver_assigned: ["Courier Assigned", "Courier has been assigned and is heading to the store to collect your goods."],
  awaiting_pickup: ["Courier Arriving at Store", "Courier is arriving at the store counter to verify and collect your goods."],
  picked_up: ["Goods Picked Up", "Courier has confirmed pickup of goods at the store and is heading to your address."],
  in_transit: ["In Transit", "Your delivery driver is en route with your fresh produce."],
  shipped: ["In Transit", "Your order has departed our logistics center."],
  en_route: ["On The Way", "Your delivery driver is en route to your destination."],
  out_for_delivery: ["Out for Delivery", "Your courier is nearby and approaching your delivery address."],
  arrived: ["Courier Arrived at Your Destination", "Your delivery courier has arrived at your address. Please verify your package and confirm delivery."],
  driver_arrived: ["Courier Arrived at Your Destination", "Your delivery courier has arrived at your address. Please verify your package and confirm delivery."],
  at_location: ["Courier Arrived at Your Destination", "Your delivery courier has arrived at your address. Please verify your package and confirm delivery."],
  delivery_attempted: ["Delivery Attempted", "Courier attempted contact. Please check your phone or contact dispatch."],
  delivery_exception: ["Delivery Notice", "A delivery update was noted. Dispatch is resolving."],
  customer_unreachable: ["Customer Contact Needed", "Courier was unable to reach you. Please check your phone."],
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
    areas: "Abia State, Abuja (FCT), Ibadan, Kano, Kaduna, Jos, and all locations nationwide",
    timing: "Insured nationwide freight and interstate logistics",
  },
];

const FAQS = [
  {
    q: "How does nationwide delivery work from Abia State?",
    a: "Orders within Abia State (Umuahia, Aba, Ohafia, etc.) and neighboring South-East cities are dispatched via our direct courier fleet for same-day or next-day delivery. Orders to Abia State, Abuja, Port Harcourt, and other states across Nigeria are transported via insured inter-state logistics networks.",
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
  const isDelivered = status === "delivered" || status === "completed" || order?.status === "delivered" || order?.delivery_status === "delivered";
  const activeIndex = isDelivered ? 4 : (STATUS_INDEX[status] ?? 0);
  const [statusTitle, statusText] = STATUS_COPY[status] || ["Order Status Update", "Your order status is being updated."];
  const isCancelled = status === "cancelled" || order?.status === "cancelled";
  const hasDriverLocation = Number.isFinite(Number(order?.driver_lat)) && Number.isFinite(Number(order?.driver_lng));

  // The interactive map should ONLY appear when the driver is in transit (Step 4 / activeIndex === 3)
  const isInTransit = (
    activeIndex === 3 ||
    ["picked_up", "in_transit", "shipped", "en_route", "out_for_delivery", "arrived", "driver_arrived", "at_location"].includes(status) ||
    Boolean(order?.driver_picked_up)
  ) && !isDelivered && !isCancelled;
  const showDriverMap = isInTransit;

  const formatTransitTime = (minutes) => {
    if (minutes == null || isNaN(minutes)) return null;
    const m = Math.max(1, Math.round(Number(minutes)));
    if (m < 60) return `~${m} mins`;
    const hrs = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `~${hrs} hr ${rem} mins` : `~${hrs} hrs`;
  };

  const getEstimatedDistance = (ord) => {
    if (ord?.distance_km) return `~${Math.round(Number(ord.distance_km))} km`;
    if (ord?.eta_minutes) {
      const estimatedKm = Math.round(Number(ord.eta_minutes) / 4);
      if (estimatedKm > 0) return `~${estimatedKm} km`;
    }
    return null;
  };

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
                      {order.eta_minutes && !isDelivered && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400 text-emerald-950">
                          ETA: {(() => {
                            const m = Math.max(1, Math.round(Number(order.eta_minutes)));
                            if (m < 60) return `~${m} mins`;
                            const hrs = Math.floor(m / 60);
                            const rem = m % 60;
                            return rem > 0 ? `~${hrs} hr ${rem} mins` : `~${hrs} hrs`;
                          })()}
                        </span>
                      )}
                      {isDelivered && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span>✓</span> Delivered
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

                {/* 5-Step Milestone Progress Bar */}
                {!isCancelled && (
                  <div className="px-6 py-6 sm:px-8 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-5 gap-2 relative">
                      {STEPS.map((step, index) => {
                        const isDone = isDelivered ? true : index < activeIndex;
                        const isCurrent = !isDelivered && index === activeIndex;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center text-center">
                            {/* Connecting Line */}
                            {index < STEPS.length - 1 && (
                              <div
                                className={`hidden sm:block absolute top-4 left-[50%] right-[-50%] h-1 z-0 rounded-full transition-colors ${
                                  (isDelivered || index < activeIndex) ? "bg-emerald-600" : "bg-slate-200"
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

                            <p className={`mt-2 text-xs font-bold ${isDone ? "text-emerald-950 font-extrabold" : isCurrent ? "text-emerald-950" : "text-slate-400"}`}>
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

                {/* ── 1. ACTIVE TRANSIT MODE (When Courier Is En Route) ── */}
                {isInTransit ? (
                  <div className="grid md:grid-cols-12 gap-0 border-t border-slate-200">
                    {/* Courier Personnel Details */}
                    <div className="md:col-span-5 p-5 sm:p-6 bg-slate-50 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Dispatch Personnel
                          </span>
                          {order.driver_rating && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>★</span> {Number(order.driver_rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                          <span>👤</span>
                          <span>{order.driver_name || "BemsFarms Logistics Courier"}</span>
                        </h3>

                        {(order.vehicle_type || order.vehicle_plate) && (
                          <div className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Vehicle:</span>
                            <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-800 font-mono font-bold text-[11px]">
                              {order.vehicle_type ? `${order.vehicle_type.toUpperCase()} ` : ""}{order.vehicle_plate || ""}
                            </span>
                          </div>
                        )}

                        {order.destination_area && (
                          <div className="mt-2.5 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">Destination:</span> {order.destination_area}
                          </div>
                        )}

                        {order.items_summary && (
                          <div className="mt-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">Items:</span> {order.items_summary}
                          </div>
                        )}

                        {/* Direct Courier Action Buttons */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          {order.driver_phone && (
                            <a
                              href={`tel:${order.driver_phone}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-emerald-900 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                              </svg>
                              <span>Call Driver ({order.driver_phone})</span>
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

                        {/* Courier Arrival Notification */}
                        {(status === "driver_arrived" || status === "arrived" || Boolean(order.arrived_at)) && (
                          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                              <span className="text-base animate-bounce">🚚</span>
                              <span>Courier is at your destination!</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                              Please meet your driver, verify your produce, and confirm delivery receipt.
                            </p>
                            <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
                              {order.customer_confirmed ? (
                                <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                                  <span>✓</span>
                                  <span>You confirmed delivery receipt</span>
                                </div>
                              ) : (
                                <Link
                                  to={`/orders/${order.id}`}
                                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black uppercase tracking-wider text-center shadow-md transition hover:scale-[1.01] flex items-center justify-center gap-1.5"
                                >
                                  <span>✅</span>
                                  <span>Confirm Delivery Received</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Status: <strong className="text-slate-800 font-bold">{statusTitle}</strong></span>
                        <Link to={`/orders/${order.id}`} className="font-bold text-emerald-800 hover:underline">
                          Order Details →
                        </Link>
                      </div>
                    </div>

                    {/* Live Radar Map */}
                    <div className="md:col-span-7 p-3 bg-white flex items-center">
                      <LiveOrderMap
                        orderId={order.order_ref || order.id}
                        driverId={order.driver_id}
                        customerLat={order.delivery_lat || order.lat}
                        customerLng={order.delivery_lng || order.lng}
                        driverLat={order.driver_lat}
                        driverLng={order.driver_lng}
                        driverName={order.driver_name}
                        driverPhone={order.driver_phone}
                        vehicleType={order.vehicle_type}
                        vehiclePlate={order.vehicle_plate}
                        etaMinutes={order.eta_minutes}
                        deliveryAddress={order.destination_area || order.delivery_address || order.address}
                        orderStatus={order.tracking_status || order.status}
                        height="380px"
                      />
                    </div>
                  </div>
                ) : isDelivered ? (
                  /* ── 2. DELIVERED COMPLETION CARD ── */
                  <div className="border-t border-slate-200 p-6 sm:p-8 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold shadow-md mx-auto mb-3">
                      ✓
                    </div>
                    <h3 className="text-lg font-black text-emerald-950">Delivered to Destination</h3>
                    <p className="text-xs text-emerald-700 mt-1 max-w-sm mx-auto leading-relaxed">
                      Your produce order has been safely delivered to your doorstep. Thank you for choosing Bems Farms!
                    </p>
                    {order.destination_area && (
                      <p className="text-xs font-semibold text-slate-700 mt-2">
                        Delivered to: <span className="text-slate-900 font-bold">{order.destination_area}</span>
                      </p>
                    )}
                    {order.items_summary && (
                      <p className="text-xs text-slate-600 mt-1">
                        Items: {order.items_summary}
                      </p>
                    )}
                    {order.proof_photo && (
                      <div className="mt-4 inline-block">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                          Proof of Delivery:
                        </span>
                        <a href={order.proof_photo} target="_blank" rel="noreferrer" className="inline-block group">
                          <img
                            src={order.proof_photo}
                            alt="Proof of Delivery"
                            className="w-24 h-24 object-cover rounded-xl border border-emerald-300 shadow-xs group-hover:scale-105 transition mx-auto"
                          />
                        </a>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Link
                        to={`/orders/${order.id}`}
                        className="py-2.5 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
                      >
                        View Full Order Details →
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* ── 3. PRE-TRANSIT: ONLY DELIVERY INFORMATION ── */
                  <div className="border-t border-slate-200 p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
                    <div className="grid md:grid-cols-12 gap-6">
                      {/* Left: Prominent Delivery Metrics & Route */}
                      <div className="md:col-span-7 space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                              📋
                            </span>
                            <div>
                              <h3 className="font-display text-base font-black text-slate-900">
                                Delivery Information
                              </h3>
                              <p className="text-xs text-slate-500">
                                Travel time, destination, and fulfillment status
                              </p>
                            </div>
                          </div>
                          {order.eta_minutes && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs px-3 py-1 rounded-full shadow-2xs flex items-center gap-1.5">
                              <span>⏱️</span>
                              <span>{formatTransitTime(order.eta_minutes)} travel</span>
                            </span>
                          )}
                        </div>

                        {/* Estimated Travel Time Callout */}
                        <div className="p-4 rounded-2xl bg-white border border-emerald-100/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Estimated Travel Time to Doorstep
                            </span>
                            <div className="text-2xl sm:text-3xl font-black text-emerald-950 flex items-baseline gap-2 mt-0.5">
                              <span>{formatTransitTime(order.eta_minutes) || "Calculating..."}</span>
                              {getEstimatedDistance(order) && (
                                <span className="text-xs font-bold text-slate-500 font-mono">
                                  ({getEstimatedDistance(order)})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Calculated driving duration from our Central Fulfillment Hub once courier departs.
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60 self-start sm:self-auto">
                            <span>🚚</span>
                            <span>Doorstep Dispatch</span>
                          </div>
                        </div>

                        {/* Transit Route Breakdown */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Fulfillment & Delivery Route
                          </span>

                          {/* Hub Origin */}
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                              🏪
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">Origin: Bems Central Fulfillment Hub</p>
                              <p className="text-slate-500">Aba / Umuahia, Abia State · Inspected & Packed Fresh</p>
                            </div>
                          </div>

                          {/* Connector */}
                          <div className="ml-3.5 pl-4 border-l-2 border-dashed border-emerald-300 py-1 text-[11px] text-slate-500 flex items-center gap-2">
                            <span>🛣️</span>
                            <span>Direct Dispatch Route {getEstimatedDistance(order) ? `• ${getEstimatedDistance(order)}` : ""}</span>
                          </div>

                          {/* Destination */}
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                              📍
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">Destination: Delivery Address</p>
                              <p className="text-slate-700 leading-snug mt-0.5">
                                {order.destination_area || order.delivery_address || order.address || "Your delivery address"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Package Summary, Status Notice & Support */}
                      <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
                        <div className="space-y-4">
                          {/* Items Summary */}
                          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                              Produce in This Delivery
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">
                              {order.items_summary || "Fresh farm produce order"}
                            </p>
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span>Security Packaging:</span>
                              <span className="font-bold text-emerald-800">Tamper-Proof Sealed ✓</span>
                            </div>
                          </div>

                          {/* Map & Telemetry Notice */}
                          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
                            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                              <span className="text-base">🗺️</span>
                              <span>Live Map Activates During Transit</span>
                            </div>
                            <p className="text-[11px] text-amber-900/80 mt-1.5 leading-relaxed">
                              The live GPS tracking map and driver direct contact buttons will unlock on this page as soon as the courier confirms pickup and is on the road to your location.
                            </p>
                          </div>
                        </div>

                        {/* Customer Support & Details Links */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                          <a
                            href="https://wa.me/2348000000000"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold text-center shadow-xs transition flex items-center justify-center gap-1.5"
                          >
                            <span>💬</span>
                            <span>Bems Support</span>
                          </a>
                          <Link
                            to={`/orders/${order.id}`}
                            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold text-center shadow-2xs transition flex items-center justify-center gap-1.5"
                          >
                            <span>Order Details →</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
