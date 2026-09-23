import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { ordersAPI } from "../services/api";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import Toast from "../components/ui/Toast";
import LiveOrderMap from "../components/ui/LiveOrderMap";
import { getProductImage } from "../utils/productImages";

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("LiveOrderMap error captured:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-64 bg-slate-100 rounded-2xl flex flex-col items-center justify-center p-4 text-center border border-slate-200">
          <span className="text-3xl mb-2">🗺️</span>
          <p className="text-sm font-bold text-slate-700">Live Map Telemetry View</p>
          <p className="text-xs text-slate-500 mt-1">Delivery details and status updates are continuing in real-time.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const STATUS_CONFIG = {
  // ── Order placed / awaiting payment ──
  pending_payment: {
    label: "Pending Payment",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 0,
    desc: "Awaiting payment verification",
  },
  pending: {
    label: "Order Placed",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 0,
    desc: "Order received and awaiting warehouse processing",
  },
  new_order: {
    label: "Order Placed",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 0,
    desc: "Order received and awaiting confirmation",
  },
  // ── Payment confirmed ──
  paid: {
    label: "Confirmed & Paid",
    bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6",
    stepIndex: 1,
    desc: "Payment confirmed, produce queued for packaging",
  },
  confirmed: {
    label: "Confirmed & Paid",
    bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6",
    stepIndex: 1,
    desc: "Payment verified, farm produce queued for packaging",
  },
  // ── Packaging & Processing ──
  packaging: {
    label: "Processing & Packaging",
    bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6",
    stepIndex: 2,
    desc: "Items picked and undergoing POS barcode verification",
  },
  partially_packed: {
    label: "Partially Packed",
    bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6",
    stepIndex: 2,
    desc: "Items are currently being scanned and packed",
  },
  packaging_exception: {
    label: "Packaging Review",
    bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA", dot: "#EF4444",
    stepIndex: 2,
    desc: "Packaging exception under review by warehouse manager",
  },
  processing: {
    label: "Processing & Inspection",
    bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6",
    stepIndex: 2,
    desc: "Items sorted, de-stoned, and sealed in tamper-proof crates",
  },
  // ── Packed & Ready for Driver Pickup ──
  packed: {
    label: "Packed & Sealed",
    bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6",
    stepIndex: 3,
    desc: "Items 100% verified and packed at store. Awaiting driver pickup.",
  },
  packed_ready: {
    label: "Packed & Ready",
    bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6",
    stepIndex: 3,
    desc: "Goods are packed and awaiting courier store pickup",
  },
  awaiting_driver_confirmation: {
    label: "Dispatching Courier",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 3,
    desc: "Locating and assigning the closest available delivery driver",
  },
  driver_assigned: {
    label: "Courier Assigned",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 3,
    desc: "Courier assigned and heading to store counter for goods pickup",
  },
  awaiting_pickup: {
    label: "Awaiting Store Pickup",
    bg: "#FEF3C7", color: "#B45309", border: "#FDE68A", dot: "#F59E0B",
    stepIndex: 3,
    desc: "Courier is at the store counter collecting your order",
  },
  // ── Picked Up & In Transit (Driver Confirmed Pickup) ──
  picked_up: {
    label: "Goods Picked Up",
    bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Courier confirmed goods pickup at store and is on the way to you",
  },
  shipped: {
    label: "Dispatched · In Transit",
    bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Courier departed store and is en route with your fresh produce",
  },
  in_transit: {
    label: "In Transit",
    bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Your order is on the way to your delivery address",
  },
  en_route: {
    label: "Out For Doorstep Delivery",
    bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Courier is approaching your delivery destination",
  },
  out_for_delivery: {
    label: "Out For Doorstep Delivery",
    bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Courier is nearby with your delivery",
  },
  arrived: {
    label: "Courier Arrived",
    bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0", dot: "#10B981",
    stepIndex: 4,
    desc: "Courier is at your doorstep or entrance",
  },
  // ── Delivered ──
  delivered: {
    label: "Delivered Successfully",
    bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0", dot: "#22C55E",
    stepIndex: 5,
    desc: "Order has been safely delivered to your doorstep",
  },
  completed: {
    label: "Delivered Successfully",
    bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0", dot: "#22C55E",
    stepIndex: 5,
    desc: "Order has been completed and delivered",
  },
  // ── Cancelled ──
  cancelled: {
    label: "Cancelled",
    bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA", dot: "#EF4444",
    stepIndex: -1,
    desc: "This order was cancelled",
  },
  refunded: {
    label: "Refunded",
    bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA", dot: "#EF4444",
    stepIndex: -1,
    desc: "This order has been refunded",
  },
};


const MILESTONE_STEPS = [
  { key: "pending", label: "Placed", desc: "Order Logged" },
  { key: "confirmed", label: "Confirmed", desc: "Payment Verified" },
  { key: "processing", label: "Processing", desc: "Inspected & Packed" },
  { key: "packed", label: "Packed", desc: "Ready at Store" },
  { key: "shipped", label: "In Transit", desc: "Driver Picked Up" },
  { key: "delivered", label: "Delivered", desc: "Doorstep Arrival" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollingTimerRef = useRef(null);

  // Cancel order modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmReceipt = async () => {
    if (!order) return;
    setConfirmingReceipt(true);
    try {
      const res = await api.post(`/orders/${order.id}/confirm-receipt`);
      showToast(res.data?.message || "Delivery confirmed! Thank you for shopping with Bems Farms.");
      loadOrder(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to confirm delivery receipt", "error");
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const loadOrder = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await ordersAPI.getById(id);
        const fetchedOrder = res.data?.order || res.data;
        setOrder(fetchedOrder);
      } catch (err) {
        if (!silent) {
          showToast(err.response?.data?.message || "Could not load order details", "error");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadOrder(false);
  }, [loadOrder]);

  // Live polling for real-time driver movement & telemetry every 8 seconds
  useEffect(() => {
    if (!order) return;
    const isCompleted = ["delivered", "cancelled"].includes(String(order.status).toLowerCase());
    if (isCompleted) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(() => {
      loadOrder(true);
    }, 8000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [order?.status, loadOrder]);

  const handleCopy = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    showToast(`Order #${order.id} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReorder = async () => {
    if (!order) return;
    const items = order.items || order.order_items || [];
    const skipped = [];
    let addedAny = false;

    for (const item of items) {
      try {
        const res = await api.get(`/products/${item.product_id}`);
        const product = res.data.product;
        const stock = Math.max(Number(product?.stock_quantity || 0), Number(product?.stock || 0));
        if (!product || stock <= 0) {
          skipped.push(item.name);
          continue;
        }
        const itemPrice = Number(product.price || item.price || 0);
        addToCart({
          id: item.product_id,
          name: item.name,
          price: itemPrice,
          image_url: item.image_url || getProductImage(item),
          stock_quantity: stock,
        });
        addedAny = true;
      } catch {
        skipped.push(item.name);
      }
    }

    if (!addedAny) {
      showToast("Sorry, none of the items from this order are currently available.", "error");
      return;
    }
    if (skipped.length > 0) {
      showToast(`${skipped.join(", ")} ${skipped.length === 1 ? "is" : "are"} out of stock. Added available items.`, "error");
      setTimeout(() => navigate("/checkout"), 1800);
      return;
    }
    showToast("Items added to your cart!");
    navigate("/checkout");
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await api.patch(`/orders/${order.id}/cancel`, {
        reason: cancelReason || "Cancelled by customer from Order Details",
      });
      showToast(`Order #${order.id} has been cancelled successfully.`);
      setCancelModalOpen(false);
      setCancelReason("");
      loadOrder(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel order", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[65vh] bg-[#F4F6F8]">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading order details...
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!order) {
    return (
      <PageWrapper>
        <div className="w-full min-h-[65vh] flex flex-col items-center justify-center px-4 py-16 bg-[#F4F6F8]">
          <div className="max-w-md w-full text-center bg-white p-8 sm:p-10 rounded-3xl border-2 border-slate-200/90 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-2xs">
              📦
            </div>
            <h2 className="text-xl font-black text-slate-900">Order Not Found</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't locate details for order <span className="font-mono font-bold text-slate-800">#{id}</span>. It might belong to another account or the order ID is incorrect.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/orders"
                className="px-6 py-3 rounded-xl bg-[#17352a] hover:bg-[#1f4738] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all inline-flex items-center justify-center gap-1.5"
              >
                ← Return to My Orders
              </Link>
              <Link
                to="/products"
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black uppercase tracking-wider shadow-sm transition-all inline-flex items-center justify-center"
              >
                Shop Fresh Produce
              </Link>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.tracking_status === 'cancelled';
  const isCod = ['cod', 'cashondelivery', 'payondelivery', 'cash'].includes(String(order.payment_method || '').toLowerCase().trim().replace(/[\s-_]+/g, ''));
  let effectiveStatus = isCancelled
    ? 'cancelled'
    : String(order.tracking_status || order.status || 'pending').toLowerCase().trim();
  if (!isCancelled) {
    if (isCod && (effectiveStatus === 'pending_payment' || effectiveStatus === 'pending')) {
      effectiveStatus = order.invoice_printed ? 'packaging' : 'confirmed';
    } else if (order.invoice_printed && ['pending', 'pending_payment', 'new_order', 'confirmed'].includes(effectiveStatus)) {
      effectiveStatus = 'packaging';
    }
  }
  const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
  const items = order.items || order.order_items || [];
  const total = Number(order.total || 0);
  const deliveryFee = Number(order.delivery_fee || 1500);
  const computedSubtotal = items.reduce((acc, it) => acc + Number(it.price || it.unit_price || 0) * Number(it.quantity || 1), 0);
  const subtotal = computedSubtotal > 0 ? computedSubtotal : (total - deliveryFee > 0 ? total - deliveryFee : total);
  const parsedDate = new Date(order.created_at || order.createdAt);
  const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const isDelivered = effectiveStatus === "delivered" || order.status === "delivered";
  const isIncomplete = !isDelivered && !isCancelled;
  const isInProgress = !isDelivered && !isCancelled;
  const canCancel = !["in_transit", "shipped", "out_for_delivery", "arrived", "driver_arrived", "delivered", "completed", "cancelled", "returned", "return_requested", "return_approved", "dispute"].includes(effectiveStatus) && !order.driver_picked_up;

  const parsedUpdate = new Date(
    order.delivered_at || order.updated_at || order.updatedAt || order.created_at
  );
  const updatedAt = isNaN(parsedUpdate.getTime()) ? new Date() : parsedUpdate;
  const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const canReturn = order.status === "delivered" && daysSinceUpdate <= 7;

  return (
    <PageWrapper>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="min-h-screen bg-[#F4F6F8] pb-28 text-slate-800">
        {/* ── TOP HERO BANNER (FULL WIDTH EDGE-TO-EDGE) ── */}
        <div className="bg-gradient-to-b from-[#0A2E1C] via-[#0D3B24] to-[#12462C] text-white pt-8 pb-16 px-4 sm:px-8 lg:px-12 xl:px-16 border-b border-emerald-950/30">
          <div className="w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-emerald-200/80 mb-3 font-medium">
              <Link to="/home" className="hover:text-amber-300 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link to="/orders" className="hover:text-amber-300 transition-colors">
                My Orders
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-semibold">#{order.id}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
                    <span>Order #{order.id}</span>
                  </h1>
                  <button
                    onClick={handleCopy}
                    title="Copy Order ID"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 transition"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {isIncomplete && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live GPS Tracking</span>
                    </span>
                  )}
                </div>
                <p className="text-emerald-100/70 text-xs sm:text-sm mt-2">
                  Placed on{" "}
                  {date.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-3 self-start md:self-auto">
                <button
                  onClick={() => navigate("/orders")}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  ← All Orders
                </button>
                <button
                  onClick={() => navigate("/products")}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  Shop Fresh Produce
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN DASHBOARD CONTAINER (FULL WIDTH EDGE-TO-EDGE) ── */}
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 -mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ════════ LEFT SECTION: TIMELINE, LIVE MAP & ADDRESS (7 COLS) ════════ */}
            <div className="lg:col-span-7 space-y-6">
              {/* ── MILESTONE PROGRESS STEPPER CARD ── */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Fulfillment Progress
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cfg.desc}
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                      borderColor: cfg.border,
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border shadow-2xs"
                  >
                    <span
                      style={{ backgroundColor: cfg.dot }}
                      className={`w-2 h-2 rounded-full ${isInProgress ? "animate-pulse" : ""}`}
                    />
                    <span>{cfg.label}</span>
                  </span>
                </div>

                {!isCancelled ? (
                  <div>
                    <div className="flex items-center justify-between max-w-xl mx-auto">
                      {MILESTONE_STEPS.map((step, i, arr) => {
                        const currentIdx = cfg.stepIndex >= 0 ? cfg.stepIndex : 0;
                        const isDone = i <= currentIdx;
                        const isCurrent = i === currentIdx;

                        return (
                          <div
                            key={step.key}
                            className={`flex-1 flex flex-col items-center relative ${
                              i < arr.length - 1 ? "" : ""
                            }`}
                          >
                            {i > 0 && (
                              <div
                                className={`absolute top-3.5 -left-1/2 w-full h-1 -z-0 transition-colors ${
                                  isDone ? "bg-emerald-600" : "bg-slate-200"
                                }`}
                              />
                            )}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all ${
                                isCurrent
                                  ? "bg-emerald-600 text-white ring-4 ring-emerald-200 scale-110 shadow-sm"
                                  : isDone
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {isDone ? "✓" : i + 1}
                            </div>
                            <span
                              className={`text-[11px] mt-1.5 font-bold tracking-tight text-center ${
                                isCurrent
                                  ? "text-emerald-800"
                                  : isDone
                                  ? "text-slate-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="text-[9px] text-slate-400 text-center hidden sm:block">
                              {step.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700">
                    <span className="text-2xl">🛑</span>
                    <div>
                      <div className="font-extrabold text-sm">This order was cancelled</div>
                      <div className="text-xs text-red-600">
                        {order.cancel_reason || "Cancelled by customer. Stock and wallet payments have been refunded."}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── REAL-TIME MAP & DISPATCH TELEMETRY ── */}
              {isIncomplete && (
                <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>🗺️ Real-Time Delivery Map</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Live GPS tracking from Bems Farms Dispatch Hub to your doorstep.
                      </p>
                    </div>
                    {order.eta_minutes != null && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-2xs">
                        ⏱️ ETA: ~{order.eta_minutes} mins
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                    <MapErrorBoundary>
                      <LiveOrderMap
                        customerLat={order.customer_lat || order.latitude}
                        customerLng={order.customer_lng || order.longitude}
                        driverLat={order.driver_lat}
                        driverLng={order.driver_lng}
                        driverName={order.driver_name}
                        driverPhone={order.driver_phone}
                        vehicleType={order.vehicle_type}
                        vehiclePlate={order.vehicle_plate}
                        etaMinutes={order.eta_minutes}
                        deliveryAddress={order.address}
                        orderStatus={order.status}
                        height="360px"
                      />
                    </MapErrorBoundary>
                  </div>

                  {/* Courier Banner */}
                  {order.driver_name && (
                    <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl">
                          🛵
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Assigned Courier
                          </div>
                          <div className="text-sm font-black text-white">{order.driver_name}</div>
                          <div className="text-xs text-emerald-200/80">
                            {order.vehicle_type || "Motorcycle"} {order.vehicle_plate ? `(${order.vehicle_plate})` : ""} · ⭐ 5.0 Rated
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.driver_phone && (
                          <a
                            href={`tel:${order.driver_phone}`}
                            className="bg-white text-emerald-900 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs hover:bg-emerald-50 transition"
                          >
                            📞 Call Driver
                          </a>
                        )}
                        {order.driver_phone && (
                          <a
                            href={`https://wa.me/${String(order.driver_phone).replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#25D366] text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs hover:bg-[#20bd5a] transition"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DELIVERY DESTINATION & LOGISTICS DETAILS ── */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 shadow-sm">
                <h2 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📍 Delivery Destination</span>
                </h2>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1.5">
                  <div className="text-sm font-bold text-slate-900">
                    {order.address || "Main Store Pick-Up / Delivery Address"}
                  </div>
                  {order.delivery_city && (
                    <div className="text-slate-600 font-medium">
                      {order.delivery_city}, {order.delivery_state || "Rivers State"}
                    </div>
                  )}
                  {order.zone_name && (
                    <div className="inline-block bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md font-bold text-[10px] mt-1">
                      Dispatch Zone: {order.zone_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════════ RIGHT SECTION: ORDER ITEMS, FINANCIALS & ACTIONS (5 COLS) ════════ */}
            <div className="lg:col-span-5 space-y-6">
              {/* ── ITEMS IN THIS ORDER ── */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Ordered Produce ({items.length})
                  </h2>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Fresh Stock
                  </span>
                </div>

                <div className="space-y-3.5 divide-y divide-slate-100">
                  {items.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3.5 ${i > 0 ? "pt-3.5" : ""}`}>
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {item.name || `Produce Item #${i + 1}`}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>Qty: <strong className="text-slate-800">{item.quantity}</strong></span>
                          <span>·</span>
                          <span className="font-bold text-emerald-800">
                            ₦{Number(item.price || item.unit_price || 0).toLocaleString()} each
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-black text-slate-900 tabular-nums">
                        ₦{(Number(item.quantity) * Number(item.price || item.unit_price || 0)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── BILL BREAKDOWN ── */}
                <div className="border-t-2 border-slate-100 mt-5 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      ₦{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Doorstep Delivery Fee</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      ₦{deliveryFee.toLocaleString()}
                    </span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Coupon Discount</span>
                      <span className="tabular-nums">-₦{Number(order.discount_amount).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-200 pt-3 flex items-baseline justify-between">
                    <span className="text-sm font-extrabold text-slate-900">Total Amount</span>
                    <span className="text-2xl font-black text-emerald-900 tabular-nums">
                      ₦{total.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 text-right">
                    Paid via <strong className="text-slate-700">{order.payment_method === "monnify" ? "Online Card/Transfer (Monnify)" : (order.payment_method || "Online Payment")}</strong>
                  </div>
                </div>
              </div>

              {/* ── ACTION BUTTONS CARD ── */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200/90 shadow-sm space-y-3">
                {/* Specification Section 38: Customer Confirm Delivery Received */}
                {!isDelivered && ["in_transit", "en_route", "out_for_delivery", "arrived", "shipped", "delivery_attempted"].includes(rawStatus) && (
                  <>
                    {order.customer_confirmed ? (
                      <div className="w-full py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                        <span className="text-base">✓</span>
                        <span>You confirmed delivery receipt</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleConfirmReceipt}
                        disabled={confirmingReceipt}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 transition hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <span className="text-base">✅</span>
                        <span>{confirmingReceipt ? "Confirming Receipt..." : "Confirm Delivery Received"}</span>
                      </button>
                    )}
                  </>
                )}

                {isDelivered && (
                  <button
                    onClick={handleReorder}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span>🛒</span>
                    <span>Order Again</span>
                  </button>
                )}

                {canReturn && (
                  <button
                    onClick={() => navigate("/returns", { state: { orderId: order.id } })}
                    className="w-full py-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-bold text-xs hover:bg-amber-100 transition"
                  >
                    Request Return / Exchange
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => {
                      setCancelModalOpen(true);
                      setCancelReason("");
                    }}
                    className="w-full py-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs transition"
                  >
                    Cancel Order
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Save Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CANCEL ORDER CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚠️
              </div>
              <h3 className="text-lg font-black text-slate-900 text-center mb-1">
                Cancel Order #{order.id}?
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5">
                Are you sure you want to cancel this order? Stock will be restored and payment will be refunded to your wallet.
              </p>

              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason for cancellation (optional)
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">Select a reason...</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Found a better price / alternative">Found a better price / alternative</option>
                  <option value="Incorrect delivery address entered">Incorrect delivery address entered</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Need to change items in order">Need to change items in order</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
