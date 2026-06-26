import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/bemsfarms_logo.png";

const COUNTDOWN = { target: new Date("2026-07-03T00:00:00") };

function getTimeLeft(target) {
  const diff = target - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=85",
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&q=85",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=85",
];

const TEASER_FEATURES = [
  {
    icon: "🌾",
    label: "Farm-direct produce",
    desc: "Straight from Nigerian farms, no middlemen",
  },
  {
    icon: "🤖",
    label: "AI-powered shopping",
    desc: "Smart search, recommendations & recipe help",
  },
  {
    icon: "🚚",
    label: "Fast local delivery",
    desc: "Fresh food to your door across Lagos & beyond",
  },
  {
    icon: "💳",
    label: "Secure payments",
    desc: "Powered by Paystack — Nigeria's most trusted",
  },
];

const CSS = `
  .cs-countdown { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .cs-countdown-box { min-width: 64px; padding: 12px 14px; }
  .cs-countdown-num { font-size: clamp(28px, 8vw, 48px); }
  .cs-features { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .cs-email-form { flex-direction: column; border-radius: 16px !important; overflow: visible !important; }
  .cs-email-input { border-radius: 12px !important; }
  .cs-email-btn { border-radius: 12px !important; width: 100%; }
  .cs-nav { padding: 16px 20px !important; }
  .cs-content { padding: 32px 16px 40px !important; }
  .cs-footer { padding: 16px 20px !important; flex-direction: column; text-align: center; gap: 8px; }

  @media (min-width: 640px) {
    .cs-countdown { gap: 20px; flex-wrap: nowrap; }
    .cs-countdown-box { min-width: 80px; padding: 16px 20px; }
    .cs-features { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important; gap: 16px !important; }
    .cs-email-form { flex-direction: row; border-radius: 16px !important; overflow: hidden !important; }
    .cs-email-input { border-radius: 0 !important; }
    .cs-email-btn { border-radius: 0 !important; width: auto; }
    .cs-nav { padding: 20px 40px !important; }
    .cs-content { padding: 40px 20px 60px !important; }
    .cs-footer { padding: 20px 40px !important; flex-direction: row; text-align: left; }
  }
`;

export default function ComingSoonPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(getTimeLeft(COUNTDOWN.target));
  const [heroIdx, setHeroIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft(COUNTDOWN.target)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length),
      5000,
    );
    return () => clearInterval(t);
  }, []);

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (newCount >= 5) {
      setLogoClicks(0);
      navigate("/launch");
      return;
    }
    clickTimerRef.current = setTimeout(() => setLogoClicks(0), 3000);
  };

  const handleEmailSubmit = (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        minHeight: "100vh",
        overflow: "hidden",
        position: "relative",
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* Background */}
      {HERO_IMAGES.map((img, i) => (
        <motion.div
          key={img}
          initial={{ opacity: 0 }}
          animate={{ opacity: i === heroIdx ? 1 : 0 }}
          transition={{ duration: 1.5 }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
          }}
        />
      ))}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(135deg, rgba(10,46,10,0.92) 0%, rgba(27,67,50,0.85) 50%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Orbs */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -30, 0], opacity: [0.04, 0.1, 0.04] }}
          transition={{
            duration: 6 + i * 1.5,
            repeat: Infinity,
            delay: i * 0.8,
          }}
          style={{
            position: "fixed",
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            borderRadius: "50%",
            background:
              i % 2 === 0 ? "rgba(64,145,108,0.15)" : "rgba(245,159,11,0.1)",
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 25}%`,
            zIndex: 1,
            filter: "blur(40px)",
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nav */}
        <nav
          className="cs-nav"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <motion.div
            onClick={handleLogoClick}
            whileTap={{ scale: 0.95 }}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <img
              src={logo}
              alt="BemsFarms"
              style={{ height: "36px", filter: "brightness(0) invert(1)" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <span
              style={{
                display: "none",
                fontFamily: "Syne, sans-serif",
                fontSize: "20px",
                fontWeight: 900,
                color: "white",
              }}
            >
              🌿 BemsFarms
            </span>
          </motion.div>

          {logoClicks > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: "fixed",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(64,145,108,0.3)",
                border: "1px solid rgba(64,145,108,0.5)",
                borderRadius: "50px",
                padding: "4px 14px",
                fontSize: "12px",
                color: "#A5D6A7",
                fontWeight: 700,
                backdropFilter: "blur(8px)",
                zIndex: 100,
              }}
            >
              {5 - logoClicks} more {5 - logoClicks === 1 ? "click" : "clicks"}
              ...
            </motion.div>
          )}

          <div
            style={{
              backgroundColor: "rgba(245,159,11,0.15)",
              border: "1px solid rgba(245,159,11,0.4)",
              borderRadius: "50px",
              padding: "5px 14px",
              fontSize: "11px",
              color: "#FCD34D",
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            🚀 LAUNCHING SOON
          </div>
        </nav>

        {/* Hero content */}
        <div
          className="cs-content"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(64,145,108,0.2)",
              border: "1px solid rgba(64,145,108,0.5)",
              borderRadius: "50px",
              padding: "7px 16px",
              marginBottom: "24px",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#4CAF50",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#A5D6A7",
                letterSpacing: "0.5px",
              }}
            >
              🌱 Nigeria's freshest farm marketplace is on its way
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(36px, 10vw, 80px)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              marginBottom: "16px",
              maxWidth: "800px",
            }}
          >
            Something Fresh
            <br />
            <span style={{ color: "#F59E0B" }}>is Growing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: "clamp(14px, 2.5vw, 18px)",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "480px",
            }}
          >
            Farm-fresh Nigerian food, AI-powered recommendations, and fast local
            delivery — all in one place.
          </motion.p>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="cs-countdown"
            style={{ marginBottom: "40px" }}
          >
            {[
              { value: time.days, label: "Days" },
              { value: time.hours, label: "Hours" },
              { value: time.minutes, label: "Minutes" },
              { value: time.seconds, label: "Seconds" },
            ].map((unit) => (
              <div key={unit.label} style={{ textAlign: "center" }}>
                <div
                  className="cs-countdown-box"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "16px",
                    backdropFilter: "blur(12px)",
                    marginBottom: "8px",
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={pad(unit.value)}
                      initial={{ y: -12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 12, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="cs-countdown-num"
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 900,
                        color: "white",
                        margin: 0,
                        lineHeight: 1,
                      }}
                    >
                      {pad(unit.value)}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {unit.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Email capture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ width: "100%", maxWidth: "480px", marginBottom: "48px" }}
          >
            {!submitted ? (
              <>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "13px",
                    marginBottom: "12px",
                  }}
                >
                  Get early access + 10% off your first order
                </p>
                <form
                  onSubmit={handleEmailSubmit}
                  className="cs-email-form"
                  style={{
                    display: "flex",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="cs-email-input"
                    style={{
                      flex: 1,
                      padding: "15px 18px",
                      border: "none",
                      outline: "none",
                      fontSize: "14px",
                      backgroundColor: "white",
                      color: "#111827",
                      minWidth: 0,
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="cs-email-btn"
                    style={{
                      padding: "15px 24px",
                      backgroundColor: "#F59E0B",
                      border: "none",
                      color: "white",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontFamily: "Nunito, sans-serif",
                    }}
                  >
                    Notify Me →
                  </motion.button>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  backgroundColor: "rgba(64,145,108,0.2)",
                  border: "1px solid rgba(64,145,108,0.5)",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "20px", marginBottom: "6px" }}>🎉</p>
                <p
                  style={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: "15px",
                    marginBottom: "4px",
                  }}
                >
                  You're on the list!
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                  We'll notify you the moment we launch. Your 10% discount code
                  is on its way.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Feature teasers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="cs-features"
            style={{
              display: "grid",
              gap: "16px",
              maxWidth: "900px",
              width: "100%",
            }}
          >
            {TEASER_FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  padding: "18px",
                  backdropFilter: "blur(8px)",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {f.icon}
                </span>
                <p
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "white",
                    marginBottom: "4px",
                  }}
                >
                  {f.label}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <div
          className="cs-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "12px",
              margin: 0,
            }}
          >
            © 2026 BemsFarms. Made with 🌿 in Nigeria
          </p>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Instagram", "Twitter", "Facebook"].map((s) => (
              <span
                key={s}
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
