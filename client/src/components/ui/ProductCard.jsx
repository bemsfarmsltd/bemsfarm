import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../../context/CartContext";

/* ---------------- IMAGE HELPERS ---------------- */

function getDisplayImage(product) {
  if (product.image_url?.startsWith("data:")) return product.image_url;
  if (product.image_url?.startsWith("http")) return product.image_url;
  return getProductImage(product.name);
}

export function getProductImage(name) {
  const map = {
    "Ofada Rice":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
    "Long Grain Rice":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141706/long_grain_rice_yn01lt.jpg",
    "Palm Oil":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg",
    "Groundnut Oil":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141769/Groundnut-oil_mgv43t.jpg",
    "Black-eyed Beans":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142333/black-eyed-beans_i2n8fi.jpg",
    "Brown Beans":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141864/brown_beans_zxbjos.jpg",
    "Garri (White)":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142399/white_garri_zaq8i4.png",
    "Garri (Yellow)":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142425/yellow_garri_kxiyxr.png",
    "Fresh Tomatoes":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg",
    "Dried Crayfish":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141631/crayfish_bslwl4.jpg",
    Cocoyam:
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141939/cocoyam_wvtyqz.png",
    "Ugu Leaves":
      "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142531/ugu_zva1av.png",
  };

  return (
    map[name] ||
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80"
  );
}

export function getProductBg(name) {
  const map = {
    "Ofada Rice": "#FFF8E1",
    "Long Grain Rice": "#FFFDE7",
    "Palm Oil": "#FBE9E7",
    "Groundnut Oil": "#FFF3E0",
    "Black-eyed Beans": "#F3E5F5",
    "Brown Beans": "#EDE7F6",
    "Garri (White)": "#FAFAFA",
    "Garri (Yellow)": "#FFFDE7",
    "Fresh Tomatoes": "#FFEBEE",
    "Dried Crayfish": "#FBE9E7",
    Cocoyam: "#E8F5E9",
    "Ugu Leaves": "#E8F5E9",
  };

  return map[name] || "#F8F9FA";
}

export function getProductEmoji(name) {
  const map = {
    "Ofada Rice": "🌾",
    "Long Grain Rice": "🍚",
    "Palm Oil": "🛢️",
    "Groundnut Oil": "🥜",
    "Black-eyed Beans": "⚫",
    "Brown Beans": "🟤",
    "Garri (White)": "🍚",
    "Garri (Yellow)": "🟡",
    "Fresh Tomatoes": "🍅",
    "Dried Crayfish": "🦐",
    Cocoyam: "🍠",
    "Ugu Leaves": "🥬",
  };

  return map[name] || "🛒";
}

/* ---------------- COMPONENT ---------------- */
/*
  ── RESPONSIVE NOTES ─────────────────────────────────────────
  This card was already mostly intrinsic (percentage-based image
  via paddingTop, flexible width controlled by the parent grid),
  so it adapts to its grid cell automatically. Two real gaps fixed:

  1. Product name had `minHeight: 34` with no line-clamp — long
     names (e.g. "Sorghum (Guinea Corn)") could overflow the card
     instead of truncating cleanly. Now uses -webkit-line-clamp: 2
     with overflow hidden, consistent at every card width.

  2. Price + add-button row had no `minWidth: 0` / no flex-shrink
     guard, so at the narrowest grid column (2-col @ 320px) a long
     price like "₦52,500" could push the + button off-card. Fixed
     with min-width:0 + text-overflow ellipsis on price, flexShrink:0
     pinned on the button.
*/

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => navigate(`/product/${product.id}`)}
      style={{
        backgroundColor: "var(--white)",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
        border: "1px solid var(--gray-200)",
        position: "relative",
        minWidth: 0,
      }}
    >
      {/* FEATURED */}
      {product.is_featured && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "#F57C00",
            color: "white",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "6px",
            zIndex: 2,
          }}
        >
          ⭐ TOP
        </div>
      )}

      {/* STOCK BADGES */}
      {isOutOfStock && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
          }}
        >
          <span
            style={{
              backgroundColor: "#EF4444",
              color: "white",
              fontWeight: 800,
              fontSize: "12px",
              padding: "5px 14px",
              borderRadius: "50px",
            }}
          >
            Out of Stock
          </span>
        </div>
      )}

      {isLowStock && !isOutOfStock && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: "#F59E0B",
            color: "white",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: "50px",
            zIndex: 5,
          }}
        >
          ⚡ {product.stock} left
        </div>
      )}

      {/* IMAGE — intrinsic aspect ratio, scales with grid cell width */}
      <div
        style={{
          paddingTop: "75%",
          position: "relative",
          backgroundColor: "var(--gray-50)",
        }}
      >
        <motion.img
          src={getDisplayImage(product)}
          alt={product.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered && !isOutOfStock ? 1 : 0 }}
          onClick={handleAdd}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(46,125,50,0.92)",
            padding: "9px",
            textAlign: "center",
            cursor: "pointer",
            zIndex: 3,
          }}
        >
          <span style={{ color: "white", fontWeight: 700, fontSize: "12px" }}>
            {added ? "✓ Added!" : "🛒 Add to Cart"}
          </span>
        </motion.div>
      </div>

      {/* INFO */}
      <div style={{ padding: "12px", minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "var(--gray-500)", marginBottom: 2 }}>
          {product.category_name}
        </p>

        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gray-900)",
            margin: "0 0 4px",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "35px",
          }}
        >
          {product.name}
        </h3>

        <p style={{ fontSize: 11, color: "var(--gray-500)", marginBottom: 8 }}>
          {product.unit}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--primary)",
              margin: 0,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            ₦{(product.price * 1500).toLocaleString()}
          </p>

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleAdd}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              backgroundColor: added ? "#2E7D32" : "#F57C00",
              color: "white",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {added ? "✓" : "+"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
