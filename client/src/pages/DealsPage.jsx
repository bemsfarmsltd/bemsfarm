import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import ProductCard from "../components/ui/ProductCard";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";

export default function DealsPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop, isTabletAny, padding, gap, cols } =
    useResponsive();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 11,
    minutes: 59,
    seconds: 47,
  });

  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data.products))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  const dealProducts = products;

  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #BF360C, #E64A19, #F57C00)",
          padding: "64px 24px",
          textAlign: "center",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            right: "-60px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <span
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "50px",
              padding: "6px 20px",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "2px",
              marginBottom: "16px",
              display: "inline-block",
            }}
          >
            🔥 LIMITED TIME OFFER
          </span>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 64px)",
              fontWeight: 900,
              marginBottom: "12px",
              fontFamily: "Space Grotesk, sans-serif",
              lineHeight: 1.1,
            }}
          >
            Up to 40% Off
            <br />
            <span style={{ color: "#FFF176" }}>Fresh Farm Products</span>
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.85)",
              marginBottom: "32px",
            }}
          >
            Massive savings on your favourite Nigerian foods. Don't miss out!
          </p>

          {/* Countdown */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            {[
              { label: "Hours", value: pad(timeLeft.hours) },
              { label: "Minutes", value: pad(timeLeft.minutes) },
              { label: "Seconds", value: pad(timeLeft.seconds) },
            ].map((unit, i) => (
              <div
                key={unit.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: i < 2 ? "16px" : "0",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <motion.div
                    key={unit.value}
                    initial={{ rotateX: -90 }}
                    animate={{ rotateX: 0 }}
                    style={{
                      width: "72px",
                      height: "72px",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      fontWeight: 900,
                      marginBottom: "6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {unit.value}
                  </motion.div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.7)",
                      letterSpacing: "1px",
                    }}
                  >
                    {unit.label.toUpperCase()}
                  </p>
                </div>
                {i < 2 && (
                  <span
                    style={{
                      fontSize: "28px",
                      fontWeight: 900,
                      marginBottom: "20px",
                    }}
                  >
                    :
                  </span>
                )}
              </div>
            ))}
          </div>

        </motion.div>
      </div>

      {/* Products */}
      <div
        style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#202124",
                marginBottom: "4px",
              }}
            >
              🔥 All Deals
            </h2>
            <p style={{ color: "#9AA0A6", fontSize: "14px" }}>
              Check out our fresh picks below — have a coupon code? Apply it at checkout.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/products")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid #E8EAED",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            View All Products
          </motion.button>
        </div>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
                style={{
                  height: "280px",
                  backgroundColor: "#F8F9FA",
                  borderRadius: "20px",
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            {dealProducts.map((product, i) => (
              <motion.div key={product.id} style={{ position: "relative" }}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
