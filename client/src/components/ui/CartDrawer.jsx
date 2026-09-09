import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { NAIRA_PER_UNIT } from "../../utils/currency";
import { getProductImage } from "../../utils/productImages";

const FREE_DELIVERY_THRESHOLD = 15000;

// Popular pantry add-ons frequently bundled with staples
const PANTRY_ADDONS = [
  {
    id: "addon-onions-1",
    name: "Red Onions (Fresh Harvest)",
    category_name: "Vegetables",
    unit: "1kg pack",
    price: 1800 / NAIRA_PER_UNIT,
    image_url: "/hero_food_4.jpg",
    stock_quantity: 40,
  },
  {
    id: "addon-rodo-1",
    name: "Fresh Habanero / Ata Rodo",
    category_name: "Vegetables",
    unit: "500g basket",
    price: 1500 / NAIRA_PER_UNIT,
    image_url: "/hero_food_2.jpg",
    stock_quantity: 35,
  },
  {
    id: "addon-oil-1",
    name: "Bems Pure Palm Oil (Unadulterated)",
    category_name: "Cooking Oils",
    unit: "1 Litre bottle",
    price: 3200 / NAIRA_PER_UNIT,
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

  const progressPercent = Math.min(
    100,
    Math.round((cartSubtotal / FREE_DELIVERY_THRESHOLD) * 100)
  );
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - cartSubtotal);

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCartDrawer}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Slide-out Panel */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative flex h-full w-full max-w-md flex-col bg-[#FDFBF7] shadow-2xl border-l border-[#DFD6C2]"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Cart Drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DFD6C2] px-6 py-4 bg-white/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="text-xl"></span>
                <div>
                  <h2 className="text-base font-black text-[#143c2d]">Your Fresh Basket</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {cartCount} {cartCount === 1 ? "item" : "items"} selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close cart drawer"
              >
                
              </button>
            </div>

            {/* Free Delivery Meter */}
            <div className="bg-[#143c2d]/5 px-6 py-3.5 border-b border-[#DFD6C2]/60">
              <div className="flex items-center justify-between text-xs font-bold text-[#143c2d] mb-1.5">
                <span>
                  {remainingForFreeDelivery === 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                       <span>FREE Doorstep Delivery Unlocked!</span>
                    </span>
                  ) : (
                    <span>
                      Add <strong className="text-[#c85a17]">₦{remainingForFreeDelivery.toLocaleString()}</strong> more for FREE delivery
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ₦{cartSubtotal.toLocaleString()} / ₦{FREE_DELIVERY_THRESHOLD.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4 }}
                  className={`h-full rounded-full ${
                    remainingForFreeDelivery === 0
                      ? "bg-linear-to-r from-emerald-500 to-teal-500"
                      : "bg-linear-to-r from-[#c85a17] to-amber-500"
                  }`}
                />
              </div>
            </div>

            {/* Cart Items / Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 divide-y divide-slate-100">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-[#143c2d]/10 text-4xl">
                    
                  </div>
                  <h3 className="text-lg font-black text-[#143c2d]">Your basket is empty</h3>
                  <p className="mt-1 max-w-xs text-xs text-slate-600">
                    Discover 100% stone-free grains, farm-fresh tubers, and Nigerian pantry staples.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/products");
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#143c2d] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#0e2c21]"
                  >
                    Start Shopping 
                  </button>
                </div>
              ) : (
                cartItems.map(({ product, quantity }) => {
                  const unitPrice = Number(product.price || 0) * NAIRA_PER_UNIT;
                  const lineTotal = unitPrice * quantity;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3.5 pt-4 first:pt-0"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/hero_food_4.jpg";
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col min-w-0">
                        <h4 className="truncate text-xs font-bold text-slate-900">
                          {product.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {product.unit || "Per item"} • ₦{unitPrice.toLocaleString()}
                        </span>

                        {/* Stepper & Line Total */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                              aria-label={`Decrease ${product.name} quantity`}
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-xs font-black text-[#143c2d]">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                              aria-label={`Increase ${product.name} quantity`}
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#143c2d]">
                              ₦{lineTotal.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              aria-label={`Remove ${product.name} from basket`}
                            >
                              
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
                <div className="pt-5 pb-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Frequently Added Produce
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">1-Tap Add</span>
                  </div>
                  <div className="space-y-2">
                    {PANTRY_ADDONS.map((addon) => {
                      const alreadyInCart = Boolean(cartItems.find((ci) => ci.product.id === addon.id));
                      const price = addon.price * NAIRA_PER_UNIT;
                      return (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between rounded-xl border border-dashed border-[#DFD6C2] bg-white/70 p-2.5 transition hover:bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={addon.image_url}
                              alt={addon.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                            <div className="truncate">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {addon.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {addon.unit} • ₦{price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyInCart}
                            onClick={() => addToCart(addon)}
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition ${
                              alreadyInCart
                                ? "bg-emerald-100 text-emerald-800 cursor-default"
                                : "bg-[#143c2d] text-white hover:bg-[#0e2c21]"
                            }`}
                          >
                            {alreadyInCart ? " Added" : "+ Add"}
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
              <div className="border-t border-[#DFD6C2] bg-white p-5 shadow-lg space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Produce Subtotal</span>
                    <span className="font-bold text-slate-900">₦{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Doorstep Delivery</span>
                    <span className="font-bold text-emerald-700">
                      {remainingForFreeDelivery === 0 ? "FREE" : "Calculated at checkout"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                    <span className="font-black text-[#143c2d]">Estimated Total</span>
                    <span className="text-base font-black text-[#143c2d]">
                      ₦{cartSubtotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/checkout");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#143c2d] to-[#1c5540] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
                  >
                    <span>Proceed to Secure Checkout</span>
                    <span></span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate("/cart");
                    }}
                    className="w-full text-center text-xs font-bold text-slate-600 hover:text-[#143c2d] transition-colors py-1"
                  >
                    View Full Basket Page
                  </button>
                </div>

                {/* Security Trust Badges */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold pt-1">
                  <span> 100% Secure Checkout</span>
                  <span>•</span>
                  <span> 100% Stone-Free Guarantee</span>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
