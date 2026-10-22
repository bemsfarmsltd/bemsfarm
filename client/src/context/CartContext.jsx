import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getNairaPrice } from "../utils/currency";
import { cartAPI } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

const CART_KEY = "bems_cart";
const COUPON_KEY = "bems_cart_coupon";
const SESSION_KEY = "bems_session_id";

function getOrCreateSessionId() {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "sess_fallback_" + Date.now();
  }
}

function loadLocalCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadLocalCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(loadLocalCart);
  const [appliedCoupon, setAppliedCoupon] = useState(loadLocalCoupon); // { code, discount, type, value }
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);

  const sessionIdRef = useRef(getOrCreateSessionId());
  const initialSyncDoneRef = useRef(false);
  const prevUserRef = useRef(user?.id || null);

  // Helper to convert backend items array into context cart dictionary { [productId]: { product, quantity, notes } }
  const formatBackendCart = useCallback((backendItems = []) => {
    const dict = {};
    backendItems.forEach((item) => {
      const prod = item.product;
      if (prod && prod.id) {
        dict[prod.id] = {
          product: prod,
          quantity: Number(item.quantity || 1),
          notes: item.notes || "",
        };
      }
    });
    return dict;
  }, []);

  // Fetch cart directly from backend
  const refreshBackendCart = useCallback(async () => {
    try {
      const sid = sessionIdRef.current;
      const res = await cartAPI.getCart({ session_id: sid });
      if (res.data && Array.isArray(res.data.items)) {
        const formatted = formatBackendCart(res.data.items);
        setCart(formatted);
      }
    } catch (err) {
      console.warn("[CartContext] Failed to refresh cart from backend:", err?.message);
    }
  }, [formatBackendCart]);

  // Synchronize with backend on mount & whenever user changes (login / logout)
  useEffect(() => {
    let isMounted = true;

    async function initializeCartSync() {
      const sid = sessionIdRef.current;
      const currentUserId = user?.id || null;
      const wasLoggedOut = !prevUserRef.current && currentUserId;

      prevUserRef.current = currentUserId;

      if (currentUserId) {
        // User is logged in
        setLoadingCart(true);
        try {
          // If customer just logged in with existing local items, merge them into their persistent account cart
          const currentLocalItems = Object.values(loadLocalCart());
          if (wasLoggedOut && currentLocalItems.length > 0) {
            const syncPayload = currentLocalItems.map((item) => ({
              productId: item.product?.id,
              quantity: item.quantity,
              notes: item.notes,
            }));
            const syncRes = await cartAPI.syncCart(syncPayload, sid);
            if (isMounted && syncRes.data?.items) {
              setCart(formatBackendCart(syncRes.data.items));
            }
          } else {
            // Read active account cart from backend (persistent across all devices)
            const res = await cartAPI.getCart();
            if (isMounted && res.data?.items) {
              setCart(formatBackendCart(res.data.items));
            }
          }
        } catch (err) {
          console.warn("[CartContext] Error syncing customer cart:", err?.message);
        } finally {
          if (isMounted) setLoadingCart(false);
          initialSyncDoneRef.current = true;
        }
      } else {
        // Guest mode: fetch guest cart or use local storage
        if (!initialSyncDoneRef.current) {
          try {
            const res = await cartAPI.getCart({ session_id: sid });
            if (isMounted && res.data?.items && res.data.items.length > 0) {
              setCart(formatBackendCart(res.data.items));
            }
          } catch (e) {
            // Keep localCart fallback
          }
          initialSyncDoneRef.current = true;
        }
      }
    }

    initializeCartSync();

    return () => {
      isMounted = false;
    };
  }, [user, formatBackendCart]);

  // Multi-device sync: refresh cart when user returns to this tab / window gains focus
  useEffect(() => {
    const handleSyncOnFocus = () => {
      if (document.visibilityState === "visible") {
        refreshBackendCart();
      }
    };

    window.addEventListener("focus", handleSyncOnFocus);
    document.addEventListener("visibilitychange", handleSyncOnFocus);

    // Cross-tab synchronization in same browser
    const handleStorageChange = (e) => {
      if (e.key === CART_KEY && e.newValue) {
        try {
          setCart(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("focus", handleSyncOnFocus);
      document.removeEventListener("visibilitychange", handleSyncOnFocus);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshBackendCart]);

  // Persist to localStorage for instantaneous zero-flicker render on reload
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      if (appliedCoupon) localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [appliedCoupon]);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);
  const toggleCartDrawer = () => setIsCartDrawerOpen((prev) => !prev);

  // ─────────────────────────────────────────────────────────────────────────
  // CART MUTATIONS (Optimistic UI + Background Backend Sync)
  // ─────────────────────────────────────────────────────────────────────────

  const addToCart = useCallback((product, quantityToAdd = 1) => {
    const prodId = product.id;
    const addQty = Math.max(1, Number(quantityToAdd) || 1);

    // 1. Optimistic local update
    setCart((prev) => {
      const currentQty = prev[prodId]?.quantity || 0;
      const effStock = Math.max(Number(product.stock_quantity || 0), Number(product.stock || 0));
      const maxQty = effStock > 0 ? effStock : Infinity;
      const nextQty = Math.min(currentQty + addQty, maxQty);
      if (nextQty === currentQty) return prev;
      return {
        ...prev,
        [prodId]: { product, quantity: nextQty },
      };
    });

    // 2. Background sync to backend
    const sid = sessionIdRef.current;
    cartAPI.addItem({ productId: prodId, quantity: addQty, sessionId: sid }).catch((err) => {
      console.warn("[CartContext] Failed to sync addItem to backend:", err?.message);
    });
  }, []);

  const addMultipleToCart = useCallback((items, options = {}) => {
    if (!Array.isArray(items) || items.length === 0) return;

    // 1. Optimistic update
    setCart((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        const prod = item.product || item;
        const addQty = item.quantity || 1;
        const currentQty = updated[prod.id]?.quantity || 0;
        const effStock = Math.max(Number(prod.stock_quantity || 0), Number(prod.stock || 0));
        const maxQty = effStock > 0 ? effStock : Infinity;

        let nextQty;
        if (options.preventDuplicate && currentQty > 0) {
          nextQty = Math.min(Math.max(currentQty, addQty), maxQty);
        } else if (options.setExact) {
          nextQty = Math.min(addQty, maxQty);
        } else {
          nextQty = Math.min(currentQty + addQty, maxQty);
        }
        updated[prod.id] = { product: prod, quantity: nextQty };
      });
      return updated;
    });

    // 2. Background sync
    const sid = sessionIdRef.current;
    const payload = items.map((it) => ({
      productId: (it.product || it).id,
      quantity: it.quantity || 1,
      notes: it.notes,
    }));
    cartAPI.syncCart(payload, sid).catch((err) => {
      console.warn("[CartContext] Failed to sync multiple items to backend:", err?.message);
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    // 1. Optimistic update
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });

    // 2. Background sync
    const sid = sessionIdRef.current;
    cartAPI.removeItem(productId, { params: { session_id: sid } }).catch((err) => {
      console.warn("[CartContext] Failed to sync removeItem to backend:", err?.message);
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    const qty = Number(quantity);
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    // 1. Optimistic update
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const effStock = Math.max(Number(existing.product?.stock_quantity || 0), Number(existing.product?.stock || 0));
      const maxQty = effStock > 0 ? effStock : Infinity;
      return {
        ...prev,
        [productId]: { ...existing, quantity: Math.min(qty, maxQty) },
      };
    });

    // 2. Background sync
    const sid = sessionIdRef.current;
    cartAPI.updateQuantity(productId, qty, { sessionId: sid }).catch((err) => {
      console.warn("[CartContext] Failed to sync updateQuantity to backend:", err?.message);
    });
  }, [removeFromCart]);

  const replaceCart = useCallback((items) => {
    if (!Array.isArray(items)) return;
    const newCart = {};
    items.forEach((item) => {
      const prod = item.product || item;
      const qty = item.quantity || 1;
      if (prod && prod.id) {
        newCart[prod.id] = { product: prod, quantity: qty };
      }
    });
    setCart(newCart);

    const sid = sessionIdRef.current;
    cartAPI.clearCart().then(() => {
      const payload = items.map((it) => ({
        productId: (it.product || it).id,
        quantity: it.quantity || 1,
      }));
      return cartAPI.syncCart(payload, sid);
    }).catch((err) => {
      console.warn("[CartContext] Failed to replace cart on backend:", err?.message);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
    setAppliedCoupon(null);
    cartAPI.clearCart().catch((err) => {
      console.warn("[CartContext] Failed to clear cart on backend:", err?.message);
    });
  }, []);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((a, item) => a + (Number(item.quantity) || 0), 0);
  const cartSubtotal = cartItems.reduce(
    (a, item) => a + getNairaPrice(item.product?.price || 0) * (Number(item.quantity) || 0),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        cartCount,
        cartSubtotal,
        loadingCart,
        refreshBackendCart,
        addToCart,
        addMultipleToCart,
        replaceCart,
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