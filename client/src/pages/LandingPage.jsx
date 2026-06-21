import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Import your logo here - adjust path as needed
// import bemsFarmsLogo from '../assets/bemsfarms_logo.png'

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/onboarding");
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      {/* TOP NAV - Simple */}
      <motion.nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #E5E7EB",
          zIndex: 50,
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* LOGO */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          onClick={() => window.scrollTo(0, 0)}
          style={{
            fontSize: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          🌿{" "}
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "18px",
              fontWeight: 800,
              color: "#1B4332",
            }}
          >
            BemsFarms
          </span>
        </motion.div>

        {/* RIGHT BUTTONS */}
        <div style={{ display: "flex", gap: "12px" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate("/login")}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              border: "1px solid #1B4332",
              borderRadius: "8px",
              color: "#1B4332",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontSize: "14px",
            }}
          >
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/register")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#1B4332",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontSize: "14px",
            }}
          >
            Start Free
          </motion.button>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1B4332 0%, #40916C 50%, #2D6A4F 100%)",
          position: "relative",
          overflow: "hidden",
          padding: "80px 20px 20px",
          marginTop: "60px",
        }}
      >
        {/* Background Animation */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            top: "-100px",
            right: "-100px",
          }}
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            textAlign: "center",
            color: "white",
            maxWidth: "700px",
            zIndex: 1,
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            style={{
              fontSize: "80px",
              marginBottom: "20px",
            }}
          >
            🌿
          </motion.div>

          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "64px",
              fontWeight: 900,
              marginBottom: "16px",
              marginTop: 0,
              lineHeight: 1.2,
            }}
          >
            The Future of Nigerian Food Shopping
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "32px",
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            AI-powered, farm-fresh, transparently priced. Direct from Nigerian
            farmers to your door.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/register")}
              style={{
                padding: "16px 40px",
                backgroundColor: "white",
                color: "#1B4332",
                border: "none",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                fontFamily: "Syne, sans-serif",
              }}
            >
              Get Started Free
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              style={{
                padding: "16px 40px",
                backgroundColor: "transparent",
                color: "white",
                border: "2px solid white",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
                fontFamily: "Syne, sans-serif",
              }}
            >
              Sign In
            </motion.button>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: "40px",
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              flexWrap: "wrap",
            }}
          >
            <span>✅ 10K+ Happy Customers</span>
            <span>•</span>
            <span>✅ 500+ Farm-Fresh Products</span>
            <span>•</span>
            <span>✅ 24/7 AI Support</span>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES PREVIEW */}
      <section
        style={{
          padding: "80px 20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "48px",
            fontWeight: 900,
            textAlign: "center",
            color: "#111827",
            marginBottom: "60px",
            marginTop: 0,
          }}
        >
          Why BemsFarms?
        </motion.h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {[
            {
              icon: "🔍",
              title: "Smart Search",
              desc: "AI understands what you want, not just keywords",
            },
            {
              icon: "💰",
              title: "Fair Pricing",
              desc: "Dynamic prices that support farmers",
            },
            {
              icon: "🛡️",
              title: "Secure",
              desc: "Advanced fraud detection protects you",
            },
            {
              icon: "📊",
              title: "Smart Inventory",
              desc: "Always stocked with what you need",
            },
            {
              icon: "🤖",
              title: "AI Assistant",
              desc: "24/7 chatbot for recipes & nutrition",
            },
            {
              icon: "🇳🇬",
              title: "100% Nigerian",
              desc: "Direct from local farmers",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              style={{
                backgroundColor: "#F8FAFB",
                borderRadius: "20px",
                padding: "32px",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 20px 40px rgba(27,67,50,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>
                {feature.icon}
              </div>
              <h3
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "12px",
                  marginTop: 0,
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#9CA3AF",
                  lineHeight: 1.6,
                  marginBottom: 0,
                }}
              >
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section
        style={{
          padding: "80px 20px",
          textAlign: "center",
          backgroundColor: "#F8FAFB",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "48px",
              fontWeight: 900,
              color: "#111827",
              marginBottom: "24px",
              marginTop: 0,
            }}
          >
            Ready to Shop Smarter?
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#9CA3AF",
              marginBottom: "32px",
              maxWidth: "600px",
              margin: "0 auto 32px",
            }}
          >
            Join thousands of Nigerians shopping smarter, eating healthier, and
            supporting local farmers.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/register")}
            style={{
              padding: "18px 48px",
              backgroundColor: "#1B4332",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontWeight: 800,
              fontSize: "16px",
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
              boxShadow: "0 10px 30px rgba(27,67,50,0.3)",
            }}
          >
            Create Free Account
          </motion.button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          backgroundColor: "#111827",
          color: "white",
          padding: "40px 20px",
          textAlign: "center",
          fontSize: "14px",
        }}
      >
        <p style={{ marginBottom: "8px" }}>
          🇳🇬 BemsFarms - Nigerian Farm-Fresh Technology
        </p>
        <p style={{ color: "#9CA3AF" }}>© 2024 All rights reserved.</p>
      </footer>
    </div>
  );
}
