import { Link } from "react-router-dom";
import logo from "../../assets/bemsfarms_logo.png";

const FOOTER_CSS = `
.bf-footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
}
.bf-footer-bottom {
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

@media (min-width: 640px) {
  .bf-footer-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .bf-footer-grid { grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 48px; }
  .bf-footer-bottom { flex-direction: row; align-items: center; justify-content: space-between; }
}

.bf-footer-link {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.bf-footer-link:hover {
  color: #FCD34D;
  transform: translateX(2px);
}
`;

export default function Footer() {
  const year = new Date().getFullYear();

  const footerSections = [
    {
      heading: "Shop Produce",
      links: [
        { label: "All Farm Produce", path: "/products" },
        { label: "Grains & Cereals", path: "/products?category=Grains%20%26%20Cereals" },
        { label: "Tubers & Roots", path: "/products?category=Tubers%20%26%20Roots" },
        { label: "Cooking Oils", path: "/products?category=Cooking%20Oils" },
        { label: "Shopping Basket", path: "/cart" },
      ],
    },
    {
      heading: "Help & Delivery",
      links: [
        { label: "Track an Order", path: "/track-order" },
        { label: "Shipping & Delivery", path: "/shipping" },
        { label: "Returns & Refunds", path: "/returns-policy" },
        { label: "Contact Support", path: "/contact" },
        { label: "My Orders", path: "/orders" },
      ],
    },
    {
      heading: "Company & Policies",
      links: [
        { label: "About BemsFarms", path: "/about" },
        { label: "Chef Bems AI", path: "/chef-chat" },
        { label: "Terms of Service", path: "/terms" },
        { label: "Privacy Policy", path: "/privacy" },
        { label: "Customer Security", path: "/commerce-policy" },
      ],
    },
  ];

  return (
    <footer
      style={{
        backgroundColor: "#051810",
        color: "white",
        position: "relative",
        overflow: "hidden",
        borderTop: "1px solid rgba(52, 211, 153, 0.15)",
      }}
    >
      <style>{FOOTER_CSS}</style>

      {/* Subtle Ambient Background Light */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "5%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 64px) clamp(16px, 4vw, 32px) clamp(24px, 4vw, 36px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top Callout Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            padding: "clamp(24px, 3.5vw, 36px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "24px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ maxWidth: "620px" }}>
            <p
              style={{
                margin: "0 0 8px",
                color: "#FCD34D",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Direct From Farm To Table
            </p>
            <h2
              style={{
                margin: 0,
                color: "white",
                fontFamily: "var(--heading-font)",
                fontSize: "clamp(22px, 3.2vw, 32px)",
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              100% stone-free produce, fresh harvests & fast doorstep dispatch.
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link
              to="/products"
              style={{
                padding: "12px 24px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
                color: "#0B281E",
                fontSize: "13px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              Shop All Produce →
            </Link>
            <Link
              to="/chef-chat"
              style={{
                padding: "12px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                background: "rgba(255, 255, 255, 0.08)",
                color: "white",
                fontSize: "13px",
                fontWeight: 800,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              Meet Chef Bems
            </Link>
          </div>
        </div>

        {/* Main Footer Columns */}
        <div className="bf-footer-grid" style={{ marginTop: "48px", marginBottom: "48px" }}>
          {/* Brand & Mission Column */}
          <div>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "8px 16px",
                marginBottom: "18px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={logo}
                alt="BemsFarms"
                style={{ height: "32px", width: "auto", display: "block" }}
              />
            </div>

            <p
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "13.5px",
                lineHeight: 1.7,
                marginBottom: "20px",
                maxWidth: "340px",
              }}
            >
              Nigeria&apos;s smarter farm-fresh marketplace. Certified stone-free grains, pure unadulterated oils, and kitchen essentials delivered straight to your door.
            </p>

            {/* Clean Value Pills (No emojis) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "50px",
                  border: "1px solid rgba(52, 211, 153, 0.35)",
                  background: "rgba(52, 211, 153, 0.08)",
                  color: "#6EE7B7",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34D399" }} />
                Stone-Free Guarantee
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "50px",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  background: "rgba(245, 158, 11, 0.08)",
                  color: "#FCD34D",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                Chef Bems AI
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "50px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#E5E7EB",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9CA3AF" }} />
                Secure Checkout
              </span>
            </div>
          </div>

          {/* Links Columns */}
          {footerSections.map(({ heading, links }) => (
            <div key={heading}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#FCD34D",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  marginBottom: "16px",
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
                  gap: "12px",
                }}
              >
                {links.map(({ label, path }) => (
                  <li key={label}>
                    <Link to={path} className="bf-footer-link">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            marginBottom: "24px",
          }}
        />

        {/* Bottom Legal & Copyright Bar */}
        <div className="bf-footer-bottom" style={{ display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "13px",
                margin: 0,
                fontWeight: 500,
              }}
            >
              © {year} BemsFarms Limited. All rights reserved.
            </p>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.35)",
                fontSize: "11.5px",
                margin: 0,
              }}
            >
              Premium Nigerian Agricultural Produce & Culinary Intelligence.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <Link to="/about" className="bf-footer-link" style={{ fontSize: "12.5px" }}>
              About Us
            </Link>
            <Link to="/terms" className="bf-footer-link" style={{ fontSize: "12.5px" }}>
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="bf-footer-link" style={{ fontSize: "12.5px" }}>
              Privacy Policy
            </Link>
            <Link to="/contact" className="bf-footer-link" style={{ fontSize: "12.5px" }}>
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

