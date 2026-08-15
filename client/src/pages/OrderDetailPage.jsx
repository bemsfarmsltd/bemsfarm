// ─── Order Detail Page with Return Request button ────────────────────────────
// Replace/update your existing OrderDetailPage.jsx with this version.
// It adds a "Request Return" button that appears when order status is "delivered"
// and the delivery was within the last 7 days.

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ordersAPI } from "../services/api"; // adjust path if needed

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "#FEF3C7",
    color: "#92400E",
    dot: "#F59E0B",
  },
  confirmed: {
    label: "Confirmed",
    bg: "#DBEAFE",
    color: "#1E40AF",
    dot: "#3B82F6",
  },
  processing: {
    label: "Processing",
    bg: "#EDE9FE",
    color: "#5B21B6",
    dot: "#8B5CF6",
  },
  shipped: {
    label: "Shipped",
    bg: "#FEF9C3",
    color: "#713F12",
    dot: "#EAB308",
  },
  delivered: {
    label: "Delivered",
    bg: "#D1FAE5",
    color: "#065F46",
    dot: "#10B981",
  },
  cancelled: {
    label: "Cancelled",
    bg: "#FEE2E2",
    color: "#991B1B",
    dot: "#EF4444",
  },
};

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
        fontSize: 14,
        fontWeight: 700,
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI
      .getById(id)
      .then((res) => setOrder(res.data?.order || res.data))
      .catch(() => navigate("/orders"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "'Inter', sans-serif",
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
  const date = new Date(order.created_at || order.createdAt);

  // Check if eligible for return (delivered within last 7 days)
  const updatedAt = new Date(
    order.updated_at || order.updatedAt || order.created_at,
  );
  const daysSinceUpdate =
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const canReturn = order.status === "delivered" && daysSinceUpdate <= 7;
  const canCancel = order.status === "pending";

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await ordersAPI.cancel(order.id, "Cancelled by customer");
      setOrder((prev) => ({ ...prev, status: "cancelled" }));
    } catch {
      alert("Failed to cancel order.");
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        padding: "32px 5%",
        maxWidth: 800,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          fontSize: 14,
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
        <span style={{ color: "#1a1a1a", fontWeight: 600 }}>
          #{String(order.id).toUpperCase().slice(-10)}
        </span>
      </div>

      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 32px",
          marginBottom: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
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
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#0D1117",
                margin: "0 0 6px",
              }}
            >
              Order Details
            </h1>
            <p style={{ color: "#9CA3AF", fontSize: 14, margin: 0 }}>
              #{String(order.id).toUpperCase().slice(-10)} · Placed{" "}
              {date.toLocaleDateString("en-NG", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Status timeline */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 0,
            alignItems: "center",
          }}
        >
          {["pending", "confirmed", "processing", "shipped", "delivered"].map(
            (s, i, arr) => {
              const statuses = [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
              ];
              const currentIdx = statuses.indexOf(
                order.status === "cancelled" ? "pending" : order.status,
              );
              const stepIdx = statuses.indexOf(s);
              const isPast = stepIdx <= currentIdx;
              const isCancelled = order.status === "cancelled";
              const sCfg = STATUS_CONFIG[s];

              return (
                <div
                  key={s}
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
                      background: isCancelled
                        ? "#FEE2E2"
                        : isPast
                          ? "linear-gradient(135deg,#2E7D32,#388E3C)"
                          : "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${isCancelled ? "#EF4444" : isPast ? "#2E7D32" : "#E5E7EB"}`,
                      transition: "all 0.3s",
                    }}
                  >
                    {isPast && !isCancelled ? (
                      <span style={{ color: "#fff", fontSize: 19 }}>✓</span>
                    ) : (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: isCancelled ? "#EF4444" : "#D1D5DB",
                        }}
                      />
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background:
                          isPast && !isCancelled ? "#2E7D32" : "#E5E7EB",
                        transition: "background 0.3s",
                      }}
                    />
                  )}
                </div>
              );
            },
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {["Pending", "Confirmed", "Processing", "Shipped", "Delivered"].map(
            (l) => (
              <span
                key={l}
                style={{
                  fontSize: 10,
                  color: "#9CA3AF",
                  fontWeight: 600,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                {l}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Items */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 32px",
          marginBottom: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0D1117",
            margin: "0 0 20px",
          }}
        >
          Items Ordered
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.length > 0 ? (
            items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px",
                  background: "#F8FAFC",
                  borderRadius: 12,
                }}
              >
                {item.product?.image_url && (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}
                  >
                    {item.product?.name || item.product_name || `Item ${i + 1}`}
                  </div>
                  <div style={{ color: "#9CA3AF", fontSize: 13 }}>
                    Qty: {item.quantity} · ₦
                    {Number(item.price || item.unit_price || 0).toLocaleString()} each
                  </div>
                </div>
                <div
                  style={{ fontWeight: 800, color: "#1a1a1a", fontSize: 16 }}
                >
                  ₦
                  {(
                    Number(item.quantity) *
                    Number(item.price || item.unit_price || 0)
                  ).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#9CA3AF", fontSize: 14 }}>
              No item details available
            </p>
          )}
        </div>

        <div
          style={{
            borderTop: "2px solid #F3F4F6",
            marginTop: 20,
            paddingTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
              Total Amount
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>
              ₦{total.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#9CA3AF",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            Paid via {order.payment_method || "Monnify"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "24px 32px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0D1117",
            margin: "0 0 16px",
          }}
        >
          Order Actions
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {/* Cancel button */}
          {canCancel && (
            <button
              onClick={handleCancel}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "2px solid #EF4444",
                background: "#FEF2F2",
                color: "#DC2626",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#DC2626";
                e.target.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#FEF2F2";
                e.target.style.color = "#DC2626";
              }}
            >
              Cancel Order
            </button>
          )}

          {/* Return button — only for delivered orders within 7 days */}
          {canReturn && (
            <button
              onClick={() => navigate("/returns", { state: { orderId: order.id } })}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "2px solid #F59E0B",
                background: "#FEF3C7",
                color: "#92400E",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F59E0B";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "#F59E0B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FEF3C7";
                e.currentTarget.style.color = "#92400E";
                e.currentTarget.style.borderColor = "#F59E0B";
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=20&q=80"
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              Request Return
            </button>
          )}

          {/* Return ineligible notice */}
          {order.status === "delivered" && !canReturn && (
            <div
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#9CA3AF",
                fontSize: 14,
              }}
            >
              Return window has expired (7 days from delivery)
            </div>
          )}

          <Link
            to="/products"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "#2E7D32",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Shop Again →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
