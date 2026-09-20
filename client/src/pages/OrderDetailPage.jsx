import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ordersAPI } from "../services/api";
import Toast from "../components/ui/Toast";
import LiveOrderMap from "../components/ui/LiveOrderMap";
import { getProductImage } from "../utils/productImages";

const STATUS_CONFIG = {
  pending: {
    label: "Order Placed",
    bg: "#FEF3C7",
    color: "#92400E",
    dot: "#F59E0B",
    stepIndex: 0,
    desc: "Order received and awaiting warehouse processing",
  },
  confirmed: {
    label: "Confirmed & Paid",
    bg: "#DBEAFE",
    color: "#1E40AF",
    dot: "#3B82F6",
    stepIndex: 1,
    desc: "Payment verified, farm produce queued for packaging",
  },
  processing: {
    label: "Packaging & Quality Inspection",
    bg: "#EDE9FE",
    color: "#5B21B6",
    dot: "#8B5CF6",
    stepIndex: 2,
    desc: "Items sorted, de-stoned, and sealed in tamper-proof crates",
  },
  shipped: {
    label: "Dispatched · In Transit",
    bg: "#FEF9C3",
    color: "#713F12",
    dot: "#EAB308",
    stepIndex: 3,
    desc: "Courier assigned and en route with your fresh produce",
  },
  en_route: {
    label: "Out For Doorstep Delivery",
    bg: "#FEF9C3",
    color: "#713F12",
    dot: "#EAB308",
    stepIndex: 3,
    desc: "Courier is approaching your delivery destination",
  },
  out_for_delivery: {
    label: "Out For Doorstep Delivery",
    bg: "#FEF9C3",
    color: "#713F12",
    dot: "#EAB308",
    stepIndex: 3,
    desc: "Courier is nearby with your delivery",
  },
  arrived: {
    label: "Courier Arrived",
    bg: "#D1FAE5",
    color: "#065F46",
    dot: "#10B981",
    stepIndex: 3,
    desc: "Courier is at your doorstep or entrance",
  },
  delivered: {
    label: "Delivered Successfully",
    bg: "#D1FAE5",
    color: "#065F46",
    dot: "#10B981",
    stepIndex: 4,
    desc: "Order has been safely delivered to your doorstep",
  },
  cancelled: {
    label: "Cancelled",
    bg: "#FEE2E2",
    color: "#991B1B",
    dot: "#EF4444",
    stepIndex: -1,
    desc: "This order was cancelled",
  },
};

const MILESTONE_STEPS = [
  { key: "pending", label: "Placed", desc: "Order Logged" },
  { key: "confirmed", label: "Confirmed", desc: "Payment Verified" },
  { key: "processing", label: "Packaging", desc: "Sealed & Inspected" },
  { key: "shipped", label: "Out for Delivery", desc: "En Route on Map" },
  { key: "delivered", label: "Delivered", desc: "Doorstep Arrival" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: cfg.bg,
        color: cfg.color,
        padding: "6px 16px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        border: `1px solid ${cfg.dot}33`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: cfg.dot,
        }}
      />
      {cfg.label}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const pollingTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await ordersAPI.getById(id);
      const fetchedOrder = res.data?.order || res.data;
      setOrder(fetchedOrder);
    } catch {
      if (!silent) navigate("/orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate]);

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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "var(--body-font)",
        }}
      >
        <div>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #E5E7EB",
              borderTopColor: "#2E7D32",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#9CA3AF", textAlign: "center" }}>
            Loading order...
          </p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const items = order.items || order.order_items || [];
  const total = Number(order.total || 0);
  const subtotal = Number(order.subtotal || total - 1500 > 0 ? order.subtotal || (total - 1500) : total);
  const deliveryFee = Number(order.delivery_fee || 1500);
  const date = new Date(order.created_at || order.createdAt);

  const isIncomplete = !["delivered", "cancelled"].includes(String(order.status).toLowerCase());
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  // Check if eligible for return (delivered within last 7 days)
  const updatedAt = new Date(
    order.delivered_at || order.updated_at || order.updatedAt || order.created_at,
  );
  const daysSinceUpdate =
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const canReturn = order.status === "delivered" && daysSinceUpdate <= 7;
  const canCancel = order.status === "pending" || order.status === "confirmed";

  const handleCancel = async () => {
    setShowCancelConfirm(false);
    try {
      await ordersAPI.cancel(order.id, "Cancelled by customer");
      setOrder((prev) => ({ ...prev, status: "cancelled" }));
      showToast("Order cancelled");
    } catch {
      showToast("Failed to cancel order.", "error");
    }
  };

  return (
    <div
      style={{
        fontFamily: "var(--body-font)",
        padding: "32px 5%",
        maxWidth: 920,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div
          onClick={() => setShowCancelConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1054,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 400,
              padding: 28,
              textAlign: "center",
              boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 16px",
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0D1117", margin: "0 0 8px" }}>
              Cancel this order?
            </h3>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.5 }}>
              This action cannot be undone. Your allocated items will be returned to stock.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1.5px solid #E5E7EB",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "#DC2626",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          fontSize: 13,
          color: "#9CA3AF",
        }}
      >
        <Link to="/" style={{ color: "#9CA3AF", textDecoration: "none" }}>
          Home
        </Link>
        <span>/</span>
        <Link to="/orders" style={{ color: "#9CA3AF", textDecoration: "none" }}>
          My Orders
        </Link>
        <span>/</span>
        <span style={{ color: "#1a1a1a", fontWeight: 700 }}>
          #{String(order.id).toUpperCase().slice(-10)}
        </span>
      </div>

      {/* Top Header Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#0D1117",
                  margin: 0,
                }}
              >
                Order #{String(order.id).toUpperCase().slice(-10)}
              </h1>
              {isIncomplete && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    background: "#ecfdf5",
                    color: "#059669",
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontWeight: 700,
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#10b981",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  Live Tracking
                </span>
              )}
            </div>
            <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>
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
          <StatusBadge status={order.status} />
        </div>

        {/* Milestone Progress Bar */}
        {!isCancelled && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {MILESTONE_STEPS.map((step, i, arr) => {
                const currentIdx = cfg.stepIndex >= 0 ? cfg.stepIndex : 0;
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;

                return (
                  <div
                    key={step.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: i < arr.length - 1 ? 1 : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isDone
                          ? "linear-gradient(135deg, #15803d 0%, #16a34a 100%)"
                          : "#f1f5f9",
                        color: isDone ? "#ffffff" : "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow: isCurrent ? "0 0 0 4px #bbf7d0" : "none",
                        border: isDone ? "2px solid #ffffff" : "1.5px solid #e2e8f0",
                        transition: "all 0.3s",
                      }}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: 3,
                          background: i < currentIdx ? "#16a34a" : "#e2e8f0",
                          transition: "background 0.3s",
                          margin: "0 4px",
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              {MILESTONE_STEPS.map((s, i) => {
                const isCurrent = i === cfg.stepIndex;
                return (
                  <div key={s.key} style={{ flex: 1, textAlign: i === 0 ? "left" : i === MILESTONE_STEPS.length - 1 ? "right" : "center" }}>
                    <div style={{ fontSize: 11, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "#15803d" : "#475569" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── REAL-TIME MAP & COURIER MOVEMENT (FOR INCOMPLETE / IN-PROGRESS ORDERS) ── */}
      {isIncomplete && (
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "24px",
            marginBottom: 20,
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0D1117", margin: "0 0 2px" }}>
                🗺️ Real-Time Delivery Map &amp; ETA
              </h2>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                Live GPS movement tracking from Bems Farms Dispatch Hub to your doorstep.
              </p>
            </div>
            {order.eta_minutes != null && (
              <span
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "1px solid #fde68a",
                }}
              >
                ⏱️ Estimated Arrival: ~{order.eta_minutes} mins
              </span>
            )}
          </div>

          <LiveOrderMap
            customerLat={order.customer_lat}
            customerLng={order.customer_lng}
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
        </div>
      )}

      {/* ── ASSIGNED COURIER PROFILE (IF ASSIGNED) ── */}
      {order.driver_name && (
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
            color: "#fff",
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 20,
            boxShadow: "0 6px 20px rgba(4,120,87,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            >
              🛵
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#a7f3d0", fontWeight: 700 }}>
                Assigned Delivery Courier
              </div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{order.driver_name}</div>
              <div style={{ fontSize: 12, color: "#d1fae5" }}>
                {order.vehicle_type || "Motorcycle"} {order.vehicle_plate ? `(${order.vehicle_plate})` : ""} · {order.driver_rating ? `⭐ ${order.driver_rating}` : "⭐ 5.0 Star Courier"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {order.driver_phone && (
              <a
                href={`tel:${order.driver_phone}`}
                style={{
                  background: "#ffffff",
                  color: "#064e3b",
                  padding: "9px 18px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <span>📞</span>
                <span>Call Driver</span>
              </a>
            )}
            {order.driver_phone && (
              <a
                href={`https://wa.me/${String(order.driver_phone).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#f59e0b",
                  color: "#064e3b",
                  padding: "9px 18px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 900,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── ITEMS ORDERED & PRICING BREAKDOWN ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px",
          marginBottom: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#0D1117",
            margin: "0 0 16px",
          }}
        >
          Items in this Order ({items.length})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.length > 0 ? (
            items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "#F8FAFC",
                  borderRadius: 14,
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#e2e8f0",
                  }}
                >
                  <img
                    src={getProductImage(item)}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
                    {item.name || `Produce Item #${i + 1}`}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    Qty: {item.quantity} · ₦{Number(item.price || item.unit_price || 0).toLocaleString()} each
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: "#15803d", fontSize: 15 }}>
                  ₦{(Number(item.quantity) * Number(item.price || item.unit_price || 0)).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>No item details available</p>
          )}
        </div>

        {/* Bill Breakdown */}
        <div
          style={{
            borderTop: "2px solid #F3F4F6",
            marginTop: 20,
            paddingTop: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#64748b" }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>₦{subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: "#64748b" }}>
            <span>Doorstep Delivery Fee</span>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>₦{deliveryFee.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 12,
              borderTop: "1px dashed #e2e8f0",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              Total Amount
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#15803d" }}>
              ₦{total.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 6,
              textAlign: "right",
            }}
          >
            Paid via {order.payment_method === "monnify" ? "Online Payment (Monnify)" : (order.payment_method || "Online Payment")}
          </div>
        </div>
      </div>

      {/* ── DELIVERY DESTINATION DETAILS ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0D1117", margin: "0 0 12px" }}>
          📍 Delivery Destination Details
        </h2>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700 }}>{order.address || "Main Store Pick-Up / Delivery Address"}</div>
          {order.delivery_city && <div style={{ color: "#64748b" }}>{order.delivery_city}</div>}
          {order.zone_name && (
            <span style={{ display: "inline-block", background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: 6, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
              Zone: {order.zone_name}
            </span>
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "20px 28px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {canCancel && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              padding: "11px 22px",
              borderRadius: 12,
              border: "1.5px solid #EF4444",
              background: "#FEF2F2",
              color: "#DC2626",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel Order
          </button>
        )}

        {canReturn && (
          <button
            onClick={() => navigate("/returns", { state: { orderId: order.id } })}
            style={{
              padding: "11px 22px",
              borderRadius: 12,
              border: "1.5px solid #F59E0B",
              background: "#FEF3C7",
              color: "#92400E",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Request Return
          </button>
        )}

        <Link
          to="/products"
          style={{
            padding: "11px 24px",
            borderRadius: 12,
            background: "#15803d",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
          }}
        >
          Shop More Produce →
        </Link>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

