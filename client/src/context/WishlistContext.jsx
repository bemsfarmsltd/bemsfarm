import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wishlistAPI } from "../services/api";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist from backend if logged in
  useEffect(() => {
    let mounted = true;
    if (user) {
      setLoading(true);
      wishlistAPI.getAll()
        .then((res) => {
          if (mounted) {
            const products = res.data?.products || [];
            setWishlistProducts(products);
            setWishlistIds(new Set(products.map((p) => String(p.id))));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch wishlist", err);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      // Clear wishlist when logged out
      setWishlistProducts([]);
      setWishlistIds(new Set());
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [user]);

  const toggleWishlist = useCallback(async (product) => {
    if (!user) return false;

    const productId = String(product.id);
    const isSaved = wishlistIds.has(productId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    setWishlistProducts((prev) => {
      if (isSaved) {
        return prev.filter((p) => String(p.id) !== productId);
      } else {
        return [product, ...prev];
      }
    });

    try {
      if (isSaved) {
        await wishlistAPI.remove(product.id);
      } else {
        await wishlistAPI.add(product.id);
      }
      return true;
    } catch (err) {
      console.error("Failed to toggle wishlist", err);
      // Revert on failure
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(productId);
        else next.delete(productId);
        return next;
      });
      setWishlistProducts((prev) => {
        if (isSaved) return [product, ...prev];
        return prev.filter((p) => String(p.id) !== productId);
      });
      return false;
    }
  }, [user, wishlistIds]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistProducts,
        loading,
        toggleWishlist,
        isSaved: (productId) => wishlistIds.has(String(productId))
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
