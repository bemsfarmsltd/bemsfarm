import { Link } from "react-router-dom";
import logo from "../../assets/bemsfarms_logo.png";

const FOOTER_CSS = `
.bf-footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
.bf-footer-links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px 16px;
}
.bf-footer-callout {
  padding: 20px 18px;
  border-radius: 20px;
}
.bf-footer-brand-desc {
  display: block;
}
.bf-footer-bottom {
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

@media (min-width: 640px) {
  .bf-footer-callout {
    padding: 28px 24px;
  }
  .bf-footer-links-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1024px) {
  .bf-footer-grid {
    grid-template-columns: 1.1fr 2.9fr;
    gap: 48px;
    align-items: start;
  }
  .bf-footer-callout {
    padding: 32px 36px;
  }
  .bf-footer-links-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 36px;
  }
  .bf-footer-bottom {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.bf-footer-link {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1.35;
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
        { label: "Shipping & Rates", path: "/shipping" },
        { label: "Returns Policy", path: "/returns-policy" },
        { label: "Contact Support", path: "/contact" },
        { label: "My Orders", path: "/orders" },
      ],
    },
    {
      heading: "Company & Trust",
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
          padding: "clamp(28px, 4vw, 56px) clamp(16px, 3.5vw, 32px) clamp(20px, 3vw, 32px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top Callout Banner */}
        <div
          className="bf-footer-callout"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "18px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <p
              style={{
                margin: "0 0 6px",
                color: "#FCD34D",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.16em",
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
                fontSize: "clamp(18px, 2.8vw, 28px)",
                fontWeight: 800,
                lineHeight: 1.3,
              }}
            >
              100% stone-free produce, fresh harvests & fast doorstep dispatch.
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <Link
              to="/products"
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
                color: "#0B281E",
                fontSize: "12.5px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              Shop All Produce
            </Link>
            <Link
              to="/chef-chat"
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                background: "rgba(255, 255, 255, 0.08)",
                color: "white",
                fontSize: "12.5px",
                fontWeight: 800,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              Meet Chef Bems
            </Link>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="bf-footer-grid" style={{ marginTop: "36px", marginBottom: "36px" }}>
          {/* Brand & Mission Column */}
          <div>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "white",
                borderRadius: "10px",
                padding: "6px 14px",
                marginBottom: "14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={logo}
                alt="BemsFarms"
                style={{ height: "28px", width: "auto", display: "block" }}
              />
            </div>

            <p
              className="bf-footer-brand-desc"
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "13px",
                lineHeight: 1.6,
                marginBottom: "16px",
                maxWidth: "320px",
              }}
            >
              Nigeria&apos;s smarter farm-fresh marketplace. Certified stone-free grains, pure oils, and kitchen essentials delivered straight to your door.
            </p>

            {/* Clean Value Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "50px",
                  border: "1px solid rgba(52, 211, 153, 0.35)",
                  background: "rgba(52, 211, 153, 0.08)",
                  color: "#6EE7B7",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#34D399" }} />
                Stone-Free Guarantee
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "50px",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  background: "rgba(245, 158, 11, 0.08)",
                  color: "#FCD34D",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                Chef Bems AI
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "50px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#E5E7EB",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#9CA3AF" }} />
                Secure Checkout
              </span>
            </div>
          </div>

          {/* Links Columns (Responsive Grid: 2-columns on mobile, 3-columns on tablet/desktop) */}
          <div className="bf-footer-links-grid">
            {footerSections.map(({ heading, links }) => (
              <div key={heading}>
                <p
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    color: "#FCD34D",
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    marginBottom: "12px",
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
                    gap: "8px",
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
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            marginBottom: "20px",
          }}
        />

        {/* Bottom Legal & Copyright Bar */}
        <div className="bf-footer-bottom" style={{ display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "12.5px",
                margin: 0,
                fontWeight: 500,
              }}
            >
              © {year} BemsFarms Limited. All rights reserved.
            </p>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.35)",
                fontSize: "11px",
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
              gap: "16px",
              alignItems: "center",
            }}
          >
            <Link to="/about" className="bf-footer-link" style={{ fontSize: "12px" }}>
              About Us
            </Link>
            <Link to="/terms" className="bf-footer-link" style={{ fontSize: "12px" }}>
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="bf-footer-link" style={{ fontSize: "12px" }}>
              Privacy Policy
            </Link>
            <Link to="/contact" className="bf-footer-link" style={{ fontSize: "12px" }}>
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

