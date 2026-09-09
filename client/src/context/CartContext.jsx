import { createContext, useContext, useState, useEffect } from "react";
import { NAIRA_PER_UNIT } from "../utils/currency";

const CartContext = createContext();

const CART_KEY = "bems_cart";
const COUPON_KEY = "bems_cart_coupon";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);
  const [products, setProducts] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(loadCoupon); // { code, discount, type, value }
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Persist across refresh/tab-close — a customer who accidentally reloads
  // shouldn't lose everything they'd added.
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
    else localStorage.removeItem(COUPON_KEY);
  }, [appliedCoupon]);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);
  const toggleCartDrawer = () => setIsCartDrawerOpen((prev) => !prev);

  const addToCart = (product, quantityToAdd = 1) => {
    setCart((prev) => {
      const currentQty = prev[product.id]?.quantity || 0;
      const maxQty = product.stock_quantity ?? Infinity;
      const nextQty = Math.min(currentQty + quantityToAdd, maxQty);
      if (nextQty === currentQty) return prev;
      return {
        ...prev,
        [product.id]: { product, quantity: nextQty },
      };
    });
  };

  const addMultipleToCart = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setCart((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        const prod = item.product || item;
        const addQty = item.quantity || 1;
        const currentQty = updated[prod.id]?.quantity || 0;
        const maxQty = prod.stock_quantity ?? Infinity;
        const nextQty = Math.min(currentQty + addQty, maxQty);
        updated[prod.id] = { product: prod, quantity: nextQty };
      });
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const maxQty = existing.product?.stock_quantity ?? Infinity;
      return {
        ...prev,
        [productId]: { ...existing, quantity: Math.min(quantity, maxQty) },
      };
    });
  };

  const clearCart = () => { setCart({}); setAppliedCoupon(null); };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((a, item) => a + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (a, item) => a + item.product.price * NAIRA_PER_UNIT * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        cartCount,
        cartSubtotal,
        addToCart,
        addMultipleToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedCoupon,
        setAppliedCoupon,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        toggleCartDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);