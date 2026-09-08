import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../services/api";

const STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Being prepared" },
  { key: "shipped", label: "With delivery" },
  { key: "delivered", label: "Delivered" },
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
  pending: ["Order received", "Your order is waiting for confirmation."],
  order_placed: ["Order received", "Your order has been received."],
  confirmed: ["Order confirmed", "Your order has been confirmed and will be prepared shortly."],
  processing: ["Being prepared", "The team is preparing your order."],
  packed: ["Order packed", "Your order is packed and waiting for delivery."],
  ready_for_pickup: ["Ready for pickup", "Your order is ready to leave the store."],
  driver_assigned: ["Delivery assigned", "A delivery driver has been assigned to your order."],
  awaiting_pickup: ["Awaiting pickup", "Your order is waiting to be collected for delivery."],
  shipped: ["On the way", "Your order has left the store."],
  en_route: ["On the way", "Your delivery is currently on the way."],
  out_for_delivery: ["Out for delivery", "Your delivery is currently on the way."],
  delivery_attempted: ["Delivery attempted", "The team attempted delivery. Please contact support for assistance."],
  delivered: ["Delivered", "Your order has been delivered."],
  cancelled: ["Order cancelled", "This order has been cancelled."],
};

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
      className="h-72 w-full border-0 sm:h-80"
    />
  );
}

export default function TrackOrderPage() {
  const [params, setParams] = useSearchParams();
  const initialCode = cleanCode(params.get("code") || "");
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const showPreview = () => {
    setCode("BF-PREVIEW01");
    setError("");
    setOrder({
      id: "BF-PREVIEW01",
      status: "out_for_delivery",
      tracking_status: "out_for_delivery",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      driver_lat: 6.4541,
      driver_lng: 3.3947,
      eta_minutes: 28,
      location_updated_at: new Date().toISOString(),
      preview: true,
    });
  };

  const trackOrder = async (requestedCode) => {
    const normalized = cleanCode(requestedCode);
    if (!normalized) {
      setError("Enter the delivery code from your order confirmation.");
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
      setError(requestError?.response?.data?.message || "Tracking is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV && params.get("preview") === "1") showPreview();
    else if (initialCode) trackOrder(initialCode);
    // The initial query is intentionally handled once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = order?.tracking_status || order?.status || "pending";
  const activeIndex = STATUS_INDEX[status] ?? 0;
  const [statusTitle, statusText] = STATUS_COPY[status] || ["Order update", "Your order status has been updated."];
  const isCancelled = status === "cancelled" || order?.status === "cancelled";
  const hasDriverLocation = Number.isFinite(Number(order?.driver_lat)) && Number.isFinite(Number(order?.driver_lng));
  const showDriverMap = hasDriverLocation && activeIndex === 2 && !isCancelled;

  const handleSubmit = (event) => {
    event.preventDefault();
    trackOrder(code);
  };

  return (
    <PageWrapper>
      <section className="min-h-[70vh] border-t border-slate-100 bg-white px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="text-sm font-bold text-emerald-800 hover:text-orange-700">← Back to shop</Link>

          <div className="mt-12 grid gap-10 border-b border-slate-200 pb-12 lg:grid-cols-[1fr_300px] lg:gap-20">
            <div>
              <p className="text-sm font-bold text-orange-700">Order tracking</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-[#17352a] sm:text-5xl">Check your delivery status</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Enter the reference shown on your order confirmation. You do not need to sign in.</p>

              <form onSubmit={handleSubmit} className="mt-8 max-w-2xl">
                <label htmlFor="delivery-code" className="mb-2 block text-sm font-bold text-slate-800">Order reference</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="delivery-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="BF-ABC12345"
                    autoComplete="off"
                    spellCheck="false"
                    className="min-w-0 flex-1 border border-slate-300 bg-white px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wide text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  />
                  <button type="submit" disabled={loading} className="bg-[#17352a] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{loading ? "Checking…" : "Track order"}</button>
                </div>
              </form>

              {error && <div role="alert" className="mt-4 max-w-2xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
              {import.meta.env.DEV && <button type="button" onClick={showPreview} className="mt-4 text-sm font-bold text-orange-700 underline decoration-orange-300 underline-offset-4 hover:text-orange-800">Preview a sample tracking result</button>}
            </div>

            <aside className="border-l-2 border-emerald-800 pl-6">
              <h2 className="font-display text-xl font-bold text-[#17352a]">Where to find it</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Your reference appears immediately after checkout and begins with <strong className="font-mono text-slate-900">BF-</strong>.</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Example</p>
              <p className="mt-1 font-mono text-base font-bold text-slate-900">BF-ABC12345</p>
              <p className="mt-6 text-xs leading-5 text-slate-500">This page only shows delivery progress. Personal and payment details remain private.</p>
            </aside>
          </div>

          {order && (
            <div className="mt-12 border border-slate-200 bg-white">
              <div className={`px-6 py-7 sm:px-8 ${isCancelled ? "bg-red-50" : "bg-[#17352a] text-white"}`}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className={`text-xs font-extrabold uppercase tracking-wider ${isCancelled ? "text-red-600" : "text-emerald-200"}`}>{order.preview ? "Sample preview" : `Order #${order.id}`}</p><h2 className={`mt-2 font-display text-2xl font-bold ${isCancelled ? "text-red-900" : "text-white"}`}>{statusTitle}</h2><p className={`mt-2 text-sm leading-6 ${isCancelled ? "text-red-700" : "text-emerald-100/80"}`}>{statusText}</p></div>
                  <span className={`w-fit border px-3 py-2 text-xs font-bold uppercase tracking-wider ${isCancelled ? "border-red-300 text-red-700" : "border-white/25 text-white"}`}>{status.replaceAll("_", " ")}</span>
                </div>
              </div>

              {!isCancelled && <div className="px-5 py-8 sm:px-8">
                <div className="grid grid-cols-4">
                  {STEPS.map((step, index) => {
                    const complete = index <= activeIndex;
                    return <div key={step.key} className="relative text-center"><div className={`absolute left-0 right-0 top-4 h-px ${index <= activeIndex ? "bg-emerald-700" : "bg-slate-300"}`} /><div className={`relative mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${complete ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-400"}`}>{String(index + 1).padStart(2, "0")}</div><p className={`mx-auto mt-3 max-w-24 text-[11px] font-bold sm:text-sm ${complete ? "text-emerald-900" : "text-slate-400"}`}>{step.label}</p></div>;
                  })}
                </div>
                <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>Order placed {new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span><span className="font-bold text-emerald-800">Latest status shown above</span></div>
              </div>}

              {showDriverMap && <div className="grid border-t border-slate-200 lg:grid-cols-[280px_1fr]">
                <div className="p-6 sm:p-8"><p className="text-sm font-bold text-orange-700">Live delivery location</p><h3 className="mt-2 font-display text-2xl font-bold text-[#17352a]">Your order is on the way</h3>{order.eta_minutes && <p className="mt-4 text-sm text-slate-600">Estimated arrival: <strong className="text-slate-900">about {order.eta_minutes} minutes</strong></p>}<p className="mt-5 text-xs leading-5 text-slate-500">Last location update {order.location_updated_at ? new Date(order.location_updated_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "recently"}. The marker updates when the driver shares a new location.</p></div>
                <DeliveryMap latitude={order.driver_lat} longitude={order.driver_lng} />
              </div>}
            </div>
          )}

          {!order && !loading && <div className="flex flex-col gap-5 py-10 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>Tracking updates: confirmed → preparing → with delivery → delivered</p><p>Need help? <a href="mailto:info@bemsfarms.com" className="font-bold text-emerald-800">Contact support</a></p></div>}

          {order && <div className="mt-8 text-sm text-slate-600">Need help with this delivery? <a href="mailto:info@bemsfarms.com" className="font-bold text-emerald-800">Contact support</a>.</div>}
        </div>
      </section>
    </PageWrapper>
  );
}
