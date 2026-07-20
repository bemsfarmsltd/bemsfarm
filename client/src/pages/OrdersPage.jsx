import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const PRODUCT_IMAGES = {
  "Ofada Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
  "Long Grain Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141706/long_grain_rice_yn01lt.jpg",
  "Palm Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg",
  "Groundnut Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141769/Groundnut-oil_mgv43t.jpg",
  "Black-eyed Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142333/black-eyed-beans_i2n8fi.jpg",
  "Brown Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141864/brown_beans_zxbjos.jpg",
  "Garri (White)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142399/white_garri_zaq8i4.png",
  "Garri (Yellow)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142425/yellow_garri_kxiyxr.png",
  "Fresh Tomatoes":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg",
  "Dried Crayfish":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141631/crayfish_bslwl4.jpg",
  Cocoyam:
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141939/cocoyam_wvtyqz.png",
  "Ugu Leaves":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142531/ugu_zva1av.png",
};

function getProductImage(item) {
  if (
    item.image_url?.startsWith("data:") ||
    item.image_url?.startsWith("http")
  )
    return item.image_url;
  return (
    PRODUCT_IMAGES[item.name] ||
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"
  );
}

const STATUS_CONFIG = {
  pending: { color: "#D97706", bg: "#FEF3C7", label: "Pending", icon: "⏳" },
  confirmed: { color: "#2563EB", bg: "#DBEAFE", label: "Confirmed", icon: "✅" },
  processing: { color: "#7C3AED", bg: "#EDE9FE", label: "Processing", icon: "📦" },
  shipped: { color: "#2E7D32", bg: "#E8F5E9", label: "Shipped", icon: "🚚" },
  delivered: { color: "#2E7D32", bg: "#E8F5E9", label: "Delivered", icon: "🎉" },
  cancelled: { color: "#DC2626", bg: "#FEF2F2", label: "Cancelled", icon: "❌" },
};

const ORDERS_CSS = `
.op-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #111827;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.op-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.op-title-row h1 {
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1B4332;
  margin: 0;
}
.op-breadcrumb {
  font-size: 13px;
  color: #9CA3AF;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}
.op-breadcrumb span.active {
  color: #1B4332;
  font-weight: 700;
}

/* Category Filter Tabs */
.op-filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.op-filter-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Nunito', sans-serif;
  background-color: #ffffff;
  color: #6B7280;
  border: 1px solid #E5E7EB;
  transition: all 0.2s;
}
.op-filter-btn:hover {
  background-color: #F9FAFB;
}
.op-filter-btn.active {
  background-color: #1B4332;
  border-color: #1B4332;
  color: #ffffff;
}

/* Order block card */
.op-card {
  background-color: white;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}
.op-card:hover {
  box-shadow: 0 6px 24px rgba(0,0,0,0.04);
}

/* Order Card Header row */
.op-card-header {
  background-color: #F9FAFB;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.op-header-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.op-header-label {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.op-header-value {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}
.op-header-value.price {
  color: #1B4332;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
}
.op-header-value.order-num {
  font-size: 12px;
  color: #6B7280;
}
.op-details-link {
  color: #2E7D32;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  text-decoration: underline;
  margin-top: 2px;
  font-family: 'Nunito', sans-serif;
}

/* Order Items list */
.op-card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.op-item-row {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.op-item-left {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.op-item-thumb {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  flex-shrink: 0;
}
.op-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.op-item-info {
  flex: 1;
  min-width: 0;
}
.op-item-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.op-item-name {
  font-size: 15px;
  font-weight: 800;
  color: #111827;
  margin: 0;
}
.op-status-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 50px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.op-item-desc {
  font-size: 12px;
  color: #6B7280;
  margin: 0;
}
.op-item-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.op-qty-box {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #4B5563;
  background-color: #ffffff;
  text-align: center;
  min-width: 48px;
}

/* Button groups */
.op-actions-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  justify-content: center;
}
.op-primary-btn {
  background-color: #F57C00;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(245,124,0,0.15);
  transition: all 0.2s;
}
.op-primary-btn:hover {
  background-color: #E65100;
  box-shadow: 0 4px 12px rgba(245,124,0,0.25);
}
.op-secondary-btn {
  background-color: white;
  border: 1px solid #E5E7EB;
  color: #4B5563;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}
.op-secondary-btn:hover {
  background-color: #F9FAFB;
  color: #111827;
  border-color: #D1D5DB;
}

/* Delivery estimated footer */
.op-card-footer {
  border-top: 1px solid #F3F4F6;
  padding: 14px 24px;
  font-size: 12px;
  font-weight: 700;
  color: #4B5563;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
}

/* RESPONSIVE LAYOUT MEDIA QUERIES */
@media (max-width: 768px) {
  .op-container {
    padding: 20px 16px 60px;
    gap: 20px;
  }
  .op-card-header {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .op-item-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .op-item-right {
    width: 100%;
    justify-content: space-between;
  }
  .op-actions-col {
    align-items: flex-start;
    width: 100%;
  }
  .op-primary-btn, .op-secondary-btn {
    width: 100%;
    text-align: center;
  }
}
`;

export default function OrdersPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert("Please enter a reason");
    setCancelling(true);
    try {
      await api.patch(`/orders/${cancelModal.id}/cancel`, {
        reason: cancelReason,
      });
      setCancelModal(null);
      setCancelReason("");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = (order) => {
    order.items?.forEach((item) => {
      addToCart({
        id: item.product_id,
        name: item.name,
        price: item.price,
        image_url: item.image_url || getProductImage(item),
      });
    });
    alert("Items added to cart! Redirecting to checkout...");
    navigate("/checkout");
  };

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <PageWrapper>
      <div className="op-container">
        <style>{ORDERS_CSS}</style>

        {/* ── 1. BREADCRUMBS & TITLE ── */}
        <div className="op-title-row">
          <div>
            <div className="op-breadcrumb">
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/home")}>Home</span>
              <span>/</span>
              <span className="active">My Orders</span>
            </div>
            <h1 style={{ marginTop: "4px" }}>My Orders</h1>
          </div>

          <p style={{ color: "#6B7280", fontSize: "14px", fontWeight: 600, margin: 0 }}>
            {loading ? "Loading..." : `${orders.length} Total Orders`}
          </p>
        </div>

        {/* ── 2. FILTER TAB BUTTONS ── */}
        <div className="op-filters">
          {[
            { key: "all", label: `All (${orders.length})` },
            { key: "pending", label: "Pending" },
            { key: "confirmed", label: "Confirmed" },
            { key: "delivered", label: "Delivered" },
            { key: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.key}
              className={`op-filter-btn ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── 3. ERROR BANNER ── */}
        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: "#DC2626", margin: "0 0 4px" }}>Failed to load orders</p>
              <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>{error}</p>
            </div>
            <button
              onClick={fetchOrders}
              style={{
                marginLeft: "auto",
                padding: "8px 16px",
                backgroundColor: "#DC2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 4. ORDERS GRID LIST ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "white",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ height: "16px", width: "40%", backgroundColor: "#F3F4F6", borderRadius: "4px", animation: "pulse 1.5s infinite" }} />
                <div style={{ height: "12px", width: "25%", backgroundColor: "#F3F4F6", borderRadius: "4px", animation: "pulse 1.5s infinite" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              backgroundColor: "white",
              borderRadius: "24px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ fontSize: "72px", marginBottom: "20px" }}>📭</div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>
              {filter === "all" ? "No orders yet" : `No ${filter} orders`}
            </h3>
            <p style={{ color: "#9CA3AF", marginBottom: "24px", fontSize: "15px", fontFamily: "Nunito, sans-serif" }}>
              {filter === "all" ? "Your order history will appear here" : `You have no ${filter} orders`}
            </p>
            <button
              onClick={() => navigate("/products")}
              style={{
                backgroundColor: "#1B4332",
                color: "white",
                border: "none",
                borderRadius: "14px",
                padding: "14px 32px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "15px",
                fontFamily: "Nunito, sans-serif",
                boxShadow: "0 4px 16px rgba(27,67,50,0.2)",
              }}
            >
              🛒 Start Shopping
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filtered.map((order, i) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const formattedDate = new Date(order.created_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const estDelivery = new Date(new Date(order.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div key={order.id} className="op-card">
                  {/* Order Card Header row */}
                  <div className="op-card-header">
                    <div className="op-header-col">
                      <span className="op-header-label">Order Placed</span>
                      <span className="op-header-value">{formattedDate}</span>
                    </div>

                    <div className="op-header-col">
                      <span className="op-header-label">Total</span>
                      <span className="op-header-value price">₦{parseFloat(order.total).toLocaleString()}</span>
                    </div>

                    <div className="op-header-col">
                      <span className="op-header-label">Ship To</span>
                      <span className="op-header-value" title={order.address}>{order.address || "Main Store Pick-Up"}</span>
                    </div>

                    <div className="op-header-col" style={{ alignItems: "flex-end" }}>
                      <span className="op-header-label">Order # {order.id}</span>
                      <button className="op-details-link" onClick={() => navigate(`/orders/${order.id}`)}>
                        Order Details
                      </button>
                    </div>
                  </div>

                  {/* Order Card Body block */}
                  <div className="op-card-body">
                    {order.items?.map((item, j) => (
                      <div key={j} className="op-item-row">
                        <div className="op-item-left">
                          <div className="op-item-thumb">
                            <img src={getProductImage(item)} alt={item.name} />
                          </div>
                          <div className="op-item-info">
                            <div className="op-item-name-row">
                              <h4 className="op-item-name">{item.name}</h4>
                              <span className="op-status-tag" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                                {statusConfig.icon} {statusConfig.label}
                              </span>
                            </div>
                            <p className="op-item-desc">
                              Premium organic products directly sourced from Bems Farm fields.
                            </p>
                          </div>
                        </div>

                        <div className="op-item-right">
                          <div className="op-qty-box">
                            Qty: {item.quantity}
                          </div>

                          <div className="op-actions-col">
                            {order.status === "delivered" && (
                              <button className="op-primary-btn" onClick={() => handleReorder(order)}>
                                Order Again
                              </button>
                            )}

                            {order.status === "pending" && (
                              <button className="op-secondary-btn" style={{ color: "#EF4444", borderColor: "#EF4444" }} onClick={() => setCancelModal(order)}>
                                Cancel Order
                              </button>
                            )}

                            <button className="op-secondary-btn" onClick={() => navigate(`/orders/${order.id}`)}>
                              Archive Order
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery estimated footer */}
                  {order.status !== "cancelled" && (
                    <div className="op-card-footer">
                      <i className="ri-truck-line" style={{ color: "#2E7D32", fontSize: "15px" }} />
                      <span>Estimated Delivery:</span>
                      <span style={{ color: "#111827" }}>{estDelivery}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
            onClick={(e) => e.target === e.currentTarget && setCancelModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "28px",
                width: "100%",
                maxWidth: "440px",
                fontFamily: "Nunito, sans-serif"
              }}
            >
              <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px", color: "#111827" }}>
                Cancel Order #{cancelModal.id}?
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px", lineHeight: 1.5 }}>
                This action cannot be undone. A refund will be processed in 3-5 business days.
              </p>

              <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px", display: "block" }}>
                Why are you cancelling? *
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {[
                  "Changed my mind",
                  "Ordered by mistake",
                  "Found a better price",
                  "Taking too long",
                  "Other",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => setCancelReason(r)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      textAlign: "left",
                      border: `2px solid ${cancelReason === r ? "#2E7D32" : "#E5E7EB"}`,
                      backgroundColor: cancelReason === r ? "rgba(46, 125, 50, 0.04)" : "white",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontFamily: "Nunito, sans-serif",
                      color: cancelReason === r ? "#2E7D32" : "#4B5563",
                      fontWeight: cancelReason === r ? 700 : 400,
                      transition: "all 0.2s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                value={cancelReason === "Other" ? "" : cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Or type your own reason..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "10px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "Nunito, sans-serif",
                  marginBottom: "20px",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setCancelModal(null)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: "14px",
                    color: "#4B5563"
                  }}
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!cancelReason || cancelling}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    borderRadius: "12px",
                    backgroundColor: !cancelReason ? "#9CA3AF" : "#EF4444",
                    color: "white",
                    cursor: !cancelReason ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: "14px",
                  }}
                >
                  {cancelling ? "..." : "Cancel Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
