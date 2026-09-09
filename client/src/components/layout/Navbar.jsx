// client/src/components/layout/Navbar.jsx
// FIXES applied to co-worker's version:
//  1. /admin/issues removed from DROPDOWN_ITEMS (route doesn't exist yet)
//  2. /chef-chat confirmed as the canonical route (matches App.jsx)
//  3. Everything else is your co-worker's version, untouched

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/bemsfarms_logo.png";
import api from "../../services/api";
import { NAIRA_PER_UNIT } from "../../utils/currency";
import { STAFF_ROLES } from "../ProtectedRoute";

const NAVBAR_CSS = `
.bf-navbar-links { display: none !important; }
.bf-navbar-burger { display: flex; }
.bf-navbar-user-name { display: none; }
.bf-navbar-logo { height: 32px; }
.bf-navbar-inner { padding: 0 16px; height: 56px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; }
.bf-search-full { display: none; }
.bf-navbar-guest-join { display: none; }

@media (min-width: 640px) {
  .bf-navbar-logo { height: 36px; }
  .bf-navbar-inner { padding: 0 24px; height: 60px; }
  .bf-navbar-guest-join { display: block; }
}

@media (min-width: 768px) {
  .bf-navbar-links { display: flex !important; }
  .bf-navbar-burger { display: none; }
  .bf-navbar-user-name { display: block; }
  .bf-navbar-logo { height: 40px; }
  .bf-navbar-inner { padding: 0 32px; height: 68px; }
  .bf-search-full { display: flex; }
}

@media (min-width: 1024px) {
  .bf-navbar-inner { padding: 0 40px; height: 72px; }
}
`;

// ─── Inline Smart Search Bar ──────────────────────────────────────────────────
function NavSearchBar() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false);
        if (!query) setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setShowDrop(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // Uses the new /api/products/search endpoint
        const res = await api.get(
          `/products/search?q=${encodeURIComponent(val)}&limit=6`,
        );
        const items = res.data?.products || res.data || [];
        setResults(items);
        setShowDrop(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setShowDrop(false);
    setExpanded(false);
    setQuery("");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (product) => {
    setShowDrop(false);
    setExpanded(false);
    setQuery("");
    navigate(`/product/${product.id}`);
  };

  return (
    <div
      ref={wrapRef}
      className="bf-search-full"
      style={{ position: "relative", alignItems: "center" }}
    >
      <motion.div
        animate={{ width: expanded ? 280 : 38 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          display: "flex",
          alignItems: "center",
          background: expanded ? "#fff" : "#F3F4F6",
          border: expanded ? "2px solid #1B4332" : "2px solid transparent",
          borderRadius: 50,
          overflow: "hidden",
          height: 38,
          boxShadow: expanded ? "0 4px 20px rgba(27,67,50,0.12)" : "none",
        }}
      >
        <button
          onClick={() => {
            setExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 10px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            color: "#6B7280",
          }}
          aria-label="Search products"
        >
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                border: "2px solid #D1D5DB",
                borderTopColor: "#1B4332",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : (
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          onFocus={() => {
            setExpanded(true);
            if (results.length) setShowDrop(true);
          }}
          placeholder="Search rice, palm oil, beans..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 13,
            background: "transparent",
            color: "#111827",
            fontFamily: "var(--body-font)",
            opacity: expanded ? 1 : 0,
            padding: "0 10px 0 0",
            minWidth: 0,
          }}
        />

        {expanded && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowDrop(false);
              inputRef.current?.focus();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 10px 0 0",
              color: "#9CA3AF",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showDrop && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 300,
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 14,
              padding: "6px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
              zIndex: 400,
            }}
          >
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 10px",
                  border: "none",
                  background: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--body-font)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#F0FFF4")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {product.image_url && (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                    ₦{Number(product.price * NAIRA_PER_UNIT).toLocaleString()} ·{" "}
                    {product.category_name || product.category}
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                display: "block",
                width: "100%",
                padding: "9px 10px",
                border: "none",
                background: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: "#1B4332",
                borderTop: "1px solid #F3F4F6",
                marginTop: 4,
                textAlign: "center",
                fontFamily: "var(--body-font)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F0FFF4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              See all results for "{query}" →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Search Bar ────────────────────────────────────────────────────────
function MobileSearchBar({ onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!query.trim()) return;
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  return (
    <div style={{ padding: "10px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "#F3F4F6",
          borderRadius: 12,
          padding: "0 12px",
          border: "2px solid #E5E7EB",
        }}
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Search products..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "11px 10px",
            fontSize: 14,
            fontFamily: "var(--body-font)",
            color: "#111827",
          }}
        />
        {query && (
          <button
            onClick={handleSubmit}
            style={{
              background: "#1B4332",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cartItems, openCartDrawer } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const dropdownRef = useRef(null);

  const cartCount = cartItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const isActive = (p) => location.pathname === p;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Account dropdown items were plain <div onClick> — unreachable by keyboard.
  // Escape closes the menu and returns focus to the trigger button.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        dropdownRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileNavOpen(false);
    navigate("/login");
  };

  const NAV_LINKS = [
    { label: "Home", path: "/home" },
    { label: "Shop", path: "/products" },
    { label: "Delivery", path: "/delivery" },
    { label: "Chef Bems", path: "/chef-chat" },
    { label: "My Orders", path: "/orders" },
  ];

  const ADMIN_PANEL_URL = import.meta.env.DEV
    ? "http://localhost:5174"
    : "https://bems-admin.vercel.app";

  const isAdmin = ["superadmin", "admin", "manager", "staff"].includes(user?.role);
  // Fraud Monitor / Forecasting are behind a stricter role gate (see
  // STAFF_ROLES in ProtectedRoute.jsx, which does NOT include "admin") —
  // only show these links to roles that can actually open the page, or an
  // "admin" user gets a dead-looking link that silently bounces them home.
  const canAccessStaffTools = STAFF_ROLES.includes(user?.role);

  const DROPDOWN_ITEMS = [
    { label: "My Profile", path: "/profile" },
    { label: "My Orders", path: "/orders" },
    { label: "Returns", path: "/returns" },
    ...(isAdmin
      ? [
          { label: "Admin Panel", path: ADMIN_PANEL_URL },
          ...(canAccessStaffTools
            ? [
                { label: "Fraud Monitor", path: "/fraud-detection" },
                { label: "Forecasting", path: "/demand-forecasting" },
              ]
            : []),
          { label: "AI Chef", path: "/chef-chat" },
        ]
      : []),
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        backgroundColor: "var(--white)",
        borderBottom: scrolled ? "1px solid var(--gray-200)" : "1px solid transparent",
        boxShadow: scrolled ? (theme === "dark" ? "0 2px 16px rgba(0,0,0,0.3)" : "0 2px 16px rgba(27,67,50,0.06)") : "none",
        transition: "box-shadow 0.3s, border-color 0.3s, background-color 0.3s",
      }}
    >
      <style>{NAVBAR_CSS}</style>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div
        className="bf-navbar-inner"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        {/* LOGO (Left Aligned) */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            marginRight: "16px",
          }}
        >
          <Link
            to={user ? "/home" : "/"}
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={logo}
              alt="BemsFarms"
              className="bf-navbar-logo"
              style={{
                width: "auto",
                objectFit: "contain",
                display: "block",
                maxWidth: "140px",
              }}
            />
          </Link>
        </div>

        {/* DESKTOP NAV LINKS (Sliding Animated Navigation Segment) */}
        {user && (
          <div
            className="bf-navbar-links"
            onMouseLeave={() => setHoveredNav(null)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              margin: "0 auto",
              flexShrink: 0,
              position: "relative",
              padding: "4px",
              background: "#F4F6F4",
              borderRadius: "14px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            {NAV_LINKS.map(({ label, path }) => {
              const active = isActive(path);
              const isHovered = hoveredNav === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onMouseEnter={() => setHoveredNav(path)}
                  style={{
                    textDecoration: "none",
                    position: "relative",
                    borderRadius: "10px",
                    outline: "none",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      padding: "7px 16px",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: active ? 700 : 500,
                      color: active ? "#1B5E20" : isHovered ? "#111827" : "#4B5563",
                      fontFamily: "var(--body-font)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      zIndex: 2,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {label}
                  </div>

                  {/* Active Sliding Indicator Pill */}
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "#ffffff",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(27, 94, 32, 0.06)",
                        border: "1px solid rgba(46, 125, 50, 0.12)",
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Hover Sliding Pill (when not active) */}
                  {!active && isHovered && (
                    <motion.div
                      layoutId="hoverNavIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 34,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(255, 255, 255, 0.65)",
                        borderRadius: "10px",
                        zIndex: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* RIGHT SIDE ACTIONS (Right Aligned) */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          {user ? (
            <>
              <NavSearchBar />

              {/* Cart */}
              <button
                onClick={openCartDrawer}
                aria-label={cartCount > 0 ? `View cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "View cart"}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px",
                  borderRadius: "10px",
                  lineHeight: 1,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  stroke="#1B4332"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ display: "block" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {cartCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      backgroundColor: "#F57C00",
                      color: "white",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      fontSize: "9px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>

              {/* Avatar dropdown */}
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px 4px 4px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "50px",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2E7D32, #4CAF50)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span
                    className="bf-navbar-user-name"
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#374151",
                      maxWidth: "80px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.name?.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: "9px", color: "#9CA3AF" }}>▼</span>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.13 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "14px",
                        padding: "6px",
                        width: "min(220px, 90vw)",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.10)",
                        zIndex: 300,
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 12px",
                          marginBottom: "2px",
                          borderBottom: "1px solid #F3F4F6",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#111827",
                            margin: 0,
                          }}
                        >
                          {user?.name}
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9CA3AF",
                            margin: "2px 0 0",
                          }}
                        >
                          {user?.email}
                        </p>
                      </div>
                      {DROPDOWN_ITEMS.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            if (item.path.startsWith("http")) {
                              window.location.href = item.path;
                            } else {
                              navigate(item.path);
                            }
                            setMenuOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            padding: "9px 12px",
                            border: "none",
                            background: "none",
                            borderRadius: "9px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#374151",
                            fontFamily: "var(--body-font)",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#F0FFF4")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "#F3F4F6",
                          margin: "4px 0",
                        }}
                      />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          padding: "9px 12px",
                          border: "none",
                          background: "none",
                          borderRadius: "9px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#DC2626",
                          fontFamily: "var(--body-font)",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#FEF2F2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hamburger — mobile only */}
              <button
                className="bf-navbar-burger"
                onClick={() => setMobileNavOpen((o) => !o)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1B4332",
                }}
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                )}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={openCartDrawer}
                aria-label={cartCount > 0 ? `View cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "View cart"}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px",
                  borderRadius: "10px",
                  lineHeight: 1,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="#1B4332"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ display: "block" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {cartCount > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, display: "grid", placeItems: "center", minWidth: 16, height: 16, padding: "0 3px", borderRadius: 999, backgroundColor: "#F57C00", color: "white", fontSize: 9, fontWeight: 800 }}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "8px 14px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "10px",
                  color: "#374151",
                  background: "white",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "var(--body-font)",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </button>
              <button
                className="bf-navbar-guest-join"
                onClick={() => navigate("/register")}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  background: "#1B4332",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "var(--body-font)",
                  whiteSpace: "nowrap",
                }}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {user && mobileNavOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", borderTop: "1px solid #F3F4F6" }}
          >
            <MobileSearchBar onClose={() => setMobileNavOpen(false)} />
            <div
              style={{
                padding: "4px 14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {NAV_LINKS.map(({ label, path }) => (
                <Link key={path} to={path} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: isActive(path) ? 700 : 500,
                      color: isActive(path) ? "#1B4332" : "#374151",
                      backgroundColor: isActive(path)
                        ? "#F0FFF4"
                        : "transparent",
                      fontFamily: "var(--body-font)",
                    }}
                  >
                    {label}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
