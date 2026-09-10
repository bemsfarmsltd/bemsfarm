import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { getNairaPrice } from "../../utils/currency";
import { getProductImage } from "../../utils/productImages";
import { recordOutOfStockDemand } from "../../utils/demandTracker";
import RestockModal from "./RestockModal";

const CHEF_TIPS = {
  "Grains & Cereals": "Parboil for 10 mins before simmering with rich stock for maximum grain integrity and fragrance.",
  "Vegetables": "Best stored in a cool dry basket; slice and freeze for instant stew bases during the week.",
  "Cooking Oils": "Unadulterated and cold-extracted. Ideal for low-to-medium heat frying and rich authentic stews.",
  "Legumes": "Soak in lukewarm water for 30 minutes before boiling to achieve uniform tenderness without splitting.",
  "Tubers & Roots": "Harvested fresh from Benue & Oyo fields. Perfect for fluffy boiled yam, pounded yam, or pottage.",
  "Spices & Seasonings": "Stone-ground and unadulterated. Add towards the end of simmering to preserve volatile essential oils.",
};

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { user } = useAuth();
  const { addToCart, openCartDrawer } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setAdded(false);
      setRestockOpen(false);
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, onClose, product]);

  if (!isOpen || !product) return null;

  const stock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));
  const price = getNairaPrice(product.price);
  const isOutOfStock = stock <= 0 || product.available_for_sale === false || product.status === "out_of_stock";
  const isLowStock = stock > 0 && stock <= 5;
  const isBemsOriginal = Boolean(
    product.name?.toLowerCase().includes("bems") ||
    product.brand?.toLowerCase().includes("bems") ||
    product.is_bems_brand
  );

  const chefTip = CHEF_TIPS[product.category_name] || "100% farm-sourced, natural, and preservative-free produce for your kitchen.";

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => {
      onClose();
      openCartDrawer();
    }, 450);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="relative flex w-full max-w-2xl max-h-[92vh] overflow-y-auto flex-col rounded-3xl bg-[#FDFBF7] shadow-2xl border border-[#DFD6C2] md:flex-row"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view of ${product.name}`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-950"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Left: Product Image */}
          <div className="relative aspect-square w-full md:w-1/2 bg-[#F3EFE6] shrink-0 overflow-hidden">
            <img
              src={getProductImage(product)}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/hero_food_4.jpg";
              }}
            />
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {isBemsOriginal && (
                <span className="rounded-full bg-[#143c2d] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-md">
                   Bems Original
                </span>
              )}
              <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
                 100% Stone-Free
              </span>
            </div>
          </div>

          {/* Right: Details & Action */}
          <div className="flex flex-1 flex-col justify-between p-6 md:p-7">
            <div>
              {/* Category & Unit */}
              <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-[#143c2d]/80">
                <span>{product.category_name || "Farm Produce"}</span>
                <span className="text-slate-500 font-medium normal-case">{product.unit || "Per item"}</span>
              </div>

              {/* Title */}
              <h3 className="mt-1.5 text-xl font-black text-slate-900 leading-snug">
                {product.name}
              </h3>

              {/* Price & Stock */}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl font-black text-[#143c2d]">
                  ₦{price.toLocaleString()}
                </span>
                {isOutOfStock ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-700 border border-red-200">
                    Presently Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                    Only {stock} left
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                     In Stock
                  </span>
                )}
              </div>

              {/* Chef Bems Tip */}
              <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                  <span></span>
                  <span>Chef Bems Culinary Note:</span>
                </div>
                <p className="text-amber-950/80 leading-relaxed">
                  {chefTip}
                </p>
              </div>
            </div>

            {/* Quantity Stepper & Add Button */}
            <div className="mt-6 pt-4 border-t border-[#DFD6C2]/70 space-y-3">
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Quantity</span>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white">
                    <button
                      type="button"
                      disabled={qty <= 1}
                      onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-black text-[#143c2d]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={qty >= stock}
                      onClick={() => setQty((prev) => Math.min(stock, prev + 1))}
                      className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isOutOfStock ? (
                  <button
                    type="button"
                    onClick={() => {
                      recordOutOfStockDemand(product, "quick_view_modal_notify", user);
                      setRestockOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white bg-amber-500 hover:bg-amber-600 shadow-md transition-all cursor-pointer"
                  >
                    Notify Me When Restocked
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all ${
                      added
                        ? "bg-emerald-600 scale-[0.99]"
                        : "bg-[#143c2d] hover:bg-[#0e2c21] hover:scale-[1.01]"
                    }`}
                  >
                    {added ? (
                      <>
                        <span></span>
                        <span>Added to Basket!</span>
                      </>
                    ) : (
                      <>
                        <span></span>
                        <span>Add {qty} to Basket • ₦{(price * qty).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/product/${product.id}`);
                  }}
                  className="text-center text-xs font-bold text-[#143c2d] hover:underline py-1"
                >
                  View full product details →
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <RestockModal
          product={product}
          isOpen={restockOpen}
          onClose={() => setRestockOpen(false)}
        />
      </div>
    </AnimatePresence>
  );
}
