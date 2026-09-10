import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getDeliveryFee } from "../utils/delivery";
import { getNairaPrice } from "../utils/currency";
import { getProductImage } from "../utils/productImages";

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
  const { cartItems, cartSubtotal, clearCart, appliedCoupon, setAppliedCoupon } = useCart();

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
    phone: user?.phone || "",
    address: "",
    city: "",
    state: "Lagos",
  });

  const [payMethod, setPayMethod] = useState("monnify"); // "monnify" | "cod"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monnifyLoaded, setMonnifyLoaded] = useState(false);
  const [paymentRecoveryAvailable, setPaymentRecoveryAvailable] = useState(false);
  const finalizingReference = useRef(null);

  // Saved Delivery Address Management
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState("custom"); // "saved" | "custom"
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setDeliveryMode("custom");
      return;
    }
    setLoadingAddresses(true);
    api.get("/addresses")
      .then((res) => {
        const list = res.data.addresses || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.is_default) || list[0];
          setSelectedAddressId(defaultAddr.id);
          setDeliveryMode("saved");
          setForm((f) => ({
            ...f,
            fullName: defaultAddr.receiver_name || f.fullName || user.name || "",
            email: f.email || user.email || "",
            phone: defaultAddr.receiver_phone || f.phone || user.phone || "",
            address: defaultAddr.street_address || "",
            city: defaultAddr.city || "",
            state: defaultAddr.state || f.state || "Lagos",
          }));
        } else {
          setDeliveryMode("custom");
          setSaveAsDefault(true);
          setForm((f) => ({
            ...f,
            fullName: f.fullName || user.name || "",
            email: f.email || user.email || "",
            phone: f.phone || user.phone || "",
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, [user]);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setDeliveryMode("saved");
    setForm((f) => ({
      ...f,
      fullName: addr.receiver_name || f.fullName || user?.name || "",
      phone: addr.receiver_phone || f.phone || "",
      address: addr.street_address || "",
      city: addr.city || "",
      state: addr.state || "Lagos",
    }));
  };

  const handleUseCustomAddress = () => {
    setDeliveryMode("custom");
    setSelectedAddressId(null);
    setSaveAsDefault(false);
    setForm((f) => ({
      ...f,
      address: "",
      city: "",
    }));
  };

  const DELIVERY = getDeliveryFee(cartSubtotal);
  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, cartSubtotal + DELIVERY - discount);

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
    s.onerror = () => console.warn("Monnify script failed to load");
    document.body.appendChild(s);
  }, []);

  const setField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validateForm = () => {
    const { fullName, email, phone, address, city } = form;
    if (!fullName.trim()) return "Full recipient name is required";
    if (!email.trim()) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address";
    if (!phone.trim()) return "Phone number is required";
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 14) return "Please enter a valid Nigerian phone number";
    if (!address.trim()) return "Street address is required for delivery";
    if (!city.trim()) return "City or area is required";
    return null;
  };

  const buildOrderItems = () => {
    const items = [];
    for (const entry of cartItems) {
      const product = entry.product;
      const quantity = entry.quantity;

      if (!product || typeof product.id === "undefined") {
        throw new Error(
          "A cart item is missing product details. Please return to cart and refresh.",
        );
      }
      const productId = Number(product.id);
      const qty = Number(quantity);
      const price = Number(product.price);

      if (!Number.isInteger(productId)) {
        throw new Error(
          `Invalid product reference for "${product.name || "an item"}".`,
        );
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(
          `Invalid quantity for "${product.name || "an item"}".`,
        );
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Invalid price for "${product.name || "an item"}".`,
        );
      }

      items.push({ product_id: productId, quantity: qty, price });
    }
    return items;
  };

  const prepareCheckout = async () => {
    const localItems = buildOrderItems();
    const refreshedItems = await Promise.all(
      localItems.map(async (item) => {
        const response = await api.get(`/products/${item.product_id}`);
        const product = response.data.product;
        const stock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));

        if (product.available_for_sale === false || stock < item.quantity) {
          throw new Error(`"${product.name}" is no longer available in the requested quantity.`);
        }

        return {
          product_id: Number(product.id),
          quantity: item.quantity,
          price: Number(product.price),
        };
      })
    );

    const subtotal = refreshedItems.reduce(
      (sum, item) => sum + getNairaPrice(item.price) * item.quantity,
      0,
    );
    let calculatedDiscount = 0;
    if (appliedCoupon?.code) {
      const couponResponse = await api.post("/admin/coupons/validate", {
        code: appliedCoupon.code,
        order_total: subtotal,
      });
      if (!couponResponse.data.valid) {
        throw new Error(couponResponse.data.message || "The applied coupon is no longer valid.");
      }
      calculatedDiscount = Number(couponResponse.data.discount) || 0;
    }

    return {
      items: refreshedItems,
      total: subtotal + getDeliveryFee(subtotal) - calculatedDiscount,
    };
  };

  const maybePersistAddress = async () => {
    if (!user) return;
    try {
      if (saveAsDefault && form.address.trim()) {
        await api.post("/addresses", {
          label: deliveryMode === "custom" ? "Alternate Address" : "Permanent Delivery",
          receiver_name: form.fullName,
          receiver_phone: form.phone,
          street_address: form.address,
          city: form.city,
          state: form.state,
          is_default: true,
        });
      }
    } catch (e) {
      console.warn("Failed to persist delivery address:", e);
    }
  };

  const createOrder = async (ref, checkout) => {
    await maybePersistAddress();

    const payload = {
      items: checkout.items,
      total: checkout.total,
      payment_method: payMethod,
      payment_ref: ref || undefined,
      checkout_intent_id: checkout.intentId || undefined,
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

  // Coupon handling
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await api.post("/admin/coupons/validate", {
        code: couponInput.trim().toUpperCase(),
        order_total: cartSubtotal,
      });
      if (res.data.valid) {
        setAppliedCoupon({
          code: couponInput.trim().toUpperCase(),
          discount: Number(res.data.discount) || 0,
        });
        setCouponInput("");
      } else {
        setCouponError(res.data.message || "Invalid discount coupon.");
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || "Failed to validate coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Monnify Gateway Execution
  const handleMonnify = async (e) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let checkout;
    const paymentReference = `BF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      checkout = await prepareCheckout();
      const intent = await api.post("/orders/checkout-intent", {
        items: checkout.items,
        payment_ref: paymentReference,
        address: `${form.address}, ${form.city}, ${form.state}`,
        coupon_code: appliedCoupon?.code || undefined,
      });
      checkout = { ...checkout, intentId: intent.data.intentId, total: Number(intent.data.total) };
      localStorage.setItem("bems_pending_checkout", JSON.stringify({
        intentId: checkout.intentId,
        paymentRef: paymentReference,
      }));
    } catch (cartErr) {
      setError(cartErr.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!monnifyLoaded || !window.MonnifySDK) {
      setError("Payment gateway is initializing. Please choose Cash on Delivery or refresh.");
      return;
    }

    setError(null);
    setLoading(true);

    const finalizeOrderAfterPayment = async (transactionReference) => {
      if (!transactionReference || finalizingReference.current === transactionReference) return;
      finalizingReference.current = transactionReference;
      localStorage.setItem("bems_pending_payment_ref", transactionReference);
      try {
        const orderId = await createOrder(transactionReference, checkout);
        clearCart();
        localStorage.removeItem("bems_pending_payment_ref");
        localStorage.removeItem("bems_pending_checkout");
        setTimeout(() => {
          setLoading(false);
          navigate("/order-confirmed", { state: { orderId, reference: transactionReference } });
        }, 400);
      } catch (orderErr) {
        console.error("Order creation after payment failed:", orderErr);
        setLoading(false);
        const detail = orderErr?.response?.data?.message || orderErr.message;
        setError(
          `Payment received (ref: ${transactionReference}) but finalizing order encountered: ${detail}. ` +
          `Your payment is secure. Please contact customer support with this reference.`,
        );
        setPaymentRecoveryAvailable(true);
      }
    };

    try {
      window.MonnifySDK.initialize({
        amount: checkout.total,
        currency: "NGN",
        reference: paymentReference,
        customerFullName: form.fullName,
        customerEmail: form.email,
        apiKey: MONNIFY_API_KEY,
        contractCode: MONNIFY_CONTRACT_CODE,
        paymentDescription: "BemsFarms Direct Farm Checkout",
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
        onLoadStart: () => console.log("Monnify modal opened"),
        onComplete: (response) => {
          if (response.paymentStatus !== "PAID" && response.status !== "SUCCESS") {
            setLoading(false);
            setError("Payment was not completed. Please try again or choose Cash on Delivery.");
            return;
          }
          finalizeOrderAfterPayment(response.transactionReference);
        },
        onClose: () => {
          setLoading(false);
          setError("Payment modal closed. You can retry or choose Cash on Delivery.");
        },
      });
    } catch (mfErr) {
      console.error("Monnify init error:", mfErr);
      setLoading(false);
      setError("Could not launch secure payment gateway. Please try Cash on Delivery.");
    }
  };

  // Cash on Delivery Execution
  const handleCOD = async (e) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const checkout = await prepareCheckout();
      const orderId = await createOrder(undefined, checkout);
      clearCart();
      navigate("/order-confirmed", {
        state: { orderId, paymentMethod: "COD" },
      });
    } catch (codErr) {
      console.error("COD order error:", codErr);
      const detail = codErr?.response?.data?.message || codErr.message;
      setError(detail || "Failed to place order. Please try again.");
      setLoading(false);
    }
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <PageWrapper>
        <div
          style={{
            minHeight: "75vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            padding: "60px 20px",
            backgroundColor: "#FAF8F5",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "rgba(20, 60, 45, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#143c2d",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: "var(--heading-font)",
              fontSize: "26px",
              fontWeight: 800,
              color: "#143c2d",
              margin: 0,
            }}
          >
            Your Basket is Empty
          </h2>
          <p style={{ color: "#6B7280", margin: 0, maxWidth: "380px", fontSize: "15px", lineHeight: "1.5" }}>
            Add 100% stone-free grains, farm-fresh tubers, and premium pantry staples to proceed to checkout.
          </p>
          <button
            onClick={() => navigate("/products")}
            style={{
              padding: "14px 32px",
              background: "#143c2d",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "999px",
              fontWeight: 800,
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(20,60,45,0.25)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Explore Farm Catalog
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        style={{
          backgroundColor: "#FAF8F5",
          minHeight: "100vh",
          paddingBottom: "100px",
          position: "relative",
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid rgba(20, 60, 45, 0.08)",
            padding: "24px 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              maxWidth: "1140px",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              {/* Breadcrumb */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9CA3AF",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Link to="/" style={{ color: "#6B7280", textDecoration: "none" }}>Home</Link>
                <span>/</span>
                <Link to="/cart" style={{ color: "#6B7280", textDecoration: "none" }}>Basket</Link>
                <span>/</span>
                <span style={{ color: "#143c2d", fontWeight: 700 }}>Checkout</span>
              </div>
              <h1
                style={{
                  fontFamily: "var(--heading-font)",
                  fontSize: "clamp(22px, 3.5vw, 30px)",
                  fontWeight: 900,
                  color: "#143c2d",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Secure Doorstep Checkout
              </h1>
            </div>

            {/* Security Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(20, 60, 45, 0.05)",
                border: "1px solid rgba(20, 60, 45, 0.12)",
                padding: "8px 16px",
                borderRadius: "999px",
                color: "#143c2d",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>256-Bit SSL Encrypted Checkout</span>
            </div>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div style={{ maxWidth: "1140px", margin: "24px auto 32px", padding: "0 20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              backgroundColor: "#FFFFFF",
              padding: "12px 18px",
              borderRadius: "16px",
              border: "1px solid rgba(20, 60, 45, 0.08)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#143c2d",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                1
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#143c2d" }}>Delivery</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B7280" }}>Address & Contact</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#143c2d",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                2
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#143c2d" }}>Payment</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B7280" }}>Card, Transfer, COD</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.6 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#E5E7EB",
                  color: "#6B7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                3
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#4B5563" }}>Confirmation</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>Track Dispatch</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 20px" }}>
          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  color: "#991B1B",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Action Required</p>
                  <p style={{ margin: "4px 0 0", lineHeight: "1.4" }}>{error}</p>
                  {paymentRecoveryAvailable && (
                    <button
                      type="button"
                      onClick={() => navigate("/payment-recovery")}
                      style={{
                        marginTop: "8px",
                        background: "#991B1B",
                        color: "white",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Recover & Verify Payment
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#991B1B",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "32px",
              alignItems: "start",
            }}
          >
            {/* Left Column: Form & Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* STEP 1: Delivery Details Card */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(20, 60, 45, 0.08)",
                  borderRadius: "20px",
                  padding: "28px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #F3F4F6", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        backgroundColor: "#143c2d",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "14px",
                      }}
                    >
                      1
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "var(--heading-font)", fontSize: "18px", fontWeight: 800, color: "#143c2d", margin: 0 }}>
                        Delivery Address
                      </h2>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>
                        Where should our farm dispatch deliver your order?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved Address Selector for Logged In Customer */}
                {user && savedAddresses.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        backgroundColor: "#F3F4F6",
                        borderRadius: "12px",
                        padding: "4px",
                        marginBottom: "16px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const def = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses.find((a) => a.is_default) || savedAddresses[0];
                          handleSelectSavedAddress(def);
                        }}
                        style={{
                          flex: 1,
                          padding: "9px 14px",
                          borderRadius: "9px",
                          border: "none",
                          backgroundColor: deliveryMode === "saved" ? "#FFFFFF" : "transparent",
                          color: deliveryMode === "saved" ? "#143c2d" : "#6B7280",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          boxShadow: deliveryMode === "saved" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Saved Delivery Address ({savedAddresses.length})
                      </button>

                      <button
                        type="button"
                        onClick={handleUseCustomAddress}
                        style={{
                          flex: 1,
                          padding: "9px 14px",
                          borderRadius: "9px",
                          border: "none",
                          backgroundColor: deliveryMode === "custom" ? "#FFFFFF" : "transparent",
                          color: deliveryMode === "custom" ? "#143c2d" : "#6B7280",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          boxShadow: deliveryMode === "custom" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Deliver to Another Location
                      </button>
                    </div>

                    {deliveryMode === "saved" && (
                      <div style={{ display: "grid", gap: "10px", marginBottom: "8px" }}>
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <div
                              key={addr.id}
                              onClick={() => handleSelectSavedAddress(addr)}
                              style={{
                                border: isSelected ? "2px solid #143c2d" : "1px solid #E5E7EB",
                                backgroundColor: isSelected ? "#F4F9F5" : "#FFFFFF",
                                borderRadius: "14px",
                                padding: "16px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "14px",
                              }}
                            >
                              <div
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  border: isSelected ? "6px solid #143c2d" : "2px solid #D1D5DB",
                                  backgroundColor: "#FFFFFF",
                                  flexShrink: 0,
                                  marginTop: "2px",
                                  transition: "all 0.15s",
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                                    {addr.label || "Address"}
                                  </span>
                                  {addr.is_default && (
                                    <span style={{ backgroundColor: "#E8F5E9", color: "#1B4332", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase" }}>
                                      Permanent Default
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: "13px", color: "#374151", margin: "4px 0 0", lineHeight: "1.4" }}>
                                  {addr.street_address}, {addr.city}, {addr.state}
                                </p>
                                <p style={{ fontSize: "12px", color: "#6B7280", margin: "4px 0 0" }}>
                                  Recipient: <strong style={{ color: "#111827" }}>{addr.receiver_name}</strong> · Phone: <strong style={{ color: "#111827" }}>{addr.receiver_phone}</strong>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Form Fields */}
                <div style={{ display: "grid", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Recipient Full Name *
                      </label>
                      <input
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontFamily: "var(--body-font)",
                          outline: "none",
                          backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                        value={form.fullName}
                        onChange={setField("fullName")}
                        placeholder="e.g. Esther Adeleke"
                        disabled={loading}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Email Address *
                      </label>
                      <input
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontFamily: "var(--body-font)",
                          outline: "none",
                          backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                        type="email"
                        value={form.email}
                        onChange={setField("email")}
                        placeholder="esther@example.com"
                        disabled={loading}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Phone Number (For Dispatch Rider) *
                    </label>
                    <input
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontFamily: "var(--body-font)",
                        outline: "none",
                        backgroundColor: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                      type="tel"
                      value={form.phone}
                      onChange={setField("phone")}
                      placeholder="+234 800 000 0000"
                      disabled={loading}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Street Address & Landmarks *
                    </label>
                    <textarea
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontFamily: "var(--body-font)",
                        outline: "none",
                        backgroundColor: "#FFFFFF",
                        resize: "none",
                        minHeight: "75px",
                        boxSizing: "border-box",
                      }}
                      rows={2}
                      value={form.address}
                      onChange={setField("address")}
                      placeholder="Plot 14 Admiralty Way, Lekki Phase 1, Opposite Hub"
                      disabled={loading}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        City / LGA *
                      </label>
                      <input
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontFamily: "var(--body-font)",
                          outline: "none",
                          backgroundColor: "#FFFFFF",
                          boxSizing: "border-box",
                        }}
                        value={form.city}
                        onChange={setField("city")}
                        placeholder="Ikeja / Lekki / Surulere"
                        disabled={loading}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        State *
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontFamily: "var(--body-font)",
                          outline: "none",
                          backgroundColor: "#FFFFFF",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                        value={form.state}
                        onChange={setField("state")}
                        disabled={loading}
                      >
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {user && (deliveryMode === "custom" || savedAddresses.length === 0) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor: "#F9FAFB",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        marginTop: "4px",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <input
                        type="checkbox"
                        id="save_as_default_checkout"
                        checked={saveAsDefault}
                        onChange={(e) => setSaveAsDefault(e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#143c2d" }}
                      />
                      <label htmlFor="save_as_default_checkout" style={{ fontSize: "13px", color: "#374151", cursor: "pointer", fontWeight: 600 }}>
                        Save as my permanent default delivery address in profile
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Payment Method Card */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(20, 60, 45, 0.08)",
                  borderRadius: "20px",
                  padding: "28px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", borderBottom: "1px solid #F3F4F6", paddingBottom: "16px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      backgroundColor: "#143c2d",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "14px",
                    }}
                  >
                    2
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "var(--heading-font)", fontSize: "18px", fontWeight: 800, color: "#143c2d", margin: 0 }}>
                      Payment Method
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>
                      Choose your preferred method of payment
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                  {/* Option 1: Monnify */}
                  <div
                    onClick={() => setPayMethod("monnify")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      cursor: "pointer",
                      border: payMethod === "monnify" ? "2px solid #143c2d" : "1px solid #E5E7EB",
                      backgroundColor: payMethod === "monnify" ? "#F4F9F5" : "#FFFFFF",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: payMethod === "monnify" ? "6px solid #143c2d" : "2px solid #D1D5DB",
                          backgroundColor: "#FFFFFF",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                            Cards / Instant Bank Transfer / USSD
                          </p>
                          <span style={{ backgroundColor: "#E8F5E9", color: "#1B4332", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px" }}>
                            Instant
                          </span>
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6B7280" }}>
                          Visa, Mastercard, Verve, Instant Account Transfer & USSD
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "4px", color: "#6B7280" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </div>
                  </div>

                  {/* Option 2: Cash on Delivery */}
                  <div
                    onClick={() => setPayMethod("cod")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      cursor: "pointer",
                      border: payMethod === "cod" ? "2px solid #143c2d" : "1px solid #E5E7EB",
                      backgroundColor: payMethod === "cod" ? "#F4F9F5" : "#FFFFFF",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: payMethod === "cod" ? "6px solid #143c2d" : "2px solid #D1D5DB",
                          backgroundColor: "#FFFFFF",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                            Cash on Delivery / POS
                          </p>
                          <span style={{ backgroundColor: "#F3F4F6", color: "#4B5563", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "12px" }}>
                            Pay at Doorstep
                          </span>
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6B7280" }}>
                          Pay with cash or card swipe when your farm groceries arrive
                        </p>
                      </div>
                    </div>

                    <div style={{ color: "#6B7280" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <circle cx="12" cy="12" r="2" />
                        <path d="M6 12h.01M18 12h.01" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <motion.button
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={payMethod === "monnify" ? handleMonnify : handleCOD}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    borderRadius: "14px",
                    border: "none",
                    background: loading
                      ? "#9CA3AF"
                      : "linear-gradient(135deg, #143c2d 0%, #1e5a44 100%)",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : "0 8px 24px rgba(20,60,45,0.25)",
                    transition: "all 0.2s ease",
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
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid #FFFFFF", borderTopColor: "transparent", borderRadius: "50%" }}
                      />
                      <span>Processing Order...</span>
                    </>
                  ) : payMethod === "monnify" ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Pay ₦{total.toLocaleString()} Securely</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>Confirm Order · ₦{total.toLocaleString()} (Cash on Delivery)</span>
                    </>
                  )}
                </motion.button>

                <p style={{ textAlign: "center", fontSize: "12px", color: "#9CA3AF", marginTop: "14px", marginBottom: 0 }}>
                  Guaranteed safe checkout · Direct farm packaging & prompt dispatch
                </p>
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div style={{ position: "sticky", top: "24px" }}>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(20, 60, 45, 0.08)",
                  borderRadius: "20px",
                  padding: "24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid #F3F4F6", paddingBottom: "12px" }}>
                  <h2 style={{ fontFamily: "var(--heading-font)", fontSize: "17px", fontWeight: 800, color: "#143c2d", margin: 0 }}>
                    Order Summary
                  </h2>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#6B7280", backgroundColor: "#F3F4F6", padding: "3px 10px", borderRadius: "12px" }}>
                    {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Items List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: "20px",
                    maxHeight: "280px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {cartItems.map((entry, idx) => {
                    const unitPrice = getNairaPrice(entry.product.price);
                    const linePrice = unitPrice * entry.quantity;
                    return (
                      <div
                        key={`${entry.product.id}-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid #F9FAFB",
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            minWidth: "52px",
                            borderRadius: "10px",
                            overflow: "hidden",
                            backgroundColor: "#F3F4F6",
                            border: "1px solid #E5E7EB",
                            position: "relative",
                          }}
                        >
                          <img
                            src={getProductImage(entry.product)}
                            alt={entry.product.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/hero_food_4.jpg";
                            }}
                          />
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#111827",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.product.name}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6B7280" }}>
                            Qty: <strong style={{ color: "#374151" }}>{entry.quantity}</strong> {entry.product.unit ? `· ${entry.product.unit}` : ""}
                          </p>
                        </div>

                        {/* Price */}
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#143c2d", flexShrink: 0 }}>
                          ₦{linePrice.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Coupon Code Section */}
                <div style={{ marginBottom: "18px", borderTop: "1px solid #F3F4F6", paddingTop: "16px" }}>
                  {appliedCoupon ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#F4F9F5",
                        border: "1px solid rgba(20, 60, 45, 0.15)",
                        borderRadius: "10px",
                        padding: "8px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#143c2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#143c2d" }}>
                          Coupon Applied: <strong>{appliedCoupon.code}</strong> (-₦{discount.toLocaleString()})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#EF4444",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Discount Coupon Code"
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontFamily: "var(--body-font)",
                          outline: "none",
                          textTransform: "uppercase",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#143c2d")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#143c2d",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          cursor: couponLoading || !couponInput.trim() ? "not-allowed" : "pointer",
                          opacity: couponLoading || !couponInput.trim() ? 0.6 : 1,
                        }}
                      >
                        {couponLoading ? "..." : "Apply"}
                      </button>
                    </form>
                  )}
                  {couponError && (
                    <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>
                      {couponError}
                    </p>
                  )}
                </div>

                {/* Financial Breakdown */}
                <div
                  style={{
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>Farm Produce Subtotal</span>
                    <span style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}>
                      ₦{cartSubtotal.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "13px", color: "#6B7280" }}>Doorstep Delivery</span>
                    </div>
                    <span style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}>
                      ₦{DELIVERY.toLocaleString()}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#143c2d", fontWeight: 700 }}>
                        Discount Savings ({appliedCoupon?.code})
                      </span>
                      <span style={{ fontSize: "14px", color: "#143c2d", fontWeight: 800 }}>
                        -₦{discount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "14px",
                      marginTop: "4px",
                      borderTop: "2px dashed #E5E7EB",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827", fontFamily: "var(--heading-font)" }}>
                        Total Amount
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9CA3AF" }}>Including VAT & standard delivery</p>
                    </div>
                    <span style={{ fontSize: "20px", fontWeight: 900, color: "#143c2d", fontFamily: "var(--heading-font)" }}>
                      ₦{total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  style={{
                    width: "100%",
                    marginTop: "18px",
                    padding: "11px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "12px",
                    background: "#FFFFFF",
                    color: "#4B5563",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
                >
                  <span>←</span> Return to Basket / Edit Items
                </button>
              </div>

              {/* Trust Badges */}
              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(20, 60, 45, 0.08)",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#143c2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#143c2d" }}>Farm Fresh</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "#6B7280" }}>100% Quality Guaranteed</p>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(20, 60, 45, 0.08)",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#143c2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#143c2d" }}>Fast Dispatch</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "#6B7280" }}>Direct to your doorstep</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
