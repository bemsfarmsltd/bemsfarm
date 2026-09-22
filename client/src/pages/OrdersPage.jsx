import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { getProductImage } from "../utils/productImages";
import Toast from "../components/ui/Toast";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#B45309",
    bg: "#FEF3C7",
    border: "#FDE68A",
    dot: "#F59E0B",
    cardAccent: "border-t-amber-500",
    headerBg: "bg-amber-50/70",
    stepIndex: 0,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  confirmed: {
    label: "Confirmed",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    dot: "#3B82F6",
    cardAccent: "border-t-blue-500",
    headerBg: "bg-blue-50/70",
    stepIndex: 1,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  processing: {
    label: "Packaging",
    color: "#6D28D9",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    dot: "#8B5CF6",
    cardAccent: "border-t-purple-500",
    headerBg: "bg-purple-50/70",
    stepIndex: 2,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  shipped: {
    label: "Out for Delivery",
    color: "#047857",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    dot: "#10B981",
    cardAccent: "border-t-emerald-600",
    headerBg: "bg-emerald-50/80",
    stepIndex: 3,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  delivered: {
    label: "Delivered",
    color: "#15803D",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    dot: "#22C55E",
    cardAccent: "border-t-teal-600",
    headerBg: "bg-teal-50/60",
    stepIndex: 4,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    color: "#B91C1C",
    bg: "#FEF2F2",
    border: "#FECACA",
    dot: "#EF4444",
    cardAccent: "border-t-rose-500",
    headerBg: "bg-rose-50/60",
    stepIndex: -1,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const STEPS = ["Placed", "Confirmed", "Packaging", "Out for Delivery", "Delivered"];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' (left-to-right 2 cols) or 'list'
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/orders");
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Order #${id} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReorder = async (order) => {
    const items = order.items || [];
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
    if (!cancelModalOrder) return;
    setCancelling(true);
    try {
      await api.patch(`/orders/${cancelModalOrder.id}/cancel`, {
        reason: cancelReason || "Cancelled by customer from My Orders",
      });
      showToast(`Order #${cancelModalOrder.id} has been cancelled successfully.`);
      setCancelModalOrder(null);
      setCancelReason("");
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel order", "error");
    } finally {
      setCancelling(false);
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const activeCount = orders.filter((o) =>
      ["pending", "confirmed", "processing", "shipped"].includes(o.status)
    ).length;
    const deliveredCount = orders.filter((o) => o.status === "delivered").length;
    const totalSpent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return { totalCount, activeCount, deliveredCount, totalSpent };
  }, [orders]);

  // Filtered and Searched Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status tab filter
      if (filter === "active") {
        if (!["pending", "confirmed", "processing", "shipped"].includes(o.status)) return false;
      } else if (filter !== "all" && o.status !== filter) {
        return false;
      }
      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (o.id || "").toLowerCase().includes(q);
        const matchesAddress = (o.address || "").toLowerCase().includes(q);
        const matchesItem = (o.items || []).some((it) => (it.name || "").toLowerCase().includes(q));
        return matchesId || matchesAddress || matchesItem;
      }
      return true;
    });
  }, [orders, filter, searchQuery]);

  return (
    <PageWrapper>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="min-h-screen bg-[#F4F6F8] pb-28 text-slate-800">
        {/* ── TOP HERO BANNER ── */}
        <div className="bg-gradient-to-b from-[#0A2E1C] via-[#0D3B24] to-[#12462C] text-white pt-8 pb-16 px-4 sm:px-8 lg:px-12 xl:px-16 border-b border-emerald-950/30">
          <div className="w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-emerald-200/80 mb-3 font-medium">
              <span
                onClick={() => navigate("/home")}
                className="hover:text-amber-300 transition-colors cursor-pointer"
              >
                Home
              </span>
              <span>/</span>
              <span className="text-amber-400 font-semibold">My Orders</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                  <span>My Orders</span>
                  <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full font-bold">
                    {orders.length} Total
                  </span>
                </h1>
                <p className="text-emerald-100/70 text-sm mt-1.5 max-w-2xl">
                  Track real-time delivery status, access instant receipts, and quickly reorder farm-fresh groceries.
                </p>
              </div>

              {/* Action button */}
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Shop Fresh Produce</span>
              </button>
            </div>

            {/* ── METRIC STAT CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5 mt-8">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15 shadow-sm">
                <div className="text-emerald-200/80 text-xs font-bold uppercase tracking-wider">Total Orders</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">{metrics.totalCount}</div>
                <div className="text-[11px] text-emerald-300/70 mt-0.5">Lifetime history</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15 shadow-sm">
                <div className="text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>In Progress</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">{metrics.activeCount}</div>
                <div className="text-[11px] text-amber-200/70 mt-0.5">Active deliveries</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15 shadow-sm">
                <div className="text-emerald-200/80 text-xs font-bold uppercase tracking-wider">Delivered</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">{metrics.deliveredCount}</div>
                <div className="text-[11px] text-emerald-300/70 mt-0.5">Fulfilled orders</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition hover:bg-white/15 shadow-sm">
                <div className="text-emerald-200/80 text-xs font-bold uppercase tracking-wider">Total Spent</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">
                  ₦{metrics.totalSpent.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-300/70 mt-0.5">Gross purchases</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT CONTAINER (FULL WIDTH FROM LEFT TO RIGHT) ── */}
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 -mt-6">
          {/* ── FILTER, SEARCH & VIEW SWITCHER TOOLBAR ── */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 mb-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { key: "all", label: "All Orders", count: orders.length },
                { key: "active", label: "In Transit", count: metrics.activeCount },
                { key: "confirmed", label: "Confirmed", count: orders.filter((o) => o.status === "confirmed").length },
                { key: "delivered", label: "Delivered", count: metrics.deliveredCount },
                { key: "cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "cancelled").length },
              ].map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#0A2E1C] text-white shadow-md shadow-emerald-950/20"
                        : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        isActive ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right toolbar: Search + Grid/List Mode Toggle */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <svg
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order ID, item..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2E1C]/20 focus:border-[#0A2E1C] transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* View Layout Switcher (Grid: Left-to-Right / List) */}
              <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid View (Left to Right)"
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === "grid" ? "bg-white text-[#0A2E1C] shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="Full Width List View"
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === "list" ? "bg-white text-[#0A2E1C] shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 text-red-700">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-bold text-sm">Failed to load orders</div>
                  <div className="text-xs text-red-600">{error}</div>
                </div>
              </div>
              <button
                onClick={fetchOrders}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── ORDER CARDS CONTAINER (LEFT TO RIGHT FULL WIDTH GRID OR LIST) ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm my-4"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-4xl mb-4 border border-emerald-100">
                📦
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">
                {searchQuery ? "No matching orders found" : filter === "all" ? "No orders placed yet" : `No ${filter} orders found`}
              </h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto mb-6">
                {searchQuery
                  ? `We couldn't find any orders matching "${searchQuery}". Try a different search term or clear the filter.`
                  : "Explore our farm-fresh organic produce, meats, oils, and grains, and place your first order today!"}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate("/products")}
                  className="bg-gradient-to-r from-[#0A2E1C] to-[#12462C] hover:from-[#082416] hover:to-[#0A2E1C] text-amber-300 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-950/20 transition-all hover:scale-105"
                >
                  Start Shopping Now
                </button>
              )}
            </motion.div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start"
                  : "space-y-6"
              }
            >
              <AnimatePresence>
                {filteredOrders.map((order, orderIndex) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const formattedDate = new Date(order.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const estDelivery = new Date(
                    new Date(order.created_at).getTime() + 3 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const isDelivered = order.status === "delivered";
                  const isCancelled = order.status === "cancelled";
                  const isInProgress = !isDelivered && !isCancelled;
                  const canCancel = ["pending", "confirmed"].includes(order.status);

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2, delay: orderIndex * 0.03 }}
                      className={`bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col border-t-4 ${cfg.cardAccent}`}
                    >
                      {/* ── CARD TOP HEADER STRIP (DISTINCT STATUS-COLORED BACKGROUND) ── */}
                      <div className={`${cfg.headerBg} px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3`}>
                        {/* Order ID & Tag */}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/90 shadow-2xs flex items-center justify-center text-slate-700 text-xs font-black">
                            #{orderIndex + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 tracking-tight">
                                #{order.id}
                              </span>
                              <button
                                onClick={() => handleCopy(order.id)}
                                title="Copy Order ID"
                                className="text-slate-400 hover:text-emerald-700 p-0.5 transition"
                              >
                                {copiedId === order.id ? (
                                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                              Placed on {formattedDate}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              borderColor: cfg.border,
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs"
                          >
                            <span
                              style={{ backgroundColor: cfg.dot }}
                              className={`w-2 h-2 rounded-full ${isInProgress ? "animate-pulse" : ""}`}
                            />
                            <span>{cfg.label}</span>
                          </span>

                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            title="View Full Order Details"
                            className="p-1 rounded-lg hover:bg-white/80 text-slate-500 hover:text-slate-900 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* ── ACTIVE PROGRESS STEPPER (FOR IN PROGRESS ORDERS) ── */}
                      {isInProgress && cfg.stepIndex >= 0 && (
                        <div className="bg-emerald-50/50 px-5 py-2.5 border-b border-emerald-100/70">
                          <div className="flex items-center justify-between">
                            {STEPS.map((stepName, stepIdx) => {
                              const isPassed = stepIdx <= cfg.stepIndex;
                              const isCurrent = stepIdx === cfg.stepIndex;
                              return (
                                <div key={stepName} className="flex-1 flex flex-col items-center relative">
                                  {stepIdx > 0 && (
                                    <div
                                      className={`absolute top-2 -left-1/2 w-full h-0.5 -z-0 transition-colors ${
                                        isPassed ? "bg-emerald-600" : "bg-slate-200"
                                      }`}
                                    />
                                  )}
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black z-10 transition-all ${
                                      isCurrent
                                        ? "bg-emerald-600 text-white ring-3 ring-emerald-200 scale-110"
                                        : isPassed
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {isPassed ? "✓" : stepIdx + 1}
                                  </div>
                                  <span
                                    className={`text-[9px] mt-0.5 font-bold tracking-tight text-center ${
                                      isCurrent ? "text-emerald-800" : isPassed ? "text-slate-700" : "text-slate-400"
                                    }`}
                                  >
                                    {stepName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── CARD BODY (ORDER ITEMS LIST) ── */}
                      <div className="p-5 flex-1 space-y-3 divide-y divide-slate-100">
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3.5 ${idx > 0 ? "pt-3" : ""}`}
                          >
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

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                {item.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md tabular-nums">
                                  ₦{(parseFloat(item.price) || 0).toLocaleString()} each
                                </span>
                                <span className="text-xs font-bold text-slate-600">
                                  Qty: <strong className="text-slate-900">{item.quantity}</strong>
                                </span>
                                {Number(item.quantity) > 1 && (
                                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                                    = ₦{((parseFloat(item.price) || 0) * Number(item.quantity)).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── TOTAL & BILL SUMMARY BAR ── */}
                      <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Order Total
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-emerald-900 tabular-nums">
                              ₦{(parseFloat(order.total) || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              (incl. delivery)
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {isInProgress && (
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                              <span>Live Map</span>
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              onClick={() => handleReorder(order)}
                              className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                            >
                              <span>Order Again</span>
                            </button>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => {
                                setCancelModalOrder(order);
                                setCancelReason("");
                              }}
                              className="inline-flex items-center border border-red-200 hover:bg-red-50 text-red-700 text-[11px] font-bold px-3 py-2 rounded-xl transition"
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="inline-flex items-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold px-3 py-2 rounded-xl transition"
                          >
                            Details
                          </button>
                        </div>
                      </div>

                      {/* ── CARD FOOTER (DELIVERY ADDRESS & ETA) ── */}
                      <div className="bg-slate-100/60 px-5 py-2.5 border-t border-slate-200/60 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <svg className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">
                            <strong className="text-slate-800">Ship to:</strong> {order.address || "Main Store Pick-Up"}
                          </span>
                        </div>

                        {!isCancelled && (
                          <div className="flex items-center gap-1 flex-shrink-0 font-semibold text-slate-700">
                            <span>{isDelivered ? "✅ Delivered" : "🚚 ETA:"}</span>
                            <span className="text-emerald-800 font-bold">{isDelivered ? formattedDate : estDelivery}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── CANCEL ORDER CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {cancelModalOrder && (
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
                Cancel Order #{cancelModalOrder.id}?
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5">
                Are you sure you want to cancel this order? Stock will be immediately restored and payment will be refunded to your wallet.
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
                  onClick={() => setCancelModalOrder(null)}
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
