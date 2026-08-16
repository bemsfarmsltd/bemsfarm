import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";

/*
  CONSISTENCY FIXES vs previous version:
  - fontFamily changed from "Inter" to "var(--heading-font)" / "var(--body-font)"
    to match the rest of the app (Navbar, HomePage, ProductsPage etc.)
  - /shop links changed to /products
  - /ai-recommendations changed to /recommendations
  - Fabricated stats ("7 Customers, 2 Orders" exposed as tiny numbers) replaced
    with honest value-prop statements
  - "Join thousands of Nigerians" softened to match landing page's honest framing
  - "Nigeria's premier" (unverifiable superlative) removed from hero
  - Motion animations added for consistency with rest of app
*/

const TEAM = [
  {
    name: "Obisesan Esther",
    role: "Founder & CEO",
    img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80",
    bio: "Passionate about making fresh Nigerian food accessible to everyone.",
  },
  {
    name: "Farm Operations",
    role: "Head of Supply Chain",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Ensuring every product is sourced fresh from trusted Nigerian farms.",
  },
  {
    name: "Tech & Product",
    role: "Lead Developer",
    img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80",
    bio: "Building the AI systems that power your personalized food experience.",
  },
];

const VALUES = [
  {
    img: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=120&q=80",
    title: "Freshness First",
    desc: "Every product is sourced fresh. No cold storage, no shortcuts.",
    color: "#69F0AE",
  },
  {
    img: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=120&q=80",
    title: "Fair to Everyone",
    desc: "We pay farmers fair prices and pass savings directly to you. No middlemen.",
    color: "#FFD740",
  },
  {
    img: "https://images.unsplash.com/photo-1620912189865-1e8a33da5571?w=120&q=80",
    title: "Powered by AI",
    desc: "Our Gemini AI learns your dietary needs and recommends exactly what your body needs.",
    color: "#CE93D8",
  },
  {
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=120&q=80",
    title: "Secure & Trusted",
    desc: "Every payment is protected by Monnify. Your data is encrypted and never shared.",
    color: "#64B5F6",
  },
];

const MILESTONES = [
  {
    year: "2024",
    event: "BemsFarms founded",
    desc: "Started with 10 farm-fresh products and a vision to feed Nigeria better.",
  },
  {
    year: "2025",
    event: "AI Integration",
    desc: "Launched AI-powered recommendations using Google Gemini.",
  },
  {
    year: "2026",
    event: "Growing catalogue",
    desc: "Expanded to 40+ farm products across 8 categories with more on the way.",
  },
];

const VALUE_PROPS = [
  { icon: "🌾", label: "Farm-direct sourcing" },
  { icon: "💵", label: "Honest, fair pricing" },
  { icon: "🤖", label: "AI-powered experience" },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <div style={{ fontFamily: "var(--body-font)", overflowX: "hidden" }}>
        {/* ── HERO ── */}
        <section
          style={{
            position: "relative",
            background:
              "linear-gradient(160deg,#0A2E0A 0%,#1B5E20 50%,#2E7D32 100%)",
            minHeight: "420px",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            padding: "80px 5%",
          }}
        >
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img
              src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=85"
              alt="Nigerian farm produce"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.15,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 70% 50%, rgba(134,196,100,0.1) 0%, transparent 60%)",
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{ position: "relative", zIndex: 1, maxWidth: 640 }}
          >
            <div
              style={{
                display: "inline-block",
                background: "rgba(105,240,174,0.15)",
                border: "1px solid rgba(105,240,174,0.35)",
                borderRadius: 20,
                padding: "4px 16px",
                fontSize: 11,
                letterSpacing: 3,
                color: "#A5D6A7",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              About Us
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: "clamp(2rem,5vw,3.2rem)",
                fontWeight: 900,
                margin: "0 0 20px",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontFamily: "var(--heading-font)",
              }}
            >
              Our Story
            </h1>
            <p
              style={{
                color: "#C8E6C9",
                fontSize: "clamp(1rem,2vw,1.15rem)",
                lineHeight: 1.7,
                margin: "0 0 32px",
                maxWidth: 520,
              }}
            >
              Founded in 2024, BemsFarms connects Nigerian families directly
              with trusted local farmers — making fresh, quality food simpler to
              find and fairer to buy.
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {VALUE_PROPS.map((v) => (
                <div
                  key={v.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "50px",
                    padding: "7px 14px",
                  }}
                >
                  <span style={{ fontSize: "22" }}>{v.icon}</span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.88)",
                      fontWeight: 600,
                    }}
                  >
                    {v.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── MISSION ── */}
        <section
          style={{
            padding: "80px 5%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 60,
            alignItems: "center",
            background: "#fff",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#F57F17",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Our Mission
            </div>
            <h2
              style={{
                fontSize: "clamp(1.6rem,3vw,2.4rem)",
                fontWeight: 900,
                color: "#0D1117",
                margin: "0 0 20px",
                lineHeight: 1.2,
                fontFamily: "var(--heading-font)",
              }}
            >
              Connecting Farms to Your Dinner Table
            </h2>
            <p
              style={{
                color: "#4B5563",
                fontSize: 16,
                lineHeight: 1.8,
                margin: "0 0 20px",
              }}
            >
              BemsFarms was founded with a simple mission: make fresh, quality
              Nigerian food accessible to everyone. We partner directly with
              farms across Nigeria to bring you the freshest rice, palm oil,
              garri, beans, and more at fair prices.
            </p>
            <p
              style={{
                color: "#4B5563",
                fontSize: 16,
                lineHeight: 1.8,
                margin: "0 0 32px",
              }}
            >
              We believe every Nigerian deserves access to quality farm produce
              without the hassle of going to the market.
            </p>

            {/* Honest value props instead of fabricated metrics */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { icon: "🌾", label: "40+ Products" },
                { icon: "🤖", label: "AI-Powered" },
                { icon: "🇳🇬", label: "100% Nigerian" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: "#2E7D32",
                      fontFamily: "var(--heading-font)",
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#4B5563", fontWeight: 700 }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=85"
              alt="Fresh Nigerian vegetables"
              style={{
                width: "100%",
                aspectRatio: "4/3",
                objectFit: "cover",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 24,
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                borderRadius: 16,
                padding: "14px 20px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=40&q=80"
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#0D1117",
                    fontFamily: "var(--heading-font)",
                  }}
                >
                  Farm Fresh Guaranteed
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Direct from trusted Nigerian farms
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── VALUES ── */}
        <section
          style={{
            padding: "72px 5%",
            background: "linear-gradient(135deg,#0A2E0A 0%,#1B5E20 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(134,196,100,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,127,23,0.06) 0%, transparent 50%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#A5D6A7",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Why Choose BemsFarms
              </div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "clamp(1.5rem,3vw,2.2rem)",
                  fontWeight: 800,
                  margin: 0,
                  fontFamily: "var(--heading-font)",
                }}
              >
                Our Core Values
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {VALUES.map((v, i) => (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    padding: 28,
                    transition: "transform 0.3s, background 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      overflow: "hidden",
                      marginBottom: 20,
                      border: `2px solid ${v.color}30`,
                      boxShadow: `0 4px 20px ${v.color}25`,
                    }}
                  >
                    <img
                      src={v.img}
                      alt={v.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <h3
                    style={{
                      color: v.color,
                      fontSize: 16,
                      fontWeight: 800,
                      margin: "0 0 10px",
                      fontFamily: "var(--heading-font)",
                    }}
                  >
                    {v.title}
                  </h3>
                  <p
                    style={{
                      color: "#C8E6C9",
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.7,
                    }}
                  >
                    {v.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEAM ── */}
        <section style={{ padding: "72px 5%", background: "#F8FAFC" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#F57F17",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Our Team
            </div>
            <h2
              style={{
                fontSize: "clamp(1.5rem,3vw,2.2rem)",
                fontWeight: 800,
                color: "#0D1117",
                margin: 0,
                fontFamily: "var(--heading-font)",
              }}
            >
              The People Behind BemsFarms
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  transition: "transform 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 40px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(0,0,0,0.06)";
                }}
              >
                <div style={{ width: "100%", height: 200, overflow: "hidden" }}>
                  <img
                    src={member.img}
                    alt={member.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div
                    style={{
                      display: "inline-block",
                      background: "#F0FDF4",
                      color: "#166534",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      marginBottom: 10,
                    }}
                  >
                    {member.role}
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#0D1117",
                      margin: "0 0 8px",
                      fontFamily: "var(--heading-font)",
                    }}
                  >
                    {member.name}
                  </h3>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {member.bio}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── TIMELINE ── */}
        <section style={{ padding: "72px 5%", background: "#fff" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#2E7D32",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Our Journey
            </div>
            <h2
              style={{
                fontSize: "clamp(1.5rem,3vw,2.2rem)",
                fontWeight: 800,
                color: "#0D1117",
                margin: 0,
                fontFamily: "var(--heading-font)",
              }}
            >
              From Vision to Reality
            </h2>
          </div>
          <div
            style={{ maxWidth: 700, margin: "0 auto", position: "relative" }}
          >
            <div
              style={{
                position: "absolute",
                left: 28,
                top: 0,
                bottom: 0,
                width: 2,
                background: "linear-gradient(to bottom,#2E7D32,#F57F17)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {MILESTONES.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{ display: "flex", gap: 28, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background:
                        i === MILESTONES.length - 1
                          ? "linear-gradient(135deg,#F57F17,#FF8F00)"
                          : "linear-gradient(135deg,#2E7D32,#388E3C)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 13,
                      flexShrink: 0,
                      zIndex: 1,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      fontFamily: "var(--heading-font)",
                    }}
                  >
                    {m.year}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: "#F8FAFC",
                      borderRadius: 16,
                      padding: "20px 24px",
                      border: "1px solid #E5E7EB",
                      marginTop: 8,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0D1117",
                        margin: "0 0 6px",
                        fontFamily: "var(--heading-font)",
                      }}
                    >
                      {m.event}
                    </h3>
                    <p
                      style={{
                        color: "#6B7280",
                        fontSize: 14,
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {m.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          style={{
            padding: "64px 5%",
            background: "linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <h2
              style={{
                color: "#fff",
                fontSize: "clamp(1.5rem,3vw,2.2rem)",
                fontWeight: 900,
                margin: "0 0 16px",
                fontFamily: "var(--heading-font)",
              }}
            >
              Ready to Eat Fresh?
            </h2>
            <p
              style={{
                color: "#C8E6C9",
                fontSize: 16,
                margin: "0 0 32px",
                maxWidth: 440,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.7,
              }}
            >
              Join Nigerian families getting farm-fresh food delivered right to
              their door.
            </p>
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {/* FIX: was /shop, now /products */}
              <Link
                to="/products"
                style={{
                  background: "#F57F17",
                  color: "#fff",
                  padding: "14px 32px",
                  borderRadius: 50,
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(245,127,23,0.4)",
                }}
              >
                Shop Now →
              </Link>
              {/* FIX: was /ai-recommendations, now /recommendations */}
              <Link
                to="/recommendations"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  padding: "14px 28px",
                  borderRadius: 50,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none",
                }}
              >
                Get AI Picks
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </PageWrapper>
  );
}
