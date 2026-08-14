import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import { getProductEmoji, getProductBg } from "../components/ui/ProductCard";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getDeliveryFee } from "../utils/delivery";

/*
  ── RESPONSIVE STRATEGY ──────────────────────────────────────
  Old version drove the cart-row grid with JS isMobile boolean,
  collapsing straight from a cramped 4-column desktop grid to a
  stacked mobile layout with nothing in between — broke badly on
  tablets (768-1023px) where 4 columns were still forced or the
  jump to full-stack wasted huge horizontal space.

  New breakpoints:
    <640px    : fully stacked card layout (image+name on top row,
                price/qty/subtotal below) — no grid at all
    640-899px : 2-column summary below cart (not sidebar), simpler
                3-col item grid (Product / Qty / Subtotal, price
                folded into product line)
    >=900px   : original 4-column grid + sticky sidebar summary
*/
const CART_CSS = `
.bf-cart-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.bf-cart-page-pad { padding: 20px 16px; }
.bf-cart-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
.bf-cart-row-header { display: none; }
.bf-cart-row { display: flex; flex-direction: column; gap: 12px; align-items: stretch; }
.bf-cart-row-product { display: flex; align-items: center; gap: 12px; }
.bf-cart-row-meta { display: flex; justify-content: space-between; align-items: center; }
.bf-cart-summary { position: static; }
.bf-cart-actions { flex-direction: column; align-items: stretch; gap: 16px; }

@media (min-width: 640px) {
  .bf-cart-row-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; }
  .bf-cart-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; align-items: center; }
  .bf-cart-row-meta { display: contents; }
  .bf-cart-actions { flex-direction: row; align-items: center; }
}

@media (min-width: 900px) {
  .bf-cart-page-pad { padding: 32px 24px; }
  .bf-cart-grid { grid-template-columns: 1fr 360px; gap: 32px; align-items: flex-start; }
  .bf-cart-summary { position: sticky; top: 90px; }
}
`;

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, cartSubtotal, updateQuantity, removeFromCart, appliedCoupon, setAppliedCoupon } = useCart();
  const delivery = getDeliveryFee(cartSubtotal);
  const discount = appliedCoupon?.discount || 0;
  const total = cartSubtotal + delivery - discount;
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponValid, setCouponValid] = useState(null);
  const [validating, setValidating] = useState(false);

  const applyCoupon = async () => {
    const code = coupon.toUpperCase().trim();
    if (!code) return;
    setValidating(true);
    try {
      const { data } = await api.post("/admin/coupons/validate", {
        code,
        order_total: cartSubtotal,
      });
      if (data.valid) {
        setAppliedCoupon({ code, discount: data.discount, type: data.coupon.type, value: data.coupon.value });
        setCouponMsg(`✅ Coupon applied! You saved ₦${data.discount.toLocaleString()}`);
        setCouponValid(true);
      } else {
        setAppliedCoupon(null);
        setCouponMsg(`❌ ${data.message || "Invalid coupon code"}`);
        setCouponValid(false);
      }
    } catch {
      setAppliedCoupon(null);
      setCouponMsg("❌ Could not validate coupon. Please try again.");
      setCouponValid(false);
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
    setCouponMsg("");
    setCouponValid(null);
  };

  if (cartItems.length === 0)
    return (
      <PageWrapper>
        <style>{CART_CSS}</style>
        <div style={{ backgroundColor: "#FBF8F3", position: "relative", overflow: "hidden", minHeight: "70vh" }}>
          <div className="bf-cart-blob" style={{ width: 320, height: 320, top: -100, left: -100, background: "radial-gradient(circle, rgba(46,125,50,0.12), transparent 70%)" }} />
          <div
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              textAlign: "center",
              padding: "80px 20px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <motion.img
              src="https://res.cloudinary.com/dyzkjerez/image/upload/v1786166844/Gemini_Generated_Image_ez0fcxez0fcxez0f_atfxkk.png"
              alt=""
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ width: "120px", height: "120px", margin: "0 auto 20px", display: "block" }}
            />
            <h2
              style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px", fontFamily: "Syne, sans-serif" }}
            >
              Your cart is empty
            </h2>
            <p style={{ color: "#9AA0A6", marginBottom: "20px" }}>
              Looks like you haven't added any Nigerian foods yet!
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/products")}
              style={{
                backgroundColor: "#2E7D32",
                color: "white",
                border: "none",
                borderRadius: "999px",
                padding: "14px 32px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(46,125,50,0.3)",
              }}
            >
              Browse Products 🌾
            </motion.button>
          </div>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <style>{CART_CSS}</style>
      <div style={{ backgroundColor: "#FBF8F3", position: "relative", overflow: "hidden" }}>
        <div className="bf-cart-blob" style={{ width: 320, height: 320, top: -100, left: -100, background: "radial-gradient(circle, rgba(46,125,50,0.10), transparent 70%)" }} />
        <div className="bf-cart-blob" style={{ width: 260, height: 260, bottom: -80, right: -80, background: "radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)" }} />
      <div
        className="bf-cart-page-pad"
        style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "18px",
            fontSize: "13px",
            color: "#9AA0A6",
          }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9AA0A6",
            }}
          >
            Home
          </button>
          <span>/</span>
          <span style={{ color: "#202124", fontWeight: 600 }}>Cart</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: 800,
            marginBottom: "20px",
            fontFamily: "Syne, sans-serif",
          }}
        >
          My Cart
        </h1>

        <div className="bf-cart-grid">
          {/* Cart Items */}
          <div>
            <div
              className="bf-cart-row-header"
              style={{
                padding: "12px 16px",
                backgroundColor: "#F8F9FA",
                borderRadius: "12px",
                marginBottom: "12px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#9AA0A6",
              }}
            >
              <span>Product</span>
              <span style={{ textAlign: "center" }}>Price</span>
              <span style={{ textAlign: "center" }}>Quantity</span>
              <span style={{ textAlign: "right" }}>Subtotal</span>
            </div>

            <AnimatePresence>
              {cartItems.map(({ product, quantity }) => (
                <motion.div
                  key={product.id}
                  className="bf-cart-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  style={{
                    padding: "16px",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: "20px",
                    marginBottom: "12px",
                    border: "1px solid rgba(27,67,50,0.08)",
                  }}
                >
                  {/* Product */}
                  <div className="bf-cart-row-product">
                    <div style={{ position: "relative" }}>
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => removeFromCart(product.id)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          left: "-8px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#F44336",
                          border: "none",
                          cursor: "pointer",
                          color: "white",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1,
                        }}
                      >
                        ✕
                      </motion.button>
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "12px",
                          backgroundColor: getProductBg(product.name),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "28px",
                          flexShrink: 0,
                        }}
                      >
                        {getProductEmoji(product.name)}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#202124",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#9AA0A6" }}>
                        {product.unit}
                      </p>
                    </div>
                  </div>

                  {/* On mobile: price + subtotal share a row; on >=640px these become real grid cells */}
                  <div className="bf-cart-row-meta">
                    <p
                      style={{
                        fontWeight: 600,
                        color: "#5F6368",
                        fontSize: "13px",
                        textAlign: "center",
                        margin: 0,
                      }}
                    >
                      <span style={{ display: "inline" }}>
                        ₦{(product.price * NAIRA_PER_UNIT).toLocaleString()} each
                      </span>
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "center",
                        backgroundColor: "#F8F9FA",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        border: "1px solid #E8EAED",
                      }}
                    >
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: "1px solid #E8EAED",
                          backgroundColor: "white",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#5F6368",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </motion.button>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {quantity}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: "none",
                          backgroundColor: "#F57C00",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </motion.button>
                    </div>

                    <p
                      style={{
                        textAlign: "right",
                        fontWeight: 800,
                        fontSize: "15px",
                        color: "#2E7D32",
                        margin: 0,
                      }}
                    >
                      ₦{(product.price * NAIRA_PER_UNIT * quantity).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Actions */}
            <div
              className="bf-cart-actions"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/products")}
                style={{
                  padding: "12px 24px",
                  borderRadius: "999px",
                  border: "1px solid #E8EAED",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                ← Return to Shop
              </motion.button>

              <div>
                <div
                  style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                >
                  <input
                    value={coupon}
                    disabled={!!appliedCoupon || validating}
                    onChange={(e) => {
                      setCoupon(e.target.value);
                      setCouponMsg("");
                      setCouponValid(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="Coupon code"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "12px 16px",
                      border: `1px solid ${couponValid === true ? "#2E7D32" : couponValid === false ? "#C62828" : "#E8EAED"}`,
                      borderRadius: "999px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  {appliedCoupon ? (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={removeCoupon}
                      style={{
                        padding: "12px 20px",
                        borderRadius: "999px",
                        backgroundColor: "white",
                        border: "1px solid #E8EAED",
                        color: "#C62828",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Remove
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={applyCoupon}
                      disabled={validating}
                      style={{
                        padding: "12px 20px",
                        borderRadius: "999px",
                        backgroundColor: "#F57C00",
                        border: "none",
                        color: "white",
                        fontWeight: 700,
                        cursor: validating ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        opacity: validating ? 0.7 : 1,
                        boxShadow: "0 4px 12px rgba(245,124,0,0.3)",
                      }}
                    >
                      {validating ? "Checking..." : "Apply"}
                    </motion.button>
                  )}
                </div>
                {couponMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontSize: "13px",
                      color: couponValid ? "#2E7D32" : "#C62828",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {couponMsg}
                  </motion.p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div
            className="bf-cart-summary"
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              borderRadius: "20px",
              padding: "22px",
              border: "1px solid rgba(27,67,50,0.08)",
            }}
          >
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 700,
                marginBottom: "18px",
                fontFamily: "Syne, sans-serif",
              }}
            >
              Cart Total
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid #F1F3F4",
              }}
            >
              <span style={{ color: "#5F6368", fontSize: "14px" }}>
                Subtotal:
              </span>
              <span
                style={{ fontWeight: 800, fontSize: "18px", color: "#2E7D32" }}
              >
                ₦{cartSubtotal.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "14px",
                paddingBottom: "14px",
                borderBottom: "1px solid #F1F3F4",
              }}
            >
              <span style={{ color: "#5F6368", fontSize: "14px" }}>
                Shipping:
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: delivery === 0 ? "#2E7D32" : "#202124",
                }}
              >
                {delivery === 0 ? "Free 🎉" : `₦${delivery.toLocaleString()}`}
              </span>
            </div>
            {delivery === 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#2E7D32",
                  backgroundColor: "#E8F5E9",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  marginBottom: "14px",
                }}
              >
                🎉 You qualified for free shipping!
              </p>
            )}
            {delivery > 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#9AA0A6",
                  marginBottom: "14px",
                }}
              >
                Add ₦{(15000 - cartSubtotal).toLocaleString()} more for free
                shipping
              </p>
            )}
            {discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ color: "#2E7D32", fontSize: "14px" }}>
                  Discount
                </span>
                <span style={{ fontWeight: 600, color: "#2E7D32" }}>
                  -₦{discount.toLocaleString()}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "15px" }}>Total:</span>
              <span
                style={{ fontWeight: 800, fontSize: "18px", color: "#2E7D32" }}
              >
                ₦{total.toLocaleString()}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/checkout")}
              style={{
                width: "100%",
                backgroundColor: "#F57C00",
                color: "white",
                border: "none",
                borderRadius: "999px",
                padding: "16px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(245,124,0,0.35)",
              }}
            >
              Proceed to Checkout →
            </motion.button>
          </div>
        </div>
      </div>
      </div>
    </PageWrapper>
  );
}
