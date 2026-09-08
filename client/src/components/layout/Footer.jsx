import { Link } from "react-router-dom";
import logo from "../../assets/bemsfarms_logo.png";

const FOOTER_CSS = `
.bf-footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
.bf-footer-bottom {
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.bf-footer-bottom-links { gap: 16px; }

@media (min-width: 560px) {
  .bf-footer-grid { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 860px) {
  .bf-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
  .bf-footer-bottom { flex-direction: row; align-items: center; justify-content: space-between; }
}
`;

export default function Footer() {
  const year = new Date().getFullYear();

  const cols = [
    {
      heading: "Shop",
      links: [
        { label: "All Products", path: "/products" },
        { label: "Track an Order", path: "/track-order" },
        { label: "Chef Bems AI", path: "/chef-chat" },
        { label: "My Cart", path: "/cart" },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "My Profile", path: "/profile" },
        { label: "My Orders", path: "/orders" },
        { label: "Returns", path: "/returns" },
        { label: "Cart", path: "/cart" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About Us", path: "/about" },
        { label: "Contact", path: "/contact" },
      ],
    },
  ];

  return (
    <footer style={{ backgroundColor: "#0B281E", color: "white", position: "relative", overflow: "hidden" }}>
      <style>{FOOTER_CSS}</style>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding:
            "clamp(36px, 6vw, 56px) clamp(16px, 4vw, 24px) clamp(24px, 4vw, 36px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            padding: "clamp(24px, 4vw, 38px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 28,
            background: "rgba(255,255,255,0.055)",
          }}
        >
          <div style={{ maxWidth: 650 }}>
            <p style={{ margin: "0 0 8px", color: "#FCD34D", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Fresh ideas meet fresh food</p>
            <h2 style={{ margin: 0, color: "white", fontFamily: "var(--heading-font)", fontSize: "clamp(24px, 4vw, 36px)", lineHeight: 1.2 }}>Find the ingredients. Make something memorable.</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link to="/products" style={{ padding: "12px 22px", borderRadius: 999, background: "#FCD34D", color: "#123A2B", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Shop products</Link>
            <Link to="/register" style={{ padding: "12px 22px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", color: "white", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Meet Chef Bems</Link>
          </div>
        </div>

        <div className="bf-footer-grid" style={{ marginTop: "44px", marginBottom: "44px" }}>
          {/* Brand col */}
          <div>
            {/* Logo is now a real transparent PNG — sits cleanly on the
                white pill without any cream-box artifact behind it. */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "white",
                borderRadius: "10px",
                padding: "8px 14px",
                marginBottom: "16px",
              }}
            >
              <img
                src={logo}
                alt="BemsFarms"
                style={{ height: "30px", width: "auto", display: "block" }}
              />
            </div>

            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "13px",
                lineHeight: 1.7,
                marginBottom: "20px",
                maxWidth: "280px",
              }}
            >
              Nigeria's smartest farm-fresh marketplace. From seed to table,
              powered by AI.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["🌱 Fresh selection", "👨‍🍳 Chef Bems", "🛡️ Secure"].map((b, i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "50px",
                    border: "1px solid rgba(64,145,108,0.4)",
                    color: "#6EE7B7",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  marginBottom: "14px",
                }}
              >
                {heading}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      to={path}
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        textDecoration: "none",
                        fontSize: "14px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                      }
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255,255,255,0.07)",
            marginBottom: "24px",
          }}
        />

        <div className="bf-footer-bottom" style={{ display: "flex" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "13px",
              margin: 0,
            }}
          >
            © {year} BemsFarms · Premium Farm Produce 🇳🇬
          </p>
          <div
            className="bf-footer-bottom-links"
            style={{ display: "flex", flexWrap: "wrap" }}
          >
            {["Support"].map((item) => (
              <Link
                key={item}
                to="/contact"
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "13px",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.35)")
                }
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
