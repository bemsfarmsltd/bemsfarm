import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const STEPS = [
  { key: "confirmed", label: "Confirmed", desc: "Order queued" },
  { key: "processing", label: "Packaging", desc: "Inspected & packed" },
  { key: "shipped", label: "With Courier", desc: "En route to doorstep" },
  { key: "delivered", label: "Delivered", desc: "Order complete" },
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
  processing: ["Packing & Quality Check", "Our team is sorting and packaging your items."],
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

const COVERAGE_HUBS = [
  {
    name: "Abia State (HQ & Central Hub)",
    tag: "Same-Day / Next-Day",
    areas: "Umuahia, Aba, Ohafia, Arochukwu, Osisioma, Isiala Ngwa & all environs",
    timing: "Direct doorstep dispatch from our Abia state facilities",
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
      driver_lat: 5.5249,
      driver_lng: 7.4943,
      eta_minutes: 20,
      destination_area: "Umuahia, Abia State",
      items_count: 4,
      location_updated_at: new Date().toISOString(),
      preview: true,
    });
  };

  const trackOrder = async (requestedCode) => {
    const normalized = cleanCode(requestedCode);
    if (!normalized) {
      setError("Please enter the delivery reference from your confirmation (e.g. BF-ABC12345).");
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
      setError(requestError?.response?.data?.message || "Tracking reference not found. Please double-check your code or contact support.");
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

  return (
    <PageWrapper>
      <div className="bg-[#FAF8F5] min-h-screen">
        {/* ── 1. CLEAN HERO & TRACKING CARD ── */}
        <section className="bg-gradient-to-b from-[#0A2E1C] via-[#0F3824] to-[#14422B] text-white pt-10 pb-14 px-4 sm:px-6 lg:px-12 shadow-md">
          <div className="mx-auto max-w-4xl">
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
              <span className="text-[11px] font-semibold text-emerald-300/80">
                Nationwide Delivery Across Nigeria
              </span>
            </div>

            <div className="text-center max-w-2xl mx-auto">
              <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
                Delivery & Order Tracking
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Operating from Abia State with nationwide doorstep dispatch. Enter your order reference code (e.g. <strong className="font-mono text-amber-300">BF-ABC12345</strong>) to view real-time delivery status.
              </p>

              {/* Clean Tracking Input Card */}
              <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-2xl bg-white/10 p-2 border border-white/20 backdrop-blur-md shadow-xl max-w-xl mx-auto"
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
                      placeholder="Enter reference (e.g. BF-ABC12345)"
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
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0a2e1c] px-6 py-3 text-sm font-black transition-all shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                  className="mt-3.5 rounded-xl border border-rose-300/30 bg-rose-950/60 p-3 text-xs sm:text-sm font-medium text-rose-200 text-left max-w-xl mx-auto flex items-center gap-2.5"
                >
                  <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Test preview shortcut */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-200">
                <span>Want to test live tracking?</span>
                <button
                  type="button"
                  onClick={showPreview}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 font-mono font-bold text-amber-300 border border-white/15 transition cursor-pointer"
                >
                  <span>Preview Demo</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. LIVE TRACKING TIMELINE & COURIER RADAR (WHEN ORDER ACTIVE) ── */}
        <AnimatePresence>
          {order && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="px-4 sm:px-6 lg:px-12 -mt-6 relative z-20"
            >
              <div className="mx-auto max-w-4xl rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden">
                {/* Result Top Bar */}
                <div className={`px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isCancelled ? "bg-rose-900 text-white" : "bg-[#0F3824] text-white"
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
                    className="self-start sm:self-auto rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-bold text-white transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* 4-Step Milestone Progress */}
                {!isCancelled && (
                  <div className="px-6 py-6 sm:px-8 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-4 gap-2 relative">
                      {STEPS.map((step, index) => {
                        const isDone = index < activeIndex;
                        const isCurrent = index === activeIndex;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center text-center">
                            {/* Line connecting milestones */}
                            {index < STEPS.length - 1 && (
                              <div
                                className={`hidden sm:block absolute top-4 left-[50%] right-[-50%] h-1 z-0 rounded-full ${
                                  index < activeIndex ? "bg-emerald-600" : "bg-slate-200"
                                }`}
                              />
                            )}

                            <div
                              className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                                isDone
                                  ? "bg-emerald-700 text-white"
                                  : isCurrent
                                  ? "bg-amber-400 text-emerald-950 font-black ring-4 ring-amber-100"
                                  : "bg-slate-100 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {isDone ? "✓" : index + 1}
                            </div>

                            <p className={`mt-2 text-xs font-bold ${isCurrent ? "text-emerald-900" : isDone ? "text-slate-800" : "text-slate-400"}`}>
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

                {/* Live Courier Details & Driver Map Embed */}
                {showDriverMap && (
                  <div className="grid md:grid-cols-12 gap-0 border-t border-slate-200">
                    <div className="md:col-span-5 p-5 sm:p-6 bg-slate-50 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Live Courier Dispatch</span>
                        <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                          Produce In Transit
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Driver: <strong className="text-slate-900">{order.driver_name || "BemsFarms Courier"}</strong>
                        </p>
                        {order.destination_area && (
                          <p className="text-xs text-slate-600 mt-1">
                            Destination: <strong className="text-slate-900">{order.destination_area}</strong>
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Status: Active</span>
                        <a href="mailto:info@bemsfarms.com" className="font-bold text-emerald-700 hover:underline">
                          Need Help?
                        </a>
                      </div>
                    </div>

                    <div className="md:col-span-7 p-3 bg-white">
                      <DeliveryMap latitude={order.driver_lat} longitude={order.driver_lng} />
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── 3. CLEAN COVERAGE HUBS ── */}
        <section className="py-12 px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Coverage Areas
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                Nationwide Delivery Network
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Operating from Abia State with reliable doorstep dispatch across all locations in Nigeria.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {COVERAGE_HUBS.map((hub) => (
                <div
                  key={hub.name}
                  className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-display text-base font-bold text-slate-900">
                        {hub.name}
                      </h3>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                        {hub.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {hub.areas}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Dispatch:</span> {hub.timing}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. FRESHNESS & SAFE-HANDLING GUARANTEE ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-12 bg-white border-y border-slate-200">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
                The BemsFarms Delivery Guarantee
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-[#FAF8F5] p-5 border border-slate-200/80">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="font-display text-sm font-bold text-slate-900">100% Stone-Free Guarantee</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Every batch of rice and beans is thoroughly de-stoned, cleaned, and sealed before dispatch.
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF8F5] p-5 border border-slate-200/80">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <h3 className="font-display text-sm font-bold text-slate-900">Tamper-Proof Packaging</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Pure palm oil and groceries are sealed in food-grade, leak-resistant containers with security seals.
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF8F5] p-5 border border-slate-200/80">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <h3 className="font-display text-sm font-bold text-slate-900">Quality Replacement Policy</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  If any produce fails quality expectations on arrival, our dispatch team resolves or replaces it promptly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. QUICK DISPATCH HELPDESK ── */}
        <section className="py-10 px-4 sm:px-6 lg:px-12 bg-[#0A2E1C] text-white">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold">
                Need help with an active delivery?
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Our dispatch and support team is available Monday – Saturday.
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
                className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-[#0a2e1c] shadow-md transition"
              >
                WhatsApp Dispatch
              </a>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
