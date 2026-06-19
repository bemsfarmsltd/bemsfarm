import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import logo from "../../assets/bemsfarms_logo.png";

/*
  RESPONSIVE STRATEGY — pure CSS, no JS breakpoint guessing.
  A single `isMobile` boolean (the old approach) cannot serve every device
  in the target list (320px folded Z Fold up to 1728px MacBook Pro 16"),
  so we use CSS media queries via a <style> tag injected once. This means
  layout changes happen instantly on resize/rotate/fold with zero re-render
  cost and zero hydration mismatch risk.

  Breakpoints chosen from real device widths:
    <= 480px   : smallest phones (SE, Galaxy S8+, folded Z Fold)
    481-767px  : standard phones (most iPhones, Pixel, S20 Ultra)
    768-1023px : tablets (iPad Mini/Air, Surface Duo unfolded, Galaxy Tab S4)
    >= 1024px  : laptops/desktops (iPad Pro landscape, MacBook, Surface Pro)
*/

const NAVBAR_CSS = `
.bf-navbar-links { display: none; }
.bf-navbar-burger { display: flex; }
.bf-navbar-user-name { display: none; }
.bf-navbar-logo { height: 32px; }
.bf-navbar-inner { padding: 0 14px; gap: 10px; height: 56px; }

@media (min-width: 640px) {
  .bf-navbar-logo { height: 36px; }
  .bf-navbar-inner { padding: 0 20px; height: 60px; }
}

@media (min-width: 768px) {
  .bf-navbar-links { display: flex; }
  .bf-navbar-burger { display: none; }
  .bf-navbar-user-name { display: block; }
  .bf-navbar-logo { height: 40px; }
  .bf-navbar-inner { padding: 0 32px; gap: 24px; height: 68px; }
}

@media (min-width: 1024px) {
  .bf-navbar-inner { padding: 0 40px; gap: 32px; height: 72px; }
}
`;

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile nav on route change
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
    { label: "Deals", path: "/deals" },
    { label: "About", path: "/about" },
  ];

  const DROPDOWN_ITEMS = [
    { icon: "👤", label: "My Profile", path: "/profile" },
    { icon: "📦", label: "My Orders", path: "/orders" },
    { icon: "↩️", label: "Returns", path: "/returns" },
    { icon: "🔍", label: "Smart Search", path: "/semantic-search" },
    ...(user?.role === "admin"
      ? [
          { icon: "⚙️", label: "Admin Panel", path: "/admin" },
          { icon: "🔐", label: "Fraud Monitor", path: "/fraud-detection" },
          { icon: "📈", label: "Forecasting", path: "/demand-forecasting" },
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
        {/* ── LOGO ─────────────────────────────────────── */}
        <Link
          to={user ? "/home" : "/"}
          style={{
            textDecoration: "none",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            minWidth: 0,
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

        {/* ── DESKTOP NAV LINKS (>=768px only) ──────────── */}
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
        {!user && <div style={{ flex: 1, minWidth: "8px" }} />}

        {/* ── RIGHT SIDE ───────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
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

              {/* Avatar dropdown — visible at all sizes */}
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
                        width: "min(210px, 90vw)",
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
                            navigate(item.path);
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

              {/* Hamburger — mobile/tablet only (<768px) */}
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

      {/* ── MOBILE NAV DRAWER (<768px, logged in only) ──── */}
      <AnimatePresence>
        {user && mobileNavOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", borderTop: "1px solid #F3F4F6" }}
            className="bf-navbar-burger-panel"
          >
            <div
              style={{
                padding: "10px 14px 16px",
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
