// client/src/components/AIChatbot.jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";

const QUICK_QUESTIONS = [
  {
    text: "How do I cook jollof rice?",
    value:
      "Give me a step-by-step recipe for Nigerian jollof rice using BemsFarms ingredients",
  },
  {
    text: "Best foods for diabetes?",
    value:
      "What Nigerian foods from BemsFarms are good for someone managing diabetes?",
  },
  {
    text: "Egusi soup recipe",
    value:
      "How do I make egusi soup? What ingredients do I need from BemsFarms?",
  },
  {
    text: "Healthy foods for weight loss?",
    value: "What BemsFarms products should I buy for a weight loss diet?",
  },
  {
    text: "What can I cook with garri?",
    value: "What can I cook or make using garri from BemsFarms?",
  },
  {
    text: "Recipe for pepper soup",
    value:
      "Give me a Nigerian pepper soup recipe with ingredients available on BemsFarms",
  },
  {
    text: "Foods for a pregnant woman?",
    value: "What Nigerian foods from BemsFarms are best for a pregnant woman?",
  },
  {
    text: "How to store palm oil?",
    value: "How do I properly store palm oil to keep it fresh?",
  },
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to BemsFarms! 👨‍🍳 I'm Chef Bems, your personal AI kitchen chef.\n\nAsk me anything — recipes, cooking tips, what to cook with your ingredients, or the best foods for your health goals. I'm here to help you eat well the Nigerian way! 🌿",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [open]);

  useEffect(() => {
    if (open && messages.length > 1) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const conversationHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Proxy through Express to avoid client-side CORS issues
      const res = await api.post("/ai/chef-chat", {
        message: content,
        history: conversationHistory,
        cartItems: [],
      });

      const reply =
        res.data?.reply ||
        res.data?.message ||
        res.data?.content ||
        "I'm having a moment — please try again!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach my kitchen brain right now 🍳 Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content) => {
    return content.split("\n").map((line, i) => {
      const boldFormatted = line.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>",
      );
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: boldFormatted }} />
          {i < content.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 500,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          padding: 0,
          boxShadow: "0 8px 28px rgba(27,67,50,0.35)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #F59E0B",
            overflow: "hidden",
          }}
        >
          <img 
            src={chefBemsAvatar} 
            alt="Chef Bems" 
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          />
        </div>
        {unread > 0 && !open && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              backgroundColor: "#EF4444",
              color: "white",
              width: 18,
              height: 18,
              borderRadius: "50%",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
            }}
          >
            {unread}
          </motion.span>
        )}
      </motion.button>

      {/* CHAT WINDOW */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "fixed",
              bottom: 92,
              right: 24,
              zIndex: 500,
              width: "min(380px, calc(100vw - 32px))",
              height: "min(560px, calc(100vh - 120px))",
              backgroundColor: "white",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
              border: "1px solid #E5E7EB",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.4)",
                  flexShrink: 0,
                  backgroundColor: "#ffffff",
                }}
              >
                <img 
                  src={chefBemsAvatar} 
                  alt="Chef Bems" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  Chef Bems
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                  Your AI Kitchen Chef · Always Online
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  fontSize: 16,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 14px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                scrollbarWidth: "thin",
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                    gap: 8,
                    alignItems: "flex-end",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                        backgroundColor: "#ffffff",
                        border: "1px solid #1B4332",
                      }}
                    >
                      <img 
                        src={chefBemsAvatar} 
                        alt="Chef Bems" 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                      />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "82%",
                      backgroundColor:
                        msg.role === "user" ? "#1B4332" : "#F8FAFB",
                      color: msg.role === "user" ? "white" : "#111827",
                      borderRadius:
                        msg.role === "user"
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                      padding: "10px 13px",
                      fontSize: 13,
                      lineHeight: 1.6,
                      border:
                        msg.role === "assistant" ? "1px solid #E5E7EB" : "none",
                      fontFamily: "Nunito, sans-serif",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {formatMessage(msg.content)}
                  </div>
                </div>
              ))}

              {loading && (
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      backgroundColor: "#ffffff",
                      border: "1px solid #1B4332",
                    }}
                  >
                    <img 
                      src={chefBemsAvatar} 
                      alt="Chef Bems" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                  <div
                    style={{
                      backgroundColor: "#F8FAFB",
                      border: "1px solid #E5E7EB",
                      borderRadius: "18px 18px 18px 4px",
                      padding: "12px 16px",
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                    }}
                  >
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#1B4332",
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 1 && (
              <div
                style={{
                  padding: "0 14px 10px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(q.value)}
                    style={{
                      background: "#F0FFF4",
                      border: "1px solid #A7F3D0",
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#1B4332",
                      cursor: "pointer",
                      fontFamily: "Nunito, sans-serif",
                    }}
                  >
                    {q.text}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Shop button */}
            {messages.length > 3 && (
              <div style={{ padding: "0 14px 8px" }}>
                <button
                  onClick={() => {
                    navigate("/products");
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Nunito, sans-serif",
                  }}
                >
                  Shop Fresh Ingredients →
                </button>
              </div>
            )}

            {/* Input */}
            <div
              style={{
                padding: "10px 14px 14px",
                borderTop: "1px solid #F3F4F6",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Chef Bems anything..."
                rows={1}
                style={{
                  flex: 1,
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  fontFamily: "Nunito, sans-serif",
                  lineHeight: 1.5,
                  maxHeight: 80,
                  overflowY: "auto",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1B4332")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    loading || !input.trim()
                      ? "#E5E7EB"
                      : "linear-gradient(135deg, #1B4332, #40916C)",
                  border: "none",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={loading || !input.trim() ? "#9CA3AF" : "white"}
                  strokeWidth="2.5"
                >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     d="M12 19V5m0 0l-7 7m7-7l7 7"
                  />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
