// ─── Admin Orders Page with Status Change ────────────────────────────────────
// Drop this file in: src/pages/admin/AdminOrdersPage.jsx  (or wherever your admin orders page lives)
// It adds a status dropdown + confirm button to each order row/detail.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ordersAPI } from "../../services/api"; // adjust import path to match your project

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

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

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
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.dot,
        }}
      />
      {cfg.label}
    </span>
  );
}

function StatusUpdater({ order, onUpdated }) {
  const [selectedStatus, setSelectedStatus] = useState(
    order.status || "pending",
  );
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (selectedStatus === order.status) return;
    setUpdating(true);
    setSuccess(false);
    try {
      // Calls PATCH /api/orders/:id/status  — add this route to your backend
      await ordersAPI.updateStatus(order.id, selectedStatus);
      setSuccess(true);
      onUpdated(order.id, selectedStatus);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const cfg = STATUS_CONFIG[selectedStatus] || STATUS_CONFIG.pending;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        style={{
          padding: "7px 12px",
          border: `2px solid ${cfg.dot}`,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: cfg.color,
          background: cfg.bg,
          cursor: "pointer",
          outline: "none",
          transition: "all 0.2s",
        }}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>

      <button
        onClick={handleUpdate}
        disabled={updating || selectedStatus === order.status}
        style={{
          padding: "7px 16px",
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 10,
          border: "none",
          cursor:
            updating || selectedStatus === order.status
              ? "not-allowed"
              : "pointer",
          background: success
            ? "#10B981"
            : selectedStatus === order.status
              ? "#E5E7EB"
              : "#2E7D32",
          color: selectedStatus === order.status ? "#9CA3AF" : "#fff",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {updating ? (
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        ) : success ? (
          "✓ Updated!"
        ) : (
          "Update Status"
        )}
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    ordersAPI
      .getAll()
      .then((res) => {
        const data = res.data?.orders || res.data || [];
        setOrders(data);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdated = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
  };

  const filtered = orders.filter((o) => {
    const matchesStatus = filterStatus === "all" || o.status === filterStatus;
    const matchesSearch =
      !search ||
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const stats = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        padding: "32px",
        minHeight: "100vh",
        background: "#F8FAFC",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#0D1117",
            margin: "0 0 4px",
          }}
        >
          Orders Management
        </h1>
        <p style={{ color: "#6B7280", fontSize: 15, margin: 0 }}>
          View and update all customer orders
        </p>
      </div>

      {/* Status filter pills */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        <button
          onClick={() => setFilterStatus("all")}
          style={{
            padding: "8px 18px",
            borderRadius: 20,
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            background: filterStatus === "all" ? "#1a1a1a" : "#fff",
            color: filterStatus === "all" ? "#fff" : "#374151",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          All ({orders.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: `2px solid ${filterStatus === s ? cfg.dot : "transparent"}`,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: filterStatus === s ? cfg.bg : "#fff",
                color: filterStatus === s ? cfg.color : "#374151",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s",
              }}
            >
              {cfg.label} ({stats[s] || 0})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or customer name..."
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "10px 16px",
            border: "2px solid #E5E7EB",
            borderRadius: 12,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #E5E7EB",
              borderTopColor: "#2E7D32",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          Loading orders...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "48px 32px",
            textAlign: "center",
            border: "2px dashed #E5E7EB",
          }}
        >
          <div style={{ fontSize: 65, marginBottom: 12 }}>📦</div>
          <h3 style={{ color: "#374151", margin: "0 0 8px" }}>
            No orders found
          </h3>
          <p style={{ color: "#9CA3AF", margin: 0 }}>
            Try adjusting your filter or search
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((order) => {
            const customer =
              order.user?.name || order.customer_name || "Unknown";
            const date = new Date(
              order.created_at || order.createdAt,
            ).toLocaleDateString("en-NG", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const amount = `₦${Number(order.total || order.total || 0).toLocaleString()}`;

            return (
              <div
                key={order.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  flexWrap: "wrap",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(0,0,0,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.04)")
                }
              >
                {/* Order ID */}
                <div style={{ minWidth: 130 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#1a1a1a",
                      marginBottom: 2,
                    }}
                  >
                    #{order.id?.toString().toUpperCase().slice(-10)}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{date}</div>
                </div>

                {/* Customer */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#2E7D32,#F57F17)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {customer.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1a1a1a",
                        }}
                      >
                        {customer}
                      </div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {order.user?.email || ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ minWidth: 90, textAlign: "right" }}>
                  <div
                    style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}
                  >
                    {amount}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {order.items?.length || order.order_items?.length || 1}{" "}
                    item(s)
                  </div>
                </div>

                {/* Current status badge */}
                <div style={{ minWidth: 100 }}>
                  <StatusBadge status={order.status} />
                </div>

                {/* Status updater */}
                <StatusUpdater order={order} onUpdated={handleStatusUpdated} />

                {/* View link */}
                <Link
                  to={`/admin/orders/${order.id}`}
                  style={{
                    color: "#2E7D32",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  View →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
