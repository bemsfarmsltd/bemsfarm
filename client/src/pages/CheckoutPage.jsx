import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSubtotal, clearCart } = useCart();

  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "Lagos",
  });
  const [payMethod, setPayMethod] = useState("paystack");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [psLoaded, setPsLoaded] = useState(false);
  const scriptRef = useRef(null);

  const DELIVERY = 500;
  const total = cartSubtotal + DELIVERY;

  // Load Paystack script once
  useEffect(() => {
    if (document.getElementById("paystack-js")) {
      setPsLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "paystack-js";
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => {
      console.log("✅ Paystack ready");
      setPsLoaded(true);
    };
    s.onerror = () => console.warn("⚠️ Paystack script failed");
    scriptRef.current = s;
    document.body.appendChild(s);
    return () => {
      /* leave script in DOM — safe to re-use */
    };
  }, []);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const { fullName, email, phone, address, city } = form;
    if (!fullName.trim()) return "Full name is required";
    if (!email.trim()) return "Email is required";
    if (!phone.trim()) return "Phone number is required";
    if (!address.trim()) return "Street address is required";
    if (!city.trim()) return "City is required";
    return null;
  };

  // ── CREATE ORDER IN DB ───────────────────────────────────────

  const createOrder = async (ref) => {
    const payload = {
      items: cartItems.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
        price: i.price,
      })),
      total: parseFloat(total),
      payment_method: payMethod,
      payment_ref: ref || null,
      address: `${form.address}, ${form.city}, ${form.state}`,
    };
    const res = await api.post("/orders", payload);
    return res.data.orderId || res.data.id;
  };
  console.log(JSON.stringify(cartItems));
  const handlePaymentSuccess = async (response) => {
    try {
      const orderId = await createOrder(response.reference);
      clearCart();
      setTimeout(() => {
        setLoading(false);
        navigate("/order-confirmed", {
          state: { orderId, reference: response.reference },
        });
      }, 400);
    } catch (orderErr) {
      console.error("❌ Order creation after payment failed:", orderErr);
      setLoading(false);
      setError(
        `Payment was received (ref: ${response.reference}) but order creation failed. ` +
          `Please contact support with this reference number.`,
      );
    }
  };

  // ── PAYSTACK PAYMENT ────────────────────────────────────────
  const handlePaystack = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    if (!psLoaded || !window.PaystackPop) {
      setError(
        "Payment gateway not ready. Please use Cash on Delivery or refresh the page.",
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: form.email,
        amount: Math.round(total * 100), // kobo
        ref: `BF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        currency: "NGN",
        channels: ["card", "bank", "ussd", "qr", "bank_transfer"],

        // ── SUCCESS ─────────────────────────────────────────────
        // This callback runs INSIDE Paystack's iframe context.
        // NEVER navigate() inside onSuccess directly — Paystack's iframe
        // may still be running. Use a short timeout + clearCart first.
        callback: function (response) {
          console.log("✅ Paystack success:", response.reference);
          // Call the async logic separately — callback itself stays a plain
          // function so Paystack's SDK validator accepts it.
          handlePaymentSuccess(response);
        },

        // ── CLOSED WITHOUT PAYING ────────────────────────────────
        onClose: () => {
          console.log("ℹ️ Paystack modal closed");
          setLoading(false);
          setError("Payment was cancelled. Try again or use Cash on Delivery.");
        },
      });

      handler.openIframe();
    } catch (psErr) {
      console.error("❌ Paystack setup error:", psErr);
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
      setError(
        codErr?.response?.data?.message || "Order failed. Please try again.",
      );
      setLoading(false);
    }
  };

  // ── EMPTY CART ───────────────────────────────────────────────
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
          <span style={{ fontSize: "64px" }}>🛒</span>
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
              borderRadius: "10px",
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

  // ── SHARED STYLES ────────────────────────────────────────────
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
    backgroundColor: "white",
    border: "1px solid #E5E7EB",
    borderRadius: "16px",
    padding: "24px",
  };

  return (
    <PageWrapper>
      {/*
        ── RESPONSIVE LAYOUT
        Mobile  (<640px): single column, stacked
        Tablet  (640–900px): single column, slightly wider
        Desktop (>900px): 3fr left + 2fr right sidebar
      */}
      <div
        style={{
          backgroundColor: "#F9FAFB",
          minHeight: "100vh",
          padding: "0 0 80px",
        }}
      >
        {/* Page header */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #F3F4F6",
            padding: "20px 24px",
            marginBottom: "24px",
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

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
          {/* Error banner */}
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
              <span>⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          {/* ── MAIN GRID ─────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            {/* ── LEFT: FORM ────────────────────────────── */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Delivery Details */}
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
                  {/* Full name + email */}
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

                  {/* Phone */}
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

                  {/* Street address */}
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

                  {/* City + State */}
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

              {/* Payment Method */}
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
                      id: "paystack",
                      icon: "💳",
                      label: "Card / Bank (Paystack)",
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
                        borderRadius: "12px",
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

                {/* Place order button */}
                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  onClick={
                    payMethod === "paystack" ? handlePaystack : handleCOD
                  }
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
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
                  ) : payMethod === "paystack" ? (
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

            {/* ── RIGHT: ORDER SUMMARY ──────────────────── */}
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

              {/* Items */}
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
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
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
                        {item.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          color: "#9CA3AF",
                        }}
                      >
                        × {item.quantity} · {item.unit}
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
                      ₦{(item.price * 1500 * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
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
                  borderRadius: "10px",
                  background: "white",
                  color: "#6B7280",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Nunito, sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1B4332";
                  e.currentTarget.style.color = "#1B4332";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.color = "#6B7280";
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
