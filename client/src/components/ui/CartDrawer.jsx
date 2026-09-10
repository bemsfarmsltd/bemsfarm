import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { getNairaPrice } from "../../utils/currency";
import { getProductImage } from "../../utils/productImages";

// Popular pantry add-ons frequently bundled with staples
const PANTRY_ADDONS = [
  {
    id: "addon-onions-1",
    name: "Red Onions (Fresh Harvest)",
    category_name: "Vegetables",
    unit: "1kg pack",
    price: 1800,
    image_url: "/hero_food_4.jpg",
    stock_quantity: 40,
  },
  {
    id: "addon-rodo-1",
    name: "Fresh Habanero / Ata Rodo",
    category_name: "Vegetables",
    unit: "500g basket",
    price: 1500,
    image_url: "/hero_food_2.jpg",
    stock_quantity: 35,
  },
  {
    id: "addon-oil-1",
    name: "Bems Pure Palm Oil (Unadulterated)",
    category_name: "Cooking Oils",
    unit: "1 Litre bottle",
    price: 3200,
    image_url: "/hero_food_3.jpg",
    stock_quantity: 25,
  },
];

export default function CartDrawer() {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cartItems,
    cartCount,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    addToCart,
  } = useCart();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isCartDrawerOpen) {
        closeCartDrawer();
      }
    };
    if (isCartDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCartDrawerOpen, closeCartDrawer]);

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCartDrawer}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
            }}
            aria-hidden="true"
          />

          {/* Slide-out Panel */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{
              position: "relative",
              display: "flex",
              height: "100%",
              width: "100%",
              maxWidth: "420px",
              flexDirection: "column",
              backgroundColor: "#FDFBF7",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid #DFD6C2",
              zIndex: 10,
              boxSizing: "border-box",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Cart Drawer"
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #DFD6C2",
                padding: "16px 20px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    height: "36px",
                    width: "36px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "10px",
                    backgroundColor: "rgba(20, 60, 45, 0.08)",
                    color: "#143c2d",
                  }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#143c2d", margin: 0, fontFamily: "var(--heading-font)" }}>
                    Your Fresh Basket
                  </h2>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", margin: "2px 0 0" }}>
                    {cartCount} {cartCount === 1 ? "item" : "items"} selected
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCartDrawer}
                style={{
                  display: "flex",
                  height: "36px",
                  width: "36px",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  color: "#4B5563",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                aria-label="Close cart drawer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Cart Items / Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {cartItems.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", textAlign: "center" }}>
                  <div
                    style={{
                      marginBottom: "16px",
                      display: "grid",
                      height: "72px",
                      width: "72px",
                      placeItems: "center",
                      borderRadius: "24px",
                      backgroundColor: "rgba(20, 60, 45, 0.08)",
                      color: "#143c2d",
                    }}
                  >
                    <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#143c2d", margin: "0 0 6px" }}>
                    Your basket is empty
                  </h3>
                  <p style={{ fontSize: "13px", color: "#6B7280", margin: 0, maxWidth: "260px", lineHeight: "1.4" }}>
                    Discover 100% stone-free grains, farm-fresh tubers, and Nigerian pantry staples.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/products");
                    }}
                    style={{
                      marginTop: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      backgroundColor: "#143c2d",
                      padding: "10px 22px",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(20,60,45,0.2)",
                    }}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => {
                  const unitPrice = getNairaPrice(product.price);
                  const lineTotal = unitPrice * quantity;
                  return (
                    <div
                      key={product.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        paddingBottom: "14px",
                        borderBottom: "1px solid #F3F4F6",
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          minWidth: "64px",
                          minHeight: "64px",
                          maxWidth: "64px",
                          maxHeight: "64px",
                          flexShrink: 0,
                          borderRadius: "12px",
                          overflow: "hidden",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          position: "relative",
                        }}
                      >
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/hero_food_4.jpg";
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <h4
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            color: "#111827",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.name}
                        </h4>
                        <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>
                          {product.unit || "Per item"} • ₦{unitPrice.toLocaleString()}
                        </span>

                        {/* Stepper & Line Total */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              border: "1px solid #E5E7EB",
                              borderRadius: "8px",
                              backgroundColor: "#FFFFFF",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              style={{
                                display: "flex",
                                height: "26px",
                                width: "26px",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#4B5563",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                              }}
                              aria-label={`Decrease ${product.name} quantity`}
                            >
                              -
                            </button>
                            <span style={{ width: "26px", textAlign: "center", fontSize: "12px", fontWeight: 800, color: "#143c2d" }}>
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              style={{
                                display: "flex",
                                height: "26px",
                                width: "26px",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#4B5563",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                              }}
                              aria-label={`Increase ${product.name} quantity`}
                            >
                              +
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#143c2d", whiteSpace: "nowrap" }}>
                              ₦{lineTotal.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              style={{
                                color: "#9CA3AF",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              aria-label={`Remove ${product.name} from basket`}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Instant Cross-Sell Staples */}
              {cartItems.length > 0 && (
                <div style={{ paddingTop: "12px", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#374151" }}>
                      Frequently Added Produce
                    </span>
                    <span style={{ fontSize: "10px", color: "#c85a17", fontWeight: 700 }}>1-Tap Add</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {PANTRY_ADDONS.map((addon) => {
                      const alreadyInCart = Boolean(cartItems.find((ci) => ci.product.id === addon.id));
                      const price = getNairaPrice(addon.price);
                      return (
                        <div
                          key={addon.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: "12px",
                            border: "1px dashed #DFD6C2",
                            backgroundColor: "rgba(255, 255, 255, 0.7)",
                            padding: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                            <img
                              src={addon.image_url}
                              alt={addon.name}
                              style={{
                                height: "38px",
                                width: "38px",
                                minWidth: "38px",
                                minHeight: "38px",
                                borderRadius: "8px",
                                objectFit: "cover",
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {addon.name}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6B7280" }}>
                                {addon.unit} • ₦{price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyInCart}
                            onClick={() => addToCart(addon)}
                            style={{
                              flexShrink: 0,
                              borderRadius: "8px",
                              padding: "5px 10px",
                              fontSize: "11px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              border: "none",
                              cursor: alreadyInCart ? "default" : "pointer",
                              backgroundColor: alreadyInCart ? "#E8F5E9" : "#143c2d",
                              color: alreadyInCart ? "#2E7D32" : "#FFFFFF",
                            }}
                          >
                            {alreadyInCart ? "Added" : "+ Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cartItems.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #DFD6C2",
                  backgroundColor: "#FFFFFF",
                  padding: "18px 20px",
                  boxShadow: "0 -4px 16px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "#4B5563" }}>
                    <span>Produce Subtotal</span>
                    <span style={{ fontWeight: 700, color: "#111827" }}>₦{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "#4B5563" }}>
                    <span>Doorstep Delivery</span>
                    <span style={{ fontWeight: 600, color: "#4B5563" }}>Calculated at checkout</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #F3F4F6", fontSize: "15px" }}>
                    <span style={{ fontWeight: 800, color: "#143c2d" }}>Estimated Total</span>
                    <span style={{ fontSize: "17px", fontWeight: 900, color: "#143c2d" }}>
                      ₦{cartSubtotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/checkout");
                    }}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      background: "linear-gradient(to right, #143c2d, #1c5540)",
                      padding: "14px 20px",
                      fontSize: "13px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(20,60,45,0.25)",
                    }}
                  >
                    <span>Proceed to Secure Checkout</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/cart");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#4B5563",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    View Full Basket Page
                  </button>
                </div>

                {/* Security Trust Badges */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>
                  <span>100% Secure Checkout</span>
                  <span>•</span>
                  <span>100% Stone-Free Guarantee</span>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
