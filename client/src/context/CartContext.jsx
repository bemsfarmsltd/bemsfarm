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

  // Persist across refresh/tab-close — a customer who accidentally reloads
  // shouldn't lose everything they'd added.
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
    else localStorage.removeItem(COUPON_KEY);
  }, [appliedCoupon]);

  const addToCart = (product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: {
        product,
        quantity: (prev[product.id]?.quantity || 0) + 1,
      },
    }));
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
    setCart((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity },
    }));
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
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedCoupon,
        setAppliedCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);