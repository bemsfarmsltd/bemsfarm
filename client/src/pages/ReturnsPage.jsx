import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../services/api";

const RETURN_REASONS = [
  { value: "damaged",      label: "🚫 Item arrived damaged",        desc: "Product was broken, crushed, or spoiled on arrival"     },
  { value: "wrong_item",   label: "❓ Received wrong item",          desc: "I received a different product than what I ordered"     },
  { value: "quality",      label: "😞 Quality not as expected",      desc: "The quality did not meet the description"               },
  { value: "changed_mind", label: "💭 Changed my mind",              desc: "I no longer need this item"                            },
  { value: "other",        label: "📝 Other reason",                 desc: "Something else — please describe below"                },
];

const CONDITION_OPTIONS = [
  { value: "reusable",      label: "✅ Reusable",       desc: "Can go back to stock" },
  { value: "damaged",       label: "❌ Damaged",         desc: "Write off to Lost & Damaged" },
  { value: "partial_goods", label: "⚠️ Partial Goods",  desc: "Partially good — needs review" },
];

const card = {
  backgroundColor: "white",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
  border: "1px solid #F3F4F6",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #E5E7EB",
  borderRadius: "10px",
  fontSize: "13px",
  fontFamily: "Nunito, sans-serif",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
  background: "white",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#374151",
  marginBottom: "5px",
  display: "block",
};

const stepTitle = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: "16px",
  color: "#111827",
  marginBottom: "16px",
};

export default function ReturnsPage() {
  const navigate  = useNavigate();
  const [orders, setOrders]               = useState([]);
  const [myReturns, setMyReturns]         = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason]               = useState("");
  const [description, setDescription]     = useState("");
  // keyed by product_id (string): { selected, returnQty, condition, remarks, product_name, ordered_quantity }
  const [returnItems, setReturnItems]     = useState({});
  const [submitting, setSubmitting]       = useState(false);
  const [success, setSuccess]             = useState(false);
  const [tab, setTab]                     = useState("new");

  useEffect(() => {
    api.get("/orders").then((r) =>
      setOrders(r.data.orders.filter((o) => o.status === "delivered"))
    );
    api.get("/orders/returns").then((r) => setMyReturns(r.data.returns));
  }, []);

  // Initialise returnItems when an order is selected
  function selectOrder(order) {
    setSelectedOrder(order);
    const init = {};
    (order.items || []).forEach((item) => {
      const key = String(item.product_id);
      init[key] = {
        selected:          false,
        returnQty:         item.quantity,
        condition:         "",
        remarks:           "",
        product_name:      item.name,
        ordered_quantity:  item.quantity,
      };
    });
    setReturnItems(init);
  }

  function toggleItem(productId) {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], selected: !prev[productId].selected },
    }));
  }

  function updateItem(productId, field, value) {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  const selectedItemsList = Object.entries(returnItems).filter(([, v]) => v.selected);

  // ── Validation ────────────────────────────────────────────────
  function validate() {
    if (!selectedOrder)    return "Please select an order.";
    if (!reason)           return "Please select a reason for return.";
    if (reason === "other" && !description.trim())
      return "Please specify your reason in the text field.";
    if (selectedItemsList.length === 0)
      return "Please select at least one item to return.";
    for (const [key, v] of selectedItemsList) {
      if (!v.returnQty || v.returnQty <= 0)
        return `Return quantity for "${v.product_name}" must be at least 1.`;
      if (v.returnQty > v.ordered_quantity)
        return `Return quantity for "${v.product_name}" cannot exceed ${v.ordered_quantity} (ordered qty).`;
      if (!v.condition)
        return `Please select a return condition for "${v.product_name}".`;
    }
    return null;
  }

  const validationError = validate();

  const handleSubmit = async () => {
    if (validationError) return alert(validationError);

    const itemsPayload = selectedItemsList.map(([productId, v]) => ({
      product_id:        parseInt(productId),
      product_name:      v.product_name,
      ordered_quantity:  v.ordered_quantity,
      returned_quantity: Number(v.returnQty),
      condition:         v.condition,
      remarks:           v.remarks.trim() || null,
    }));

    setSubmitting(true);
    try {
      await api.post("/orders/returns", {
        order_id:    selectedOrder.id,
        reason,
        description: description.trim(),
        items:       itemsPayload,
      });
      setSuccess(true);
      api.get("/orders/returns").then((r) => setMyReturns(r.data.returns));
    } catch (err) {
      alert(err.response?.data?.message || "Return submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  function resetForm() {
    setSuccess(false);
    setSelectedOrder(null);
    setReason("");
    setDescription("");
    setReturnItems({});
  }

  const statusColors = {
    submitted: { bg: "#FEF3C7", color: "#92400E", label: "Under Review" },
    approved:  { bg: "#D1FAE5", color: "#065F46", label: "Approved"     },
    rejected:  { bg: "#FEE2E2", color: "#991B1B", label: "Rejected"     },
    refunded:  { bg: "#DBEAFE", color: "#1E40AF", label: "Refunded"     },
    exchanged: { bg: "#E0E7FF", color: "#3730A3", label: "Exchanged"    },
  };

  const conditionLabel = {
    reusable:      { label: "Reusable",       color: "#065F46", bg: "#D1FAE5" },
    damaged:       { label: "Damaged",         color: "#991B1B", bg: "#FEE2E2" },
    partial_goods: { label: "Partial Goods",   color: "#92400E", bg: "#FEF3C7" },
  };

  return (
    <PageWrapper>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)", padding: "48px 40px 36px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
            <button onClick={() => navigate("/home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
              Home
            </button>
            <span> / </span>
            <span style={{ color: "white" }}>Returns & Refunds</span>
          </div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, color: "white", marginBottom: "8px" }}>
            Returns & Refunds
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px" }}>
            Return items within 7 days of delivery • Refunds processed in 3-5 business days
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: "2px solid #F3F4F6", marginBottom: "28px" }}>
          {["new", "history"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "14px",
              fontWeight: tab === t ? 700 : 500, fontFamily: "Nunito, sans-serif",
              backgroundColor: "transparent", color: tab === t ? "#1B4332" : "#9CA3AF",
              borderBottom: `2px solid ${tab === t ? "#40916C" : "transparent"}`, marginBottom: "-2px",
            }}>
              {t === "new" ? "+ New Return Request" : `My Returns (${myReturns.length})`}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {tab === "new" ? (
          success ? (
            /* ── Success state ─────────────────────────────────── */
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", padding: "60px 20px", ...card }}>
              <div style={{ fontSize: "80px", marginBottom: "20px" }}>✅</div>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "24px", fontWeight: 800, color: "#1B4332", marginBottom: "12px" }}>
                Return Request Submitted!
              </h2>
              <p style={{ color: "#6B7280", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px", lineHeight: 1.6 }}>
                We've received your return request and will review it within 24 hours. You'll be notified by email.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={resetForm}
                  style={{ padding: "12px 24px", backgroundColor: "#1B4332", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                  Submit Another Return
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setTab("history")}
                  style={{ padding: "12px 24px", backgroundColor: "white", color: "#1B4332", border: "1px solid #E5E7EB", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                  View My Returns
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* ── Return Policy Banner ───────────────────────── */}
              <div style={{ backgroundColor: "#F0FFF4", border: "1px solid #A7F3D0", borderRadius: "16px", padding: "16px 20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>ℹ️</span>
                <div>
                  <p style={{ fontWeight: 700, color: "#065F46", marginBottom: "6px", fontSize: "14px" }}>Return Policy</p>
                  <ul style={{ color: "#047857", fontSize: "13px", paddingLeft: "16px", lineHeight: 2 }}>
                    <li>Returns accepted within 7 days of delivery</li>
                    <li>Items must be in original, unopened condition (except damaged items)</li>
                    <li>Refund processed to original payment method in 3-5 business days</li>
                    <li>You may also opt for an exchange of equal value</li>
                  </ul>
                </div>
              </div>

              {/* ── Step 1: Select Order ───────────────────────── */}
              <div style={card}>
                <h3 style={stepTitle}>Step 1 — Select the Order</h3>
                {orders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF" }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                    <p style={{ fontSize: "14px" }}>No delivered orders eligible for return</p>
                    <p style={{ fontSize: "13px" }}>Only orders delivered within the last 7 days can be returned</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {orders.map((order) => (
                      <div key={order.id} onClick={() => selectOrder(order)} style={{
                        padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                        border: `2px solid ${selectedOrder?.id === order.id ? "#40916C" : "#E5E7EB"}`,
                        backgroundColor: selectedOrder?.id === order.id ? "#F0FFF4" : "white",
                        transition: "all 0.2s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>#{order.id}</p>
                            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>
                              {new Date(order.created_at || order.date).toLocaleDateString()} • {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <p style={{ fontWeight: 800, color: "#1B4332", fontSize: "15px" }}>
                            ₦{parseFloat(order.total).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Step 2: Items to Return ────────────────────── */}
              {selectedOrder && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={card}>
                  <h3 style={stepTitle}>Step 2 — Items to Return</h3>
                  <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>
                    Select each item you want to return, enter the quantity, choose its condition, and add any remarks.
                  </p>

                  {(selectedOrder.items || []).length === 0 ? (
                    <p style={{ color: "#9CA3AF", fontSize: "13px" }}>No item details found for this order.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {(selectedOrder.items || []).map((item) => {
                        const key  = String(item.product_id);
                        const rv   = returnItems[key] || {};
                        const isOn = rv.selected;

                        return (
                          <div key={key} style={{
                            border: `2px solid ${isOn ? "#40916C" : "#E5E7EB"}`,
                            borderRadius: "14px",
                            overflow: "hidden",
                            transition: "border-color 0.2s",
                            background: isOn ? "#F0FFF4" : "white",
                          }}>
                            {/* ── Item header row ─────────────────── */}
                            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", cursor: "pointer" }}
                              onClick={() => toggleItem(key)}>
                              {/* Checkbox */}
                              <div style={{
                                width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                                border: `2px solid ${isOn ? "#40916C" : "#D1D5DB"}`,
                                background: isOn ? "#40916C" : "white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {isOn && <span style={{ color: "white", fontSize: "13px", fontWeight: 900 }}>✓</span>}
                              </div>

                              {/* Product icon */}
                              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                                🛒
                              </div>

                              {/* Name + qty */}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>{item.name}</p>
                                <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Ordered qty: {item.quantity}</p>
                              </div>

                              {/* Price */}
                              <p style={{ fontWeight: 700, color: "#1B4332", fontSize: "14px", flexShrink: 0 }}>
                                ₦{(item.price * item.quantity).toLocaleString()}
                              </p>
                            </div>

                            {/* ── Expanded controls (when selected) ── */}
                            {isOn && (
                              <div style={{ borderTop: "1px solid #D1FAE5", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>
                                  {/* Quantity */}
                                  <div>
                                    <label style={labelStyle}>
                                      Return Quantity <span style={{ color: "#DC2626" }}>*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={item.quantity}
                                      value={rv.returnQty || ""}
                                      onChange={(e) => updateItem(key, "returnQty", Math.min(Number(e.target.value), item.quantity))}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        ...inputStyle,
                                        borderColor: rv.returnQty > item.quantity ? "#FCA5A5" : "#E5E7EB",
                                      }}
                                    />
                                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                                      Max: {item.quantity}
                                    </p>
                                  </div>

                                  {/* Condition */}
                                  <div>
                                    <label style={labelStyle}>
                                      Return Condition <span style={{ color: "#DC2626" }}>*</span>
                                    </label>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                      {CONDITION_OPTIONS.map((opt) => (
                                        <div key={opt.value} onClick={(e) => { e.stopPropagation(); updateItem(key, "condition", opt.value); }}
                                          style={{
                                            flex: 1, minWidth: "100px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", textAlign: "center",
                                            border: `1.5px solid ${rv.condition === opt.value ? "#40916C" : "#E5E7EB"}`,
                                            background: rv.condition === opt.value ? "#F0FFF4" : "white",
                                            transition: "all 0.15s",
                                          }}>
                                          <div style={{ fontSize: "16px", marginBottom: "3px" }}>{opt.label.split(" ")[0]}</div>
                                          <div style={{ fontSize: "11px", fontWeight: 700, color: rv.condition === opt.value ? "#065F46" : "#374151" }}>
                                            {opt.label.split(" ").slice(1).join(" ")}
                                          </div>
                                          <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>{opt.desc}</div>
                                        </div>
                                      ))}
                                    </div>
                                    {!rv.condition && (
                                      <p style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>Condition is required</p>
                                    )}
                                  </div>
                                </div>

                                {/* Remarks */}
                                <div>
                                  <label style={{ ...labelStyle, color: "#6B7280" }}>Remarks (optional)</label>
                                  <textarea
                                    rows={2}
                                    value={rv.remarks || ""}
                                    onChange={(e) => updateItem(key, "remarks", e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Any additional notes about this item…"
                                    style={{ ...inputStyle, resize: "vertical" }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selection summary */}
                  {selectedItemsList.length > 0 && (
                    <div style={{ marginTop: "14px", padding: "10px 14px", background: "#F0FFF4", borderRadius: "10px", border: "1px solid #A7F3D0", fontSize: "13px", color: "#065F46", fontWeight: 600 }}>
                      ✓ {selectedItemsList.length} item{selectedItemsList.length !== 1 ? "s" : ""} selected for return
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 3: Reason ─────────────────────────────── */}
              {selectedOrder && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={card}>
                  <h3 style={stepTitle}>Step 3 — Reason for Return</h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    {RETURN_REASONS.map((r) => (
                      <div key={r.value} onClick={() => { setReason(r.value); if (r.value !== "other") setDescription(""); }}
                        style={{
                          padding: "14px 16px", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                          border: `2px solid ${reason === r.value ? "#40916C" : "#E5E7EB"}`,
                          backgroundColor: reason === r.value ? "#F0FFF4" : "white",
                        }}>
                        <p style={{ fontWeight: 700, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>{r.label}</p>
                        <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{r.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* "Other" custom reason field */}
                  {reason === "other" && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "20px" }}>
                      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px", color: "#111827" }}>
                        Please specify your reason
                        <span style={{ color: "#DC2626", fontWeight: 700 }}>*</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", backgroundColor: "#FEE2E2", padding: "2px 8px", borderRadius: "50px" }}>
                          Required
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe your reason for returning this item..."
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          borderColor: description.trim() ? "#40916C" : "#FCA5A5",
                          backgroundColor: "#FFFBFB",
                        }}
                      />
                      {!description.trim() && (
                        <p style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                          ⚠️ This field is required when selecting "Other reason"
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Additional details (non-other) */}
                  {reason && reason !== "other" && (
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ ...labelStyle, color: "#6B7280" }}>Additional Details (optional)</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe the issue in more detail..."
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </div>
                  )}

                  {/* Inline validation hint */}
                  {validationError && reason && selectedItemsList.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "10px", fontSize: "13px", color: "#991B1B", marginBottom: "16px" }}>
                      ⚠️ {validationError}
                    </div>
                  )}

                  {/* Submit */}
                  <motion.button
                    whileHover={!validationError ? { scale: 1.02 } : {}}
                    whileTap={!validationError ? { scale: 0.97 } : {}}
                    onClick={handleSubmit}
                    disabled={submitting || !!validationError}
                    style={{
                      width: "100%",
                      backgroundColor: validationError ? "#9CA3AF" : "#1B4332",
                      color: "white",
                      border: "none",
                      borderRadius: "14px",
                      padding: "16px",
                      fontSize: "16px",
                      fontWeight: 700,
                      cursor: validationError ? "not-allowed" : "pointer",
                      fontFamily: "Nunito, sans-serif",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {submitting ? (
                      <>
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⏳</motion.span>
                        Submitting...
                      </>
                    ) : (
                      `📤 Submit Return Request${selectedItemsList.length > 0 ? ` (${selectedItemsList.length} item${selectedItemsList.length !== 1 ? "s" : ""})` : ""}`
                    )}
                  </motion.button>
                </motion.div>
              )}
            </div>
          )
        ) : (
          /* ══════════════════════════════════════════════════════ */
          /* HISTORY TAB                                            */
          /* ══════════════════════════════════════════════════════ */
          <div>
            {myReturns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", ...card }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📋</div>
                <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>No Returns Yet</h3>
                <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>You haven't submitted any return requests</p>
                <button onClick={() => setTab("new")} style={{ backgroundColor: "#1B4332", color: "white", border: "none", borderRadius: "12px", padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>
                  Submit a Return
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {myReturns.map((ret) => {
                  const s = statusColors[ret.status] || statusColors.submitted;
                  const reasonLabel = RETURN_REASONS.find((r) => r.value === ret.reason)?.label || ret.reason;
                  return (
                    <div key={ret.id} style={{ ...card, padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>Return #{ret.id}</p>
                          <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Order #{ret.order_id} • Submitted {new Date(ret.created_at).toLocaleDateString()}</p>
                        </div>
                        <span style={{ backgroundColor: s.bg, color: s.color, fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "50px" }}>
                          {s.label}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "#4B5563", marginBottom: "10px" }}>
                        <strong>Reason:</strong> {reasonLabel}
                        {ret.description && <span style={{ color: "#9CA3AF", fontStyle: "italic" }}> — "{ret.description}"</span>}
                      </p>

                      {/* Items list */}
                      {ret.items?.length > 0 && (
                        <div style={{ marginTop: "10px", border: "1px solid #F3F4F6", borderRadius: "12px", overflow: "hidden" }}>
                          <div style={{ background: "#F9FAFB", padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Items Returned
                          </div>
                          {ret.items.map((item, i) => {
                            const cond = conditionLabel[item.condition];
                            return (
                              <div key={i} style={{ padding: "10px 14px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>{item.product_name}</p>
                                  <p style={{ fontSize: "11px", color: "#9CA3AF" }}>
                                    Ordered: {item.ordered_quantity} • Returning: {item.returned_quantity}
                                  </p>
                                  {item.remarks && <p style={{ fontSize: "11px", color: "#9CA3AF", fontStyle: "italic" }}>"{item.remarks}"</p>}
                                </div>
                                {cond && (
                                  <span style={{ backgroundColor: cond.bg, color: cond.color, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "50px", whiteSpace: "nowrap" }}>
                                    {cond.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
