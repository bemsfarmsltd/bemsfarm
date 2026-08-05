import { createContext, useContext, useState } from "react";
import { NAIRA_PER_UNIT } from "../utils/currency";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, type, value }

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
