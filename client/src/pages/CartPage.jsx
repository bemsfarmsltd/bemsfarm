import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import { getProductImage } from "../utils/productImages";
import api from "../services/api";
import { NAIRA_PER_UNIT } from "../utils/currency";
import { getDeliveryFee, FREE_DELIVERY_THRESHOLD } from "../utils/delivery";

const CSS = `
  .bf-basket-wrap { background:#f7f5f0; min-height:80vh; position:relative; overflow:hidden; }
  .bf-basket-pattern {
    position:absolute; inset:0; pointer-events:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23143c2d' fill-opacity='0.05'/%3E%3C/svg%3E");
    background-repeat:repeat; background-size:36px 36px;
  }
  .bf-basket-inner { position:relative; z-index:1; max-width:1200px; margin:0 auto; padding:28px 20px 60px; }
  @media(min-width:900px){ .bf-basket-inner{padding:40px 32px 80px;} }
  .bf-basket-grid { display:grid; gap:28px; }
  @media(min-width:900px){ .bf-basket-grid{grid-template-columns:1fr 380px; align-items:flex-start;} }
  .bf-item-card {
    background:rgba(255,255,255,0.92); border:1px solid rgba(20,60,45,0.09); border-radius:20px;
    padding:18px; margin-bottom:14px; display:grid; grid-template-columns:80px 1fr; gap:16px;
    align-items:center; backdrop-filter:blur(6px);
  }
  @media(min-width:540px){ .bf-item-card{grid-template-columns:96px 1fr;} }
  .bf-item-img { width:80px; height:80px; border-radius:14px; object-fit:cover; background:#e8f4ed; flex-shrink:0; display:block; }
  @media(min-width:540px){ .bf-item-img{width:96px;height:96px;} }
  .bf-item-body { display:flex; flex-direction:column; gap:10px; min-width:0; }
  .bf-item-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .bf-item-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
  .bf-qty-pill { display:flex; align-items:center; gap:2px; background:#f3f4f6; border-radius:999px; border:1px solid #e5e7eb; padding:3px; }
  .bf-qty-btn { width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; font-size:17px; font-weight:700; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
  .bf-qty-btn-minus { background:white; color:#374151; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .bf-qty-btn-minus:hover { background:#fee2e2; color:#dc2626; }
  .bf-qty-btn-plus { background:#17352a; color:white; box-shadow:0 2px 8px rgba(23,53,42,0.3); }
  .bf-qty-btn-plus:hover { background:#0f2319; }
  .bf-qty-num { width:34px; text-align:center; font-size:15px; font-weight:700; color:#111827; }
  .bf-summary-card {
    background:rgba(255,255,255,0.92); border:1px solid rgba(20,60,45,0.09); border-radius:24px;
    padding:26px; backdrop-filter:blur(8px); position:sticky; top:84px;
  }
  .bf-delivery-bar-bg { height:8px; background:#e5e7eb; border-radius:99px; overflow:hidden; margin:10px 0 6px; }
  .bf-delivery-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,#17352a,#2d9b6f); transition:width 0.5s ease; }
  .bf-trust-strip { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:18px; }
  .bf-trust-badge { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#4b5563; background:#f3f4f6; border-radius:999px; padding:5px 10px; }
`;

function EmptyBasket() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <style>{CSS}</style>
      <div className="bf-basket-wrap">
        <div className="bf-basket-pattern" />
        <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", padding:"100px 24px 60px", position:"relative", zIndex:1 }}>
          <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut" }} style={{ fontSize:72, lineHeight:1, marginBottom:20 }}>🛒</motion.div>
          <h1 style={{ fontFamily:"var(--heading-font,serif)", fontSize:"clamp(22px,4vw,30px)", fontWeight:800, color:"#111827", marginBottom:10 }}>Your basket is empty</h1>
          <p style={{ color:"#6b7280", fontSize:15, lineHeight:1.7, marginBottom:32 }}>Browse our fresh Nigerian produce, Bems Farms brand staples and everyday kitchen essentials.</p>
          <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }} onClick={() => navigate("/products")} style={{ backgroundColor:"#17352a", color:"white", border:"none", borderRadius:999, padding:"15px 36px", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 20px rgba(23,53,42,0.3)" }}>Start Shopping →</motion.button>
          <div className="bf-trust-strip" style={{ justifyContent:"center", marginTop:28 }}>
            {[["🚚","Nationwide Delivery"],["🔒","Secure Payment"],["↩","7-day Returns"]].map(([icon,label]) => (
              <span key={label} className="bf-trust-badge">{icon} {label}</span>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, cartSubtotal, updateQuantity, removeFromCart, appliedCoupon, setAppliedCoupon } = useCart();
  const delivery = getDeliveryFee(cartSubtotal);
  const discount = appliedCoupon?.discount || 0;
  const total = cartSubtotal + delivery - discount;
  const freeDeliveryProgress = Math.min(100, (cartSubtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - cartSubtotal);
  const totalQty = cartItems.reduce((a, i) => a + i.quantity, 0);

  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponValid, setCouponValid] = useState(null);
  const [validating, setValidating] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const applyCoupon = async () => {
    const code = coupon.toUpperCase().trim();
    if (!code) return;
    setValidating(true);
    try {
      const { data } = await api.post("/admin/coupons/validate", { code, order_total: cartSubtotal });
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

  const removeCoupon = () => { setAppliedCoupon(null); setCoupon(""); setCouponMsg(""); setCouponValid(null); };

  const handleRemove = (id) => {
    setRemovingId(id);
    setTimeout(() => { removeFromCart(id); setRemovingId(null); }, 300);
  };

  if (cartItems.length === 0) return <EmptyBasket />;

  return (
    <PageWrapper>
      <style>{CSS}</style>
      <div className="bf-basket-wrap">
        <div className="bf-basket-pattern" />
        <div className="bf-basket-inner">

          {/* Breadcrumb */}
          <nav style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#9ca3af", marginBottom:24 }}>
            <Link to="/" style={{ color:"#9ca3af", textDecoration:"none" }}>Home</Link>
            <span>/</span>
            <Link to="/products" style={{ color:"#9ca3af", textDecoration:"none" }}>Shop</Link>
            <span>/</span>
            <span style={{ color:"#111827", fontWeight:600 }}>Basket</span>
          </nav>

          {/* Heading */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
            <div>
              <h1 style={{ fontFamily:"var(--heading-font,serif)", fontSize:"clamp(22px,4vw,30px)", fontWeight:900, color:"#111827", margin:0 }}>🛒 Your Basket</h1>
              <p style={{ margin:"4px 0 0", fontSize:14, color:"#6b7280" }}>{totalQty} {totalQty === 1 ? "item" : "items"} ready to checkout</p>
            </div>
            <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate("/products")} style={{ background:"white", border:"1.5px solid #e5e7eb", borderRadius:999, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer", color:"#374151" }}>
              ← Continue Shopping
            </motion.button>
          </div>

          <div className="bf-basket-grid">
            {/* LEFT — Item list */}
            <div>
              {delivery > 0 && (
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} style={{ background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)", border:"1.5px solid #bbf7d0", borderRadius:16, padding:"14px 18px", marginBottom:20 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#166534", margin:0 }}>🚚 Add <strong>₦{remaining.toLocaleString()}</strong> more to get <strong>FREE delivery</strong>!</p>
                  <div className="bf-delivery-bar-bg"><div className="bf-delivery-bar-fill" style={{ width:`${freeDeliveryProgress}%` }} /></div>
                  <p style={{ fontSize:11, color:"#4b7563", margin:0 }}>₦{cartSubtotal.toLocaleString()} / ₦{FREE_DELIVERY_THRESHOLD.toLocaleString()} for free delivery</p>
                </motion.div>
              )}
              {delivery === 0 && (
                <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", borderRadius:16, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:22 }}>🎉</span>
                  <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:0 }}>You qualify for FREE delivery!</p>
                </motion.div>
              )}

              <AnimatePresence mode="popLayout">
                {cartItems.map(({ product, quantity }) => {
                  const imgSrc = product.image_url?.startsWith("http") ? product.image_url : getProductImage(product);
                  const lineTotal = product.price * NAIRA_PER_UNIT * quantity;
                  const isRemoving = removingId === product.id;
                  return (
                    <motion.div
                      key={product.id} layout
                      initial={{ opacity:0, scale:0.97, y:10 }}
                      animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.95 : 1, y:0 }}
                      exit={{ opacity:0, scale:0.95, y:-8 }}
                      transition={{ duration:0.3 }}
                      className="bf-item-card"
                    >
                      <div style={{ position:"relative" }}>
                        <img src={imgSrc} alt={product.name} className="bf-item-img"
                          onError={(e) => { e.target.style.display="none"; if(e.target.nextSibling) e.target.nextSibling.style.display="flex"; }}
                        />
                        <div style={{ display:"none", width:80, height:80, borderRadius:14, background:"#e8f4ed", alignItems:"center", justifyContent:"center", fontSize:36, flexShrink:0 }}>🌾</div>
                      </div>

                      <div className="bf-item-body">
                        <div className="bf-item-top">
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontWeight:800, fontSize:15, color:"#111827", margin:"0 0 2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"calc(100vw - 220px)" }}>{product.name}</p>
                            <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>{product.unit}</p>
                          </div>
                          <motion.button whileTap={{ scale:0.85 }} onClick={() => handleRemove(product.id)} aria-label={`Remove ${product.name}`}
                            style={{ flexShrink:0, width:30, height:30, borderRadius:"50%", border:"1.5px solid #e5e7eb", background:"white", cursor:"pointer", fontSize:14, color:"#9ca3af", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</motion.button>
                        </div>
                        <div className="bf-item-bottom">
                          <div className="bf-qty-pill">
                            <button className="bf-qty-btn bf-qty-btn-minus" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="Decrease">−</button>
                            <span className="bf-qty-num">{quantity}</span>
                            <button className="bf-qty-btn bf-qty-btn-plus" onClick={() => updateQuantity(product.id, quantity + 1)} aria-label="Increase">+</button>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>₦{(product.price * NAIRA_PER_UNIT).toLocaleString()} each</p>
                            <p style={{ margin:0, fontSize:17, fontWeight:900, color:"#17352a" }}>₦{lineTotal.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <div className="bf-trust-strip" style={{ justifyContent:"flex-start", marginTop:24 }}>
                {[["🔒","Secure Payment"],["🚚","Nationwide Delivery"],["↩","7-day Returns"],["📞","24/7 Support"]].map(([icon,label]) => (
                  <span key={label} className="bf-trust-badge">{icon} {label}</span>
                ))}
              </div>
            </div>

            {/* RIGHT — Summary */}
            <div className="bf-summary-card">
              <h2 style={{ fontFamily:"var(--heading-font,serif)", fontSize:20, fontWeight:800, color:"#111827", margin:"0 0 20px" }}>Order Summary</h2>

              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:14, color:"#6b7280" }}>Subtotal ({totalQty} {totalQty===1?"item":"items"})</span>
                <span style={{ fontSize:15, fontWeight:700, color:"#111827" }}>₦{cartSubtotal.toLocaleString()}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:14, color:"#6b7280" }}>Delivery</span>
                <span style={{ fontSize:14, fontWeight:700, color: delivery===0 ? "#16a34a" : "#374151" }}>{delivery===0 ? "🎉 Free" : `₦${delivery.toLocaleString()}`}</span>
              </div>
              {discount > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:14, color:"#16a34a" }}>Discount ({appliedCoupon?.code})</span>
                  <span style={{ fontSize:14, fontWeight:700, color:"#16a34a" }}>−₦{discount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ borderTop:"2px solid #f3f4f6", margin:"16px 0" }} />

              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:22 }}>
                <span style={{ fontSize:16, fontWeight:800, color:"#111827" }}>Total</span>
                <span style={{ fontSize:22, fontWeight:900, color:"#17352a" }}>₦{total.toLocaleString()}</span>
              </div>

              <motion.button
                whileHover={{ scale:1.02, y:-2 }} whileTap={{ scale:0.97 }}
                onClick={() => navigate("/checkout")}
                style={{ width:"100%", background:"linear-gradient(135deg,#d86d20,#f57c00)", color:"white", border:"none", borderRadius:999, padding:"17px 0", fontSize:16, fontWeight:900, cursor:"pointer", boxShadow:"0 6px 24px rgba(213,109,32,0.35)", letterSpacing:"0.01em" }}
              >
                Proceed to Checkout →
              </motion.button>
              <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", margin:"12px 0 20px" }}>🔒 Payments secured by Monnify</p>

              <div style={{ borderTop:"1px solid #f3f4f6", paddingTop:20 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:10, marginTop:0 }}>Have a coupon?</p>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={coupon}
                    disabled={!!appliedCoupon || validating}
                    onChange={(e) => { setCoupon(e.target.value); setCouponMsg(""); setCouponValid(null); }}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="Coupon code"
                    style={{ flex:1, minWidth:0, padding:"11px 14px", border:`1.5px solid ${couponValid===true?"#16a34a":couponValid===false?"#dc2626":"#e5e7eb"}`, borderRadius:12, fontSize:14, outline:"none", background:"white", color:"#111827" }}
                  />
                  {appliedCoupon ? (
                    <button onClick={removeCoupon} style={{ padding:"11px 16px", borderRadius:12, background:"#fef2f2", border:"1.5px solid #fecaca", color:"#dc2626", fontWeight:700, cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>Remove</button>
                  ) : (
                    <button onClick={applyCoupon} disabled={validating} style={{ padding:"11px 16px", borderRadius:12, background:"#17352a", border:"none", color:"white", fontWeight:700, cursor: validating?"not-allowed":"pointer", fontSize:13, opacity: validating?0.7:1, whiteSpace:"nowrap" }}>{validating ? "..." : "Apply"}</button>
                  )}
                </div>
                {couponMsg && (
                  <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} style={{ fontSize:12, fontWeight:600, color: couponValid?"#16a34a":"#dc2626", margin:"8px 0 0" }}>{couponMsg}</motion.p>
                )}
              </div>

              <div style={{ borderTop:"1px solid #f3f4f6", marginTop:20, paddingTop:16 }}>
                <Link to="/products" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13, fontWeight:700, color:"#17352a", textDecoration:"none", borderRadius:12, padding:"10px 0", border:"1.5px solid #d1fae5", background:"#f0fdf4" }}>
                  🛍️ Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
