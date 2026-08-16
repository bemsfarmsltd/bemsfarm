import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getDeliveryFee } from "../utils/delivery";
import { NAIRA_PER_UNIT } from "../utils/currency";

const STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const MONNIFY_API_KEY = import.meta.env.VITE_MONNIFY_API_KEY || "";
const MONNIFY_CONTRACT_CODE = import.meta.env.VITE_MONNIFY_CONTRACT_CODE || "";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSubtotal, clearCart, appliedCoupon } = useCart();

  const pageMountTime = useRef(Date.now());
  const clickCount = useRef(0);
  const keyPressCount = useRef(0);

  useEffect(() => {
    const handleDocumentClick = () => {
      clickCount.current += 1;
    };
    const handleDocumentKeyDown = () => {
      keyPressCount.current += 1;
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "Lagos",
  });
  const [payMethod, setPayMethod] = useState("monnify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monnifyLoaded, setMonnifyLoaded] = useState(false);

  const DELIVERY = getDeliveryFee(cartSubtotal);
  const discount = appliedCoupon?.discount || 0;
  const total = cartSubtotal + DELIVERY - discount;

  useEffect(() => {
    if (document.getElementById("monnify-js")) {
      setMonnifyLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "monnify-js";
    s.src = "https://sdk.monnify.com/plugin/monnify.js";
    s.async = true;
    s.onload = () => setMonnifyLoaded(true);
    s.onerror = () => console.warn("⚠️ Monnify script failed to load");
    document.body.appendChild(s);
  }, []);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const { fullName, email, phone, address, city } = form;
    if (!fullName.trim()) return "Full name is required";
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address";
    if (!phone.trim()) return "Phone number is required";
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 14) return "Enter a valid phone number";
    if (!address.trim()) return "Street address is required";
    if (!city.trim()) return "City is required";
    return null;
  };

  /*
    ── CRITICAL FIX ──────────────────────────────────────────────
    CartContext stores each cart entry as a NESTED object:
      { product: { id, name, price, unit, ... }, quantity }
    NOT a flat { id, price, quantity } shape.

    The previous version of this function read i.id / i.price
    directly off the cart item, which doesn't exist on that shape
    (it's one level deeper, on i.product.id / i.product.price).
    Those silently evaluated to `undefined`, which became NaN once
    Number()'d on the backend, and Postgres rejected the insert with
    "invalid input syntax for type integer: NaN" — the exact error
    seen in Render's logs. This is why orders never saved and the
    cart never cleared, even though Paystack itself succeeded.

    Fix: read every field from the correct nested location, AND
    validate before sending so a malformed cart item fails fast
    client-side with a clear message instead of reaching the server
    as silent NaNs.
  */
  const buildOrderItems = () => {
    const items = [];
    for (const entry of cartItems) {
      const product = entry.product;
      const quantity = entry.quantity;

      if (!product || typeof product.id === "undefined") {
        throw new Error(
          "A cart item is missing product information. Please remove it and re-add it to your cart.",
        );
      }
      const productId = Number(product.id);
      const qty = Number(quantity);
      const price = Number(product.price);

      if (!Number.isInteger(productId)) {
        throw new Error(
          `Invalid product ID for "${product.name || "an item"}" in your cart.`,
        );
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(
          `Invalid quantity for "${product.name || "an item"}" in your cart.`,
        );
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Invalid price for "${product.name || "an item"}" in your cart.`,
        );
      }

      items.push({ product_id: productId, quantity: qty, price });
    }
    return items;
  };

  const createOrder = async (ref) => {
    const items = buildOrderItems();
    const payload = {
      items,
      total: parseFloat(total),
      payment_method: payMethod,
      payment_ref: ref || null,
      address: `${form.address}, ${form.city}, ${form.state}`,
      coupon_code: appliedCoupon?.code || undefined,
      behavior_metrics: {
        timeSpent: Math.round((Date.now() - pageMountTime.current) / 1000),
        clicks: clickCount.current,
        keyPresses: keyPressCount.current,
      },
    };
    const res = await api.post("/orders", payload);
    return res.data.orderId || res.data.id;
  };

  // ── MONNIFY PAYMENT ─────────────────────────────────────────
  const handleMonnify = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    // Validate cart items BEFORE opening Monnify — catch nested-shape
    // or NaN problems before the customer is ever charged.
    try {
      buildOrderItems();
    } catch (cartErr) {
      setError(cartErr.message);
      return;
    }

    if (!monnifyLoaded || !window.MonnifySDK) {
      setError(
        "Payment gateway not ready. Please use Cash on Delivery or refresh the page.",
      );
      return;
    }

    setError(null);
    setLoading(true);

    // transactionReference (not our own paymentReference) is what the
    // server's verify call and webhook key off of — see utils/monnify.js.
    const finalizeOrderAfterPayment = async (transactionReference) => {
      try {
        const orderId = await createOrder(transactionReference);
        clearCart();
        setTimeout(() => {
          setLoading(false);
          navigate("/order-confirmed", { state: { orderId, reference: transactionReference } });
        }, 400);
      } catch (orderErr) {
        console.error("❌ Order creation after payment failed:", orderErr);
        setLoading(false);
        const detail = orderErr?.response?.data?.message || orderErr.message;
        setError(
          `Payment was received (ref: ${transactionReference}) but order creation failed: ${detail}. ` +
            `Please contact support with this reference number — your payment is safe.`,
        );
      }
    };

    try {
      window.MonnifySDK.initialize({
        amount: total, // Monnify amounts are plain Naira, not kobo
        currency: "NGN",
        reference: `BF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerFullName: form.fullName,
        customerEmail: form.email,
        apiKey: MONNIFY_API_KEY,
        contractCode: MONNIFY_CONTRACT_CODE,
        paymentDescription: "BemsFarms order",
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
        onLoadStart: () => console.log("ℹ️ Monnify checkout opened"),
        onComplete: (response) => {
          if (response.paymentStatus !== "PAID" && response.status !== "SUCCESS") {
            setLoading(false);
            setError("Payment was not completed. Try again or use Cash on Delivery.");
            return;
          }
          console.log("✅ Monnify success:", response.transactionReference);
          finalizeOrderAfterPayment(response.transactionReference);
        },
        onClose: () => {
          console.log("ℹ️ Monnify modal closed");
          setLoading(false);
          setError("Payment was cancelled. Try again or use Cash on Delivery.");
        },
      });
    } catch (mfErr) {
      console.error("❌ Monnify setup error:", mfErr);
      setLoading(false);
      setError("Could not open payment modal. Please try Cash on Delivery.");
    }
  };

  // ── CASH ON DELIVERY ────────────────────────────────────────
  const handleCOD = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const orderId = await createOrder(null);
      clearCart();
      navigate("/order-confirmed", {
        state: { orderId, paymentMethod: "COD" },
      });
    } catch (codErr) {
      console.error("❌ COD order error:", codErr);
      const detail = codErr?.response?.data?.message || codErr.message;
      setError(detail || "Order failed. Please try again.");
      setLoading(false);
    }
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <PageWrapper>
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "40px 20px",
          }}
        >
          <span style={{ fontSize: "86" }}>🛒</span>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#1B4332",
              margin: 0,
            }}
          >
            Your cart is empty
          </h2>
          <p style={{ color: "#9CA3AF", margin: 0 }}>
            Add some fresh produce before checking out
          </p>
          <button
            onClick={() => navigate("/products")}
            style={{
              padding: "12px 28px",
              background: "#1B4332",
              color: "white",
              border: "none",
              borderRadius: "999px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "Nunito, sans-serif",
            }}
          >
            Browse Products
          </button>
        </div>
      </PageWrapper>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    fontSize: "14px",
    fontFamily: "Nunito, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    backgroundColor: "white",
  };
  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };
  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(27,67,50,0.08)",
    borderRadius: "20px",
    padding: "24px",
  };

  return (
    <PageWrapper>
      <div
        style={{
          backgroundColor: "#FBF8F3",
          minHeight: "100vh",
          padding: "0 0 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="bf-cart-blob" style={{ position: "absolute", width: 320, height: 320, top: -100, left: -100, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", background: "radial-gradient(circle, rgba(46,125,50,0.10), transparent 70%)" }} />
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(27,67,50,0.06)",
            padding: "20px 24px",
            marginBottom: "24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <h1
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 800,
                color: "#1B4332",
                margin: "0 0 4px",
              }}
            >
              Checkout
            </h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px", margin: 0 }}>
              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} · ₦
              {total.toLocaleString()} total
            </p>
          </div>
        </div>

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px", position: "relative", zIndex: 1 }}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                color: "#DC2626",
                fontSize: "14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <span style={{fontSize:'1.35em'}}>⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div style={cardStyle}>
                <h2
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#1B4332",
                      color: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </span>
                  Delivery Details
                </h2>

                <div style={{ display: "grid", gap: "14px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        style={inputStyle}
                        value={form.fullName}
                        onChange={set("fullName")}
                        placeholder="Esther Bello"
                        disabled={loading}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1B4332")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#E5E7EB")
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input
                        style={inputStyle}
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder="esther@email.com"
                        disabled={loading}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1B4332")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#E5E7EB")
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input
                      style={inputStyle}
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+234 800 000 0000"
                      disabled={loading}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "#1B4332")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "#E5E7EB")
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Street Address *</label>
                    <textarea
                      style={{
                        ...inputStyle,
                        resize: "none",
                        minHeight: "72px",
                      }}
                      value={form.address}
                      onChange={set("address")}
                      placeholder="12 Farm Road, Lekki Phase 1"
                      disabled={loading}
                      rows={3}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "#1B4332")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "#E5E7EB")
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>City *</label>
                      <input
                        style={inputStyle}
                        value={form.city}
                        onChange={set("city")}
                        placeholder="Lagos"
                        disabled={loading}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#1B4332")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#E5E7EB")
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>State *</label>
                      <select
                        style={{ ...inputStyle, cursor: "pointer" }}
                        value={form.state}
                        onChange={set("state")}
                        disabled={loading}
                      >
                        {STATES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h2
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#1B4332",
                      color: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  Payment Method
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  {[
                    {
                      id: "monnify",
                      icon: "💳",
                      label: "Card / Bank (Monnify)",
                      desc: "Visa, Mastercard, USSD, Bank Transfer",
                    },
                    {
                      id: "cod",
                      icon: "💵",
                      label: "Cash on Delivery",
                      desc: "Pay when your order arrives",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 16px",
                        borderRadius: "18px",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.15s",
                        backgroundColor:
                          payMethod === m.id ? "#F0FFF4" : "#F9FAFB",
                        outline:
                          payMethod === m.id
                            ? "2px solid #1B4332"
                            : "1px solid #E5E7EB",
                        outlineOffset: payMethod === m.id ? "0px" : "-1px",
                      }}
                    >
                      <span style={{ fontSize: "24px", flexShrink: 0 }}>
                        {m.icon}
                      </span>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#111827",
                            fontFamily: "Nunito, sans-serif",
                          }}
                        >
                          {m.label}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#9CA3AF",
                            marginTop: "2px",
                          }}
                        >
                          {m.desc}
                        </p>
                      </div>
                      <div
                        style={{
                          marginLeft: "auto",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          border:
                            payMethod === m.id
                              ? "5px solid #1B4332"
                              : "2px solid #D1D5DB",
                          backgroundColor:
                            payMethod === m.id ? "white" : "transparent",
                          transition: "all 0.15s",
                        }}
                      />
                    </button>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  onClick={
                    payMethod === "monnify" ? handleMonnify : handleCOD
                  }
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "999px",
                    border: "none",
                    background: loading
                      ? "#9CA3AF"
                      : "linear-gradient(135deg, #1B4332, #40916C)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "Nunito, sans-serif",
                    boxShadow: loading
                      ? "none"
                      : "0 4px 16px rgba(27,67,50,0.3)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{ display: "inline-block" }}
                      >
                        ⏳
                      </motion.span>
                      Processing…
                    </>
                  ) : payMethod === "monnify" ? (
                    <>🔒 Pay ₦{total.toLocaleString()} Securely</>
                  ) : (
                    <>📦 Confirm Order · ₦{total.toLocaleString()}</>
                  )}
                </motion.button>

                <p
                  style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#9CA3AF",
                    marginTop: "12px",
                    marginBottom: 0,
                  }}
                >
                  🔒 Your payment info is encrypted and secure
                </p>
              </div>
            </div>

            <div style={{ ...cardStyle, position: "sticky", top: "80px" }}>
              <h2
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#111827",
                  margin: "0 0 16px",
                }}
              >
                Order Summary
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "16px",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}
              >
                {cartItems.map((entry, idx) => (
                  <div
                    key={`${entry.product.id}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.product.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          color: "#9CA3AF",
                        }}
                      >
                        × {entry.quantity} · {entry.product.unit}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1B4332",
                        flexShrink: 0,
                      }}
                    >
                      ₦
                      {(
                        entry.product.price *
                        NAIRA_PER_UNIT *
                        entry.quantity
                      ).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: "1px solid #F3F4F6",
                  paddingTop: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>
                    Subtotal
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#374151",
                      fontWeight: 600,
                    }}
                  >
                    ₦{cartSubtotal.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>
                    Delivery
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#374151",
                      fontWeight: 600,
                    }}
                  >
                    ₦{DELIVERY.toLocaleString()}
                  </span>
                </div>
                {discount > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "13px", color: "#1B4332" }}>
                      Discount ({appliedCoupon.code})
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#1B4332",
                        fontWeight: 600,
                      }}
                    >
                      -₦{discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px solid #F3F4F6",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#111827",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#1B4332",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/cart")}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "999px",
                  background: "white",
                  color: "#6B7280",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Nunito, sans-serif",
                }}
              >
                ← Edit Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
