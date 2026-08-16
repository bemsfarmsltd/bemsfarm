import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/bemsfarms_logo.png";

const TOTAL_STEPS = 4;

// Step panel images — real farm/food photography for each step
const STEP_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&q=90", // market stall
  "https://res.cloudinary.com/dyzkjerez/image/upload/v1786167154/Gemini_Generated_Image_ep0doxep0doxep0d_hxtkii.png", // family sharing a meal
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1000&q=90", // fresh veg
  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&q=90", // produce
];

const FAMILY_SIZES = [
  {
    value: "solo",
    label: "Just me",
    desc: "1 person",
    emoji: "🧍",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80",
  },
  {
    value: "couple",
    label: "Couple",
    desc: "2 people",
    emoji: "🧑‍🤝‍🧑",
    img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=80",
  },
  {
    value: "small",
    label: "Small family",
    desc: "3–4 people",
    emoji: "👨‍👩‍👧",
    img: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=300&q=80",
  },
  {
    value: "large",
    label: "Large family",
    desc: "5+ people",
    emoji: "👨‍👩‍👧‍👦",
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80",
  },
];

const BUDGETS = [
  {
    value: 5000,
    label: "₦5,000",
    desc: "Budget-friendly",
    gradient: "linear-gradient(135deg, #EAF7EC, #CFEBD3)",
    textColor: "#1B4332",
  },
  {
    value: 10000,
    label: "₦10,000",
    desc: "Moderate",
    gradient: "linear-gradient(135deg, #FFF6E0, #FCE7B0)",
    textColor: "#7B5800",
  },
  {
    value: 25000,
    label: "₦25,000",
    desc: "Comfortable",
    gradient: "linear-gradient(135deg, #FFEEE3, #FFD5BC)",
    textColor: "#9A3E12",
  },
  {
    value: 50000,
    label: "₦50,000+",
    desc: "Premium",
    gradient: "linear-gradient(135deg, #1B4332, #2F6B4F)",
    textColor: "#FFFFFF",
  },
];

const HEALTH_GOALS = [
  { value: "general", label: "General health", emoji: "🌿" },
  { value: "weight_loss", label: "Weight management", emoji: "⚖️" },
  { value: "diabetes", label: "Diabetes-friendly", emoji: "🩺" },
  { value: "heart_health", label: "Heart health", emoji: "❤️" },
  { value: "pregnancy", label: "Pregnancy / nursing", emoji: "🤰" },
  { value: "muscle_gain", label: "Muscle & fitness", emoji: "💪" },
  { value: "children", label: "Kids & family", emoji: "🧒" },
  { value: "hypertension", label: "Low sodium", emoji: "🧂" },
];

const FEATURE_CARDS = [
  {
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80",
    title: "AI-powered search",
    desc: "Finds exactly what you need, in seconds",
    featured: true,
  },
  {
    img: "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
    title: "Direct from farms",
    desc: "No middlemen, better prices",
  },
  {
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&q=80",
    title: "Smart pricing",
    desc: "Fair, transparent costs",
  },
  {
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80",
    title: "Recipe suggestions",
    desc: "Cook better, eat fresher",
  },
];

const STEPS_META = [
  {
    eyebrow: "Welcome",
    headline: "Fresh from Nigerian farms\nto your door",
    sub: "BemsFarms uses AI to personalise your shopping — better prices, smarter picks, recipes you'll actually cook.",
  },
  {
    eyebrow: "Household",
    headline: "Who are you\nshopping for?",
    sub: "We'll suggest the right quantities and bundle deals for your household.",
  },
  {
    eyebrow: "Budget",
    headline: "What's your weekly\nfood budget?",
    sub: "We'll highlight the best value options and alert you to deals in your range.",
  },
  {
    eyebrow: "Health",
    headline: "Any health goals?\n(optional)",
    sub: "Pick as many as you like. Our AI will prioritise products that support your goals.",
  },
];

const OB_CSS = `
.ob-layout { display: flex; min-height: 100vh; position: relative; }
.ob-panel { display: none; }
.ob-content { flex: 1; padding: 24px 20px 60px; overflow-y: auto; position: relative; z-index: 1; }
.ob-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(27,67,50,0.08); position: relative; z-index: 1; }
.ob-desktop-skip { display: none; }

.ob-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

.ob-grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  mix-blend-mode: overlay;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.ob-bento {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  grid-template-rows: repeat(3, 84px);
  gap: 12px;
}
.ob-bento-feature { grid-row: 1 / span 3; }

.ob-pill-btn {
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

@media (max-width: 640px) {
  .ob-bento { grid-template-columns: 1fr; grid-template-rows: 170px repeat(3, auto); }
  .ob-bento-feature { grid-row: auto; }
}

@media (min-width: 768px) {
  .ob-panel { display: flex; }
  .ob-content { padding: 52px 64px 60px; }
  .ob-topbar { display: none; }
  .ob-desktop-skip { display: flex; }
}
`;

function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        letterSpacing: "2px",
        fontWeight: 700,
        color: "#1B4332",
        textTransform: "uppercase",
        background: "rgba(27,67,50,0.07)",
        border: "1px solid rgba(27,67,50,0.12)",
        borderRadius: "999px",
        padding: "6px 14px",
      }}
    >
      {children}
    </span>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [familySize, setFamilySize] = useState(null);
  const [budget, setBudget] = useState(null);
  const [healthGoals, setHealthGoals] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleGoal = (val) =>
    setHealthGoals((prev) =>
      prev.includes(val) ? prev.filter((g) => g !== val) : [...prev, val],
    );

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };
  const skip = () => navigate("/home");

  const finish = async () => {
    setSaving(true);
    try {
      localStorage.setItem(
        "bemsfarms_prefs",
        JSON.stringify({
          familySize,
          budget,
          healthGoals,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {}
    setTimeout(() => navigate("/home"), 600);
  };

  const canContinue = () => {
    if (step === 0) return true;
    if (step === 1) return familySize !== null;
    if (step === 2) return budget !== null;
    if (step === 3) return true;
    return false;
  };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
  };

  const meta = STEPS_META[step];

  return (
    <div
      className="ob-layout"
      style={{ backgroundColor: "#FBF8F3", fontFamily: "var(--body-font)" }}
    >
      <style>{OB_CSS}</style>

      {/* ── LEFT PANEL (desktop only) ─────────────────────── */}
      <div
        className="ob-panel"
        style={{
          width: "40%",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          flexDirection: "column",
          overflow: "hidden",
          borderTopRightRadius: "32px",
          borderBottomRightRadius: "32px",
        }}
      >
        {/* Background image with cross-fade */}
        {STEP_IMAGES.map((img, i) => (
          <motion.div
            key={img}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: i === step ? 1 : 0, scale: i === step ? 1 : 1.06 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
        {/* Warm dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(165deg, rgba(11,36,22,0.92) 0%, rgba(27,67,50,0.68) 55%, rgba(64,145,108,0.5) 100%)",
          }}
        />
        {/* Grain texture for warmth */}
        <div className="ob-grain" />

        {/* Glow accent */}
        <div
          className="ob-blob"
          style={{
            width: "280px",
            height: "280px",
            top: "-60px",
            right: "-80px",
            background: "radial-gradient(circle, rgba(245,158,11,0.35), transparent 70%)",
          }}
        />

        {/* Panel content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "36px",
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: "auto" }}>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(6px)",
                borderRadius: "12px",
                padding: "8px 14px",
                display: "inline-block",
                marginBottom: "36px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              }}
            >
              <img
                src={logo}
                alt="BemsFarms"
                style={{ height: "30px", display: "block" }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "11px",
                    letterSpacing: "2.5px",
                    fontWeight: 700,
                    color: "#FFD37A",
                    textTransform: "uppercase",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      height: "1.5px",
                      background: "#FFD37A",
                      display: "inline-block",
                    }}
                  />
                  {meta.eyebrow} · Step {step + 1} of {TOTAL_STEPS}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--heading-font)",
                    fontSize: "clamp(26px, 3vw, 32px)",
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    color: "white",
                    lineHeight: 1.22,
                    whiteSpace: "pre-line",
                    marginBottom: "16px",
                  }}
                >
                  {meta.headline}
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.75,
                    maxWidth: "340px",
                  }}
                >
                  {meta.sub}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step progress — segmented bar */}
          <div style={{ display: "flex", gap: "8px", marginTop: "40px" }}>
            {STEPS_META.map((_, i) => (
              <div
                key={i}
                style={{
                  height: "5px",
                  flex: 1,
                  borderRadius: "3px",
                  backgroundColor:
                    i <= step ? "#F59E0B" : "rgba(255,255,255,0.22)",
                  boxShadow: i === step ? "0 0 12px rgba(245,158,11,0.7)" : "none",
                  transition: "all 0.4s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative background blobs */}
        <div
          className="ob-blob"
          style={{
            width: "420px",
            height: "420px",
            top: "-140px",
            right: "-140px",
            background: "radial-gradient(circle, rgba(64,145,108,0.14), transparent 70%)",
          }}
        />
        <div
          className="ob-blob"
          style={{
            width: "360px",
            height: "360px",
            bottom: "-120px",
            left: "-100px",
            background: "radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)",
          }}
        />

        {/* Mobile top bar */}
        <div className="ob-topbar">
          <div
            style={{
              backgroundColor: "#1B4332",
              borderRadius: "8px",
              padding: "6px 10px",
            }}
          >
            <img
              src={logo}
              alt="BemsFarms"
              style={{
                height: "26px",
                display: "block",
                filter: "brightness(0) invert(1)",
              }}
            />
          </div>
          <button
            onClick={skip}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "var(--body-font)",
            }}
          >
            Skip →
          </button>
        </div>

        {/* Mobile progress bar */}
        <div style={{ height: "3px", backgroundColor: "#E5E7EB", position: "relative", zIndex: 1 }}>
          <motion.div
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #1B4332, #40916C)",
            }}
          />
        </div>

        <div className="ob-content" style={{ flex: 1 }}>
          {/* Desktop skip */}
          <div
            className="ob-desktop-skip"
            style={{
              justifyContent: "flex-end",
              marginBottom: "36px",
            }}
          >
            <button
              onClick={skip}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9CA3AF",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "var(--body-font)",
              }}
            >
              Skip setup →
            </button>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* STEP 0: WELCOME */}
              {step === 0 && (
                <div>
                  <Chip>Welcome</Chip>
                  <h1
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "clamp(28px, 4vw, 40px)",
                      fontWeight: 800,
                      letterSpacing: "-0.015em",
                      color: "#0D1117",
                      lineHeight: 1.15,
                      margin: "14px 0 10px",
                    }}
                  >
                    Welcome to <span style={{ fontFamily: "var(--custom-font)", fontWeight: 400 }}>BemsFarms</span>
                  </h1>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "15px",
                      lineHeight: 1.7,
                      marginBottom: "32px",
                      maxWidth: "480px",
                    }}
                  >
                    Let's personalise your experience in 3 quick questions.
                  </p>
                  <div className="ob-bento">
                    {FEATURE_CARDS.map((card, i) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        whileHover={{ y: -3 }}
                        className={card.featured ? "ob-bento-feature" : ""}
                        style={{
                          position: "relative",
                          borderRadius: "18px",
                          overflow: "hidden",
                          boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
                        }}
                      >
                        <img
                          src={card.img}
                          alt={card.title}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(to top, rgba(13,17,23,0.88) 0%, rgba(13,17,23,0.25) 55%, transparent 100%)",
                          }}
                        />
                        <div
                          style={{
                            position: "relative",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            padding: card.featured ? "20px" : "12px 14px",
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "var(--heading-font)",
                              fontSize: card.featured ? "17px" : "13px",
                              fontWeight: 700,
                              color: "white",
                              marginBottom: "3px",
                            }}
                          >
                            {card.title}
                          </p>
                          <p
                            style={{
                              fontSize: card.featured ? "12.5px" : "11px",
                              color: "rgba(255,255,255,0.78)",
                              lineHeight: 1.4,
                            }}
                          >
                            {card.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 1: FAMILY SIZE */}
              {step === 1 && (
                <div>
                  <Chip>Household</Chip>
                  <h1
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "clamp(26px, 4vw, 36px)",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "#0D1117",
                      margin: "14px 0 8px",
                    }}
                  >
                    Who are you shopping for?
                  </h1>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "14px",
                      marginBottom: "28px",
                    }}
                  >
                    We'll suggest the right quantities for your household.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px",
                    }}
                  >
                    {FAMILY_SIZES.map((opt) => {
                      const selected = familySize === opt.value;
                      return (
                        <motion.button
                          key={opt.value}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setFamilySize(opt.value)}
                          style={{
                            padding: 0,
                            borderRadius: "18px",
                            border: `2.5px solid ${selected ? "#1B4332" : "#ECE7DE"}`,
                            cursor: "pointer",
                            overflow: "hidden",
                            boxShadow: selected
                              ? "0 0 0 4px rgba(27,67,50,0.14), 0 10px 26px rgba(27,67,50,0.18)"
                              : "0 2px 10px rgba(0,0,0,0.05)",
                            transition: "all 0.25s ease",
                            position: "relative",
                            textAlign: "left",
                            backgroundColor: "white",
                          }}
                        >
                          <div
                            style={{
                              height: "118px",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <img
                              src={opt.img}
                              alt={opt.label}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                  "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)",
                              }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                top: "10px",
                                left: "10px",
                                fontSize: "20px",
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                              }}
                            >
                              {opt.emoji}
                            </span>
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{
                                  position: "absolute",
                                  top: "10px",
                                  right: "10px",
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  backgroundColor: "#1B4332",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                }}
                              >
                                <span
                                  style={{
                                    color: "white",
                                    fontSize: "13px",
                                    fontWeight: 800,
                                  }}
                                >
                                  ✓
                                </span>
                              </motion.div>
                            )}
                          </div>
                          <div
                            style={{
                              padding: "13px 14px",
                              backgroundColor: selected ? "#F0FAF3" : "white",
                            }}
                          >
                            <p
                              style={{
                                fontFamily: "var(--heading-font)",
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#0D1117",
                                marginBottom: "2px",
                              }}
                            >
                              {opt.label}
                            </p>
                            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>
                              {opt.desc}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: BUDGET */}
              {step === 2 && (
                <div>
                  <Chip>Budget</Chip>
                  <h1
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "clamp(26px, 4vw, 36px)",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "#0D1117",
                      margin: "14px 0 8px",
                    }}
                  >
                    Weekly food budget?
                  </h1>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "14px",
                      marginBottom: "28px",
                    }}
                  >
                    We'll highlight the best value options in your range.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px",
                    }}
                  >
                    {BUDGETS.map((opt) => {
                      const selected = budget === opt.value;
                      return (
                        <motion.button
                          key={opt.value}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setBudget(opt.value)}
                          style={{
                            padding: "26px 20px",
                            borderRadius: "18px",
                            border: `2.5px solid ${selected ? "#1B4332" : "transparent"}`,
                            cursor: "pointer",
                            background: opt.gradient,
                            boxShadow: selected
                              ? "0 0 0 4px rgba(27,67,50,0.14), 0 10px 28px rgba(0,0,0,0.14)"
                              : "0 2px 10px rgba(0,0,0,0.05)",
                            transition: "all 0.25s ease",
                            textAlign: "left",
                            position: "relative",
                          }}
                        >
                          {selected && (
                            <div
                              style={{
                                position: "absolute",
                                top: "14px",
                                right: "14px",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor:
                                  opt.textColor === "#FFFFFF"
                                    ? "rgba(255,255,255,0.3)"
                                    : "rgba(27,67,50,0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span
                                style={{
                                  color: opt.textColor,
                                  fontSize: "13px",
                                  fontWeight: 800,
                                }}
                              >
                                ✓
                              </span>
                            </div>
                          )}
                          <p
                            style={{
                              fontFamily: "var(--heading-font)",
                              fontSize: "22px",
                              fontWeight: 800,
                              letterSpacing: "-0.01em",
                              color: opt.textColor,
                              marginBottom: "5px",
                            }}
                          >
                            {opt.label}
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: opt.textColor,
                              opacity: 0.75,
                              fontWeight: 600,
                            }}
                          >
                            {opt.desc}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: HEALTH GOALS */}
              {step === 3 && (
                <div>
                  <Chip>Health</Chip>
                  <h1
                    style={{
                      fontFamily: "var(--heading-font)",
                      fontSize: "clamp(26px, 4vw, 36px)",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "#0D1117",
                      margin: "14px 0 8px",
                    }}
                  >
                    Any health goals?
                  </h1>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: "14px",
                      marginBottom: "28px",
                    }}
                  >
                    Pick as many as you like — optional.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    {HEALTH_GOALS.map((goal) => {
                      const selected = healthGoals.includes(goal.value);
                      return (
                        <motion.button
                          key={goal.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleGoal(goal.value)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "13px 16px",
                            borderRadius: "16px",
                            border: `2px solid ${selected ? "#1B4332" : "#ECE7DE"}`,
                            backgroundColor: selected ? "#F0FAF3" : "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            boxShadow: selected
                              ? "0 0 0 3px rgba(27,67,50,0.1)"
                              : "0 1px 4px rgba(0,0,0,0.03)",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "12px",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "20px",
                              backgroundColor: selected
                                ? "rgba(27,67,50,0.1)"
                                : "#F8F6F1",
                            }}
                          >
                            {goal.emoji}
                          </div>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: selected ? "#1B4332" : "#4B5563",
                              flex: 1,
                              fontFamily: "var(--body-font)",
                              lineHeight: 1.3,
                            }}
                          >
                            {goal.label}
                          </span>
                          {selected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              style={{
                                color: "#1B4332",
                                fontWeight: 800,
                                fontSize: "14px",
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </motion.span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#9CA3AF",
                      marginTop: "18px",
                    }}
                  >
                    You can update these anytime in your profile
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* NAVIGATION BUTTONS */}
          <div style={{ display: "flex", gap: "12px", marginTop: "36px" }}>
            {step > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={goBack}
                className="ob-pill-btn"
                style={{
                  padding: "16px 24px",
                  borderRadius: "999px",
                  border: "1.5px solid #E5E1D8",
                  background: "white",
                  color: "#6B7280",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontFamily: "var(--body-font)",
                }}
              >
                ← Back
              </motion.button>
            )}
            <motion.button
              whileHover={
                canContinue()
                  ? { scale: 1.015, boxShadow: "0 12px 32px rgba(27,67,50,0.36)" }
                  : {}
              }
              whileTap={{ scale: canContinue() ? 0.97 : 1 }}
              onClick={step === TOTAL_STEPS - 1 ? finish : goNext}
              disabled={!canContinue() || saving}
              className="ob-pill-btn"
              style={{
                flex: 1,
                padding: "17px",
                borderRadius: "999px",
                border: "none",
                background: canContinue()
                  ? "linear-gradient(135deg, #1B4332, #40916C)"
                  : "#F1EEE7",
                color: canContinue() ? "white" : "#B3AEA3",
                fontWeight: 800,
                cursor: canContinue() ? "pointer" : "default",
                fontSize: "15px",
                fontFamily: "var(--body-font)",
                boxShadow: canContinue()
                  ? "0 8px 24px rgba(27,67,50,0.28)"
                  : "none",
              }}
            >
              {saving
                ? "✨ Setting up..."
                : step === 0
                  ? "Let's Go →"
                  : step === TOTAL_STEPS - 1
                    ? "Start Shopping 🚀"
                    : "Continue →"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}