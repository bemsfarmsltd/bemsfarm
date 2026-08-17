import { useState } from "react";
import { motion } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useResponsive } from "../hooks/useResponsive";
import api from "../services/api";
export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState("");
  const { width } = useResponsive();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const handleSend = async () => {
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message before sending.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/contact", form);
      setSent(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const contactCards = [
    {
      icon: "📞",
      title: "Call Us",
      color: "#E8F5E9",
      iconBg: "#2E7D32",
      lines: [
        { text: "Available 24/7, 7 days a week", type: "info" },
        { text: "+234 800 BEMS FARM", type: "phone", value: "+2348002367326" },
        {
          text: "WhatsApp: +234 800 236 7327",
          type: "whatsapp",
          value: "2348002367327",
        },
      ],
    },
    {
      icon: "📧",
      title: "Write To Us",
      color: "#E3F2FD",
      iconBg: "#1565C0",
      lines: [
        { text: "We reply within 24 hours", type: "info" },
        {
          text: "info@bemsfarms.com",
          type: "email",
          value: "info@bemsfarms.com",
        },
      ],
    },
    {
      icon: "📍",
      title: "Visit Us",
      color: "#FFF3E0",
      iconBg: "#E65100",
      lines: [
        { text: "BemsFarm HQ", type: "info" },
        {
          text: "Lagos Island, Lagos State, Nigeria",
          type: "maps",
          value: "BemsFarm+Lagos+Island+Nigeria",
        },
        { text: "Mon - Sat: 8am - 8pm", type: "info" },
      ],
    },
  ];

  return (
    <PageWrapper>
      {/* Hero */}

      <div
        style={{
          background:
            "linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #40916C 100%)",
          padding: isMobile ? "60px 20px 48px" : "80px 40px 64px",
          textAlign: "center",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            left: "-40px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: "50px",
              padding: "6px 16px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                color: "#FCD34D",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1.5px",
              }}
            >
              📞 WE'RE HERE TO HELP
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--heading-font)",
              fontSize: isMobile ? "32px" : "48px",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            Get In Touch
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "15px",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            Questions about your order? Need help finding a product? We respond
            within 24 hours.
          </p>
        </div>
      </div>

      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 24px" }}
      >
        {/* Breadcrumb */}
        <div
          style={{ fontSize: "13px", color: "#9AA0A6", marginBottom: "40px" }}
        >
          Home /{" "}
          <span style={{ color: "#202124", fontWeight: 600 }}>Contact</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
                ? "1fr"
                : "1fr 2fr",
            gap: isMobile ? "24px" : isTablet ? "28px" : "40px",
          }}
        >
          {/* Contact Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {contactCards.map((card) => (
              <div
                key={card.title}
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #E8EAED",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      backgroundColor: card.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#202124",
                    }}
                  >
                    {card.title}
                  </h3>
                </div>
                <div
                  style={{
                    borderTop: "1px solid #E8EAED",
                    paddingTop: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {card.lines.map((line, i) => {
                    if (line.type === "info")
                      return (
                        <p
                          key={i}
                          style={{ fontSize: "14px", color: "#5F6368" }}
                        >
                          {line.text}
                        </p>
                      );
                    if (line.type === "phone")
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <a
                            href={`tel:${line.value}`}
                            style={{
                              fontSize: "14px",
                              color: "#2E7D32",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            📞 {line.text}
                          </a>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              copyToClipboard(line.value, line.value)
                            }
                            style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #E8EAED",
                              backgroundColor:
                                copied === line.value ? "#E8F5E9" : "white",
                              cursor: "pointer",
                              color:
                                copied === line.value ? "#2E7D32" : "#9AA0A6",
                              fontWeight: 600,
                            }}
                          >
                            {copied === line.value ? "✓ Copied" : "Copy"}
                          </motion.button>
                        </div>
                      );
                    if (line.type === "whatsapp")
                      return (
                        <a
                          key={i}
                          href={`https://wa.me/${line.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "14px",
                            color: "#25D366",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          💬 {line.text}
                        </a>
                      );
                    if (line.type === "email")
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <a
                            href={`mailto:${line.value}`}
                            style={{
                              fontSize: "14px",
                              color: "#1565C0",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            ✉️ {line.value}
                          </a>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              copyToClipboard(line.value, line.value)
                            }
                            style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #E8EAED",
                              backgroundColor:
                                copied === line.value ? "#E8F5E9" : "white",
                              cursor: "pointer",
                              color:
                                copied === line.value ? "#2E7D32" : "#9AA0A6",
                              fontWeight: 600,
                            }}
                          >
                            {copied === line.value ? "✓ Copied" : "Copy"}
                          </motion.button>
                        </div>
                      );
                    if (line.type === "maps")
                      return (
                        <a
                          key={i}
                          href={`https://maps.google.com/?q=${line.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "14px",
                            color: "#E65100",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          🗺️ {line.text}
                          <span
                            style={{
                              fontSize: "11px",
                              backgroundColor: "#FFF3E0",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginLeft: "4px",
                            }}
                          >
                            Open Maps →
                          </span>
                        </a>
                      );
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              padding: "36px",
              border: "1px solid #E8EAED",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "40px 20px" }}
              >
                <div style={{ fontSize: "108", marginBottom: "20px" }}>✅</div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#2E7D32",
                    marginBottom: "12px",
                  }}
                >
                  Message Sent!
                </h3>
                <p style={{ color: "#9AA0A6", fontSize: "15px" }}>
                  Thank you for reaching out. We'll get back to you within 24
                  hours.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", phone: "", message: "" });
                  }}
                  style={{
                    marginTop: "24px",
                    backgroundColor: "#2E7D32",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "14px 28px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Send Another Message
                </motion.button>
              </motion.div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      isMobile || isTablet ? "1fr" : "1fr 1fr 1fr",
                    gap: "14px",
                    marginBottom: "16px",
                  }}
                >
                  {[
                    { key: "name", placeholder: "Your Name *", type: "text" },
                    {
                      key: "email",
                      placeholder: "Your Email *",
                      type: "email",
                    },
                    { key: "phone", placeholder: "Your Phone", type: "tel" },
                  ].map((f) => (
                    <input
                      key={f.key}
                      type={f.type}
                      value={form[f.key]}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      placeholder={f.placeholder}
                      style={{
                        padding: "14px 16px",
                        border: "1px solid #E8EAED",
                        borderRadius: "10px",
                        fontSize: "14px",
                        outline: "none",
                        backgroundColor: "#F8F9FA",
                        color: "#202124",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                      onBlur={(e) => (e.target.style.borderColor = "#E8EAED")}
                    />
                  ))}
                </div>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, message: e.target.value }))
                  }
                  placeholder="Your Message *"
                  rows={7}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1px solid #E8EAED",
                    borderRadius: "10px",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#F8F9FA",
                    resize: "vertical",
                    fontFamily: "var(--body-font)",
                    color: "#202124",
                    marginBottom: "20px",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2E7D32")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8EAED")}
                />
                {error && (
                  <div
                    style={{
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      color: "#DC2626",
                      fontSize: "14px",
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSend}
                    disabled={loading}
                    style={{
                      backgroundColor: "#F57C00",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      padding: "16px 32px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(245,124,0,0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          ⏳
                        </motion.span>{" "}
                        Sending...
                      </>
                    ) : (
                      "Send Message →"
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
