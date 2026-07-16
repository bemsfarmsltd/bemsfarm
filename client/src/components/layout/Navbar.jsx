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
import logo from "../../assets/bemsfarms_logo.png";
import api from "../../services/api";

const NAVBAR_CSS = `
.bf-navbar-links { display: none; }
.bf-navbar-burger { display: flex; }
.bf-navbar-user-name { display: none; }
.bf-navbar-logo { height: 32px; }
.bf-navbar-inner { padding: 0 14px; gap: 10px; height: 56px; }
.bf-search-full { display: none; }

@media (min-width: 640px) {
  .bf-navbar-logo { height: 36px; }
  .bf-navbar-inner { padding: 0 20px; height: 60px; }
}

@media (min-width: 768px) {
  .bf-navbar-links { display: flex; }
  .bf-navbar-burger { display: none; }
  .bf-navbar-user-name { display: block; }
  .bf-navbar-logo { height: 40px; }
  .bf-navbar-inner { padding: 0 32px; gap: 16px; height: 68px; }
  .bf-search-full { display: flex; }
}

@media (min-width: 1024px) {
  .bf-navbar-inner { padding: 0 40px; gap: 24px; height: 72px; }
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
            fontFamily: "Nunito, sans-serif",
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
              <div
                key={product.id}
                onClick={() => handleSelect(product)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
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
                    ₦{Number(product.price * 1500).toLocaleString()} ·{" "}
                    {product.category_name || product.category}
                  </div>
                </div>
              </div>
            ))}
            <div
              onClick={handleSubmit}
              style={{
                padding: "9px 10px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: "#1B4332",
                borderTop: "1px solid #F3F4F6",
                marginTop: 4,
                textAlign: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F0FFF4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              See all results for "{query}" →
            </div>
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
            fontFamily: "Nunito, sans-serif",
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
  const { cartItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    { label: "About", path: "/about" },
    { label: "AI Chef", path: "/chef-chat" }, // Routes to ChefBemsPage
  ];

  const ADMIN_PANEL_URL = import.meta.env.DEV
    ? "http://localhost:5174"
    : "https://bems-admin.vercel.app";

  const isAdmin = ["superadmin", "admin", "manager", "staff"].includes(user?.role);

  const DROPDOWN_ITEMS = [
    { icon: "👤", label: "My Profile", path: "/profile" },
    { icon: "📦", label: "My Orders", path: "/orders" },
    { icon: "↩️", label: "Returns", path: "/returns" },
    ...(isAdmin
      ? [
          { icon: "⚙️", label: "Admin Panel", path: ADMIN_PANEL_URL },
          { icon: "🔐", label: "Fraud Monitor", path: "/fraud-detection" },
          { icon: "📈", label: "Forecasting", path: "/demand-forecasting" },
          { icon: "👨‍🍳", label: "AI Chef", path: "/chef-chat" },
        ]
      : []),
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        backgroundColor: "white",
        borderBottom: scrolled ? "1px solid #E5E7EB" : "1px solid transparent",
        boxShadow: scrolled ? "0 2px 16px rgba(27,67,50,0.06)" : "none",
        transition: "box-shadow 0.3s, border-color 0.3s",
      }}
    >
      <style>{NAVBAR_CSS}</style>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div
        className="bf-navbar-inner"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        {/* LOGO */}
        <Link
          to={user ? "/home" : "/"}
          style={{
            textDecoration: "none",
            flexShrink: 0,
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

        {/* DESKTOP NAV LINKS */}
        {user && (
          <div
            className="bf-navbar-links"
            style={{ alignItems: "center", gap: "2px", flex: 1, minWidth: 0 }}
          >
            {NAV_LINKS.map(({ label, path }) => (
              <Link key={path} to={path} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: isActive(path) ? 700 : 500,
                    color: isActive(path) ? "#1B4332" : "#6B7280",
                    backgroundColor: isActive(path) ? "#F0FFF4" : "transparent",
                    fontFamily: "Nunito, sans-serif",
                    transition: "all 0.15s",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(path))
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(path))
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {label}
                </div>
              </Link>
            ))}
          </div>
        )}
        {!user && <div style={{ flex: 1 }} />}

        {/* RIGHT SIDE */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              <NavSearchBar />

              {/* Cart */}
              <button
                onClick={() => navigate("/cart")}
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
                <span style={{ fontSize: "19px" }}>🛒</span>
                {cartCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      backgroundColor: "#F59E0B",
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
                      background: "linear-gradient(135deg, #1B4332, #40916C)",
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
                        <div
                          key={item.path}
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
                            padding: "9px 12px",
                            borderRadius: "9px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#374151",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#F0FFF4")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                      ))}
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "#F3F4F6",
                          margin: "4px 0",
                        }}
                      />
                      <div
                        onClick={handleLogout}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "9px 12px",
                          borderRadius: "9px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#DC2626",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#FEF2F2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </div>
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
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? "✕" : "☰"}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: "6px" }}>
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
                  fontFamily: "Nunito, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </button>
              <button
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
                  fontFamily: "Nunito, sans-serif",
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
                      fontFamily: "Nunito, sans-serif",
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
