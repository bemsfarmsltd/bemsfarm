import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const N8N_WEBHOOK = "https://bfarms000.app.n8n.cloud/webhook/chef-bems";

const QUICK_PROMPTS = [
  { icon: "🍲", text: "What can I cook with garri and tomatoes?" },
  { icon: "🌾", text: "How do I make perfect Jollof rice?" },
  { icon: "🥗", text: "Healthy Nigerian meal plan for the week" },
  { icon: "🩺", text: "Foods good for managing diabetes?" },
  { icon: "🔄", text: "Substitute for palm oil in egusi soup?" },
  { icon: "👶", text: "Best Nigerian foods for toddlers?" },
];

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: `Welcome! I'm **Chef Bems** 👨‍🍳 — your personal Nigerian kitchen AI.\n\nI can help you with:\n• Recipes for any Nigerian dish\n• What to cook with ingredients you have\n• Healthy meal planning\n• Nutritional guidance\n• Cooking tips and substitutions\n\nWhat would you like to cook today?`,
  timestamp: new Date(),
};

const CSS = `
  .cb-container {
    max-width: 860px;
    margin: 0 auto;
    height: calc(100vh - 56px);
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .cb-header {
    border-radius: 0;
    padding: 14px 16px;
  }
  .cb-header h1 { font-size: 17px; }
  .cb-prompts { display: none; }
  .cb-input-area { padding: 10px 12px 12px; }

  @media (min-width: 640px) {
    .cb-container {
      padding: 20px 20px 0;
      height: calc(100vh - 100px);
    }
    .cb-header {
      border-radius: 20px 20px 0 0;
      padding: 20px 28px;
    }
    .cb-header h1 { font-size: 22px; }
    .cb-prompts { display: flex; }
    .cb-input-area { padding: 14px 20px 16px; }
  }

  @media (min-width: 1024px) {
    .cb-container { padding: 24px 24px 0; }
  }
`;

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChefBemsPage() {
  const { cartItems } = useCart();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      
      const userMsg = {
        id: Date.now() + "-u",
        role: "user",
        content: "📷 [Uploaded ingredient photo for visual scanning]",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      
      try {
        const payload = {
          image: base64Data,
          cartItems: cartItems
            .map((i) => i.product?.name || i.name)
            .filter(Boolean),
        };
        
        const res = await api.post("/ai/visual-scan", payload);
        const data = res.data;
        
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + "-a",
            role: "assistant",
            content: data.reply || "I analyzed your ingredients! Here is what I suggest.",
            timestamp: new Date(),
            relatedProducts: data.relatedProducts || [],
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + "-e",
            role: "assistant",
            content: "⚠️ Visual scanner is taking a break. Make sure your GEMINI_API_KEY is configured properly.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callN8n = async (payload) => {
    const res = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    return res.json();
  };

  const callExpress = async (payload) => {
    const res = await api.post("/ai/chef-chat", {
      message: payload.message,
      history: payload.conversationHistory,
      cartItems: payload.cartItems,
    });
    return res.data;
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = {
      id: Date.now() + "-u",
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const payload = {
        message: userText,
        conversationHistory: history,
        cartItems: cartItems
          .map((i) => i.product?.name || i.name)
          .filter(Boolean),
        userPreferences: JSON.parse(
          localStorage.getItem("bemsfarms_prefs") || "{}",
        ),
      };

      let data;
      try {
        data = await callN8n(payload);
      } catch {
        data = await callExpress(payload);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + "-a",
          role: "assistant",
          content: data.reply || "I didn't catch that — could you rephrase?",
          timestamp: new Date(),
          relatedProducts: data.relatedProducts || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + "-e",
          role: "assistant",
          content:
            "⚠️ Chef Bems is taking a short break. Try again in a moment.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const cartContext =
    cartItems.length > 0
      ? `(${cartItems.length} item${cartItems.length > 1 ? "s" : ""} in cart)`
      : "";

  return (
    <PageWrapper noFooter>
      <style>{CSS}</style>
      <div className="cb-container">
        {/* Header */}
        <div
          className="cb-header"
          style={{
            background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(245,159,11,0.4)",
            }}
          >
            👨‍🍳
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="cb-header"
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                color: "white",
                margin: 0,
                marginBottom: "2px",
              }}
            >
              Chef Bems
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#4CAF50",
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "12px",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                AI Kitchen Assistant {cartContext}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#FAFAF8",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  gap: "8px",
                  alignItems: "flex-end",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1B4332, #40916C)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    👨‍🍳
                  </div>
                )}
                <div style={{ maxWidth: "78%", minWidth: 0 }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius:
                        msg.role === "user"
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                      backgroundColor:
                        msg.role === "user"
                          ? "#1B4332"
                          : msg.isError
                            ? "#FEF2F2"
                            : "white",
                      color:
                        msg.role === "user"
                          ? "white"
                          : msg.isError
                            ? "#DC2626"
                            : "#111827",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                      border: msg.isError ? "1px solid #FECACA" : "none",
                      wordBreak: "break-word",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: formatMessage(msg.content),
                    }}
                  />
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#9CA3AF",
                      margin: "3px 0 0",
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {/* Related products from n8n */}
                  {msg.relatedProducts?.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        🛒 Available on BemsFarms:
                      </p>
                      {msg.relatedProducts.map((p, i) => (
                        <div
                          key={i}
                          onClick={() =>
                            (window.location.href = `/product/${p.id}`)
                          }
                          style={{
                            backgroundColor: "#F0FFF4",
                            border: "1px solid #BBF7D0",
                            borderRadius: "10px",
                            padding: "7px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1B4332",
                            }}
                          >
                            {p.name}
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#F59E0B",
                            }}
                          >
                            ₦{Number(p.price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: "#F59E0B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      flexShrink: 0,
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    U
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1B4332, #40916C)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                👨‍🍳
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "18px 18px 18px 4px",
                  padding: "12px 16px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                }}
              >
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "#1B4332",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — desktop only */}
        {messages.length <= 1 && (
          <div
            className="cb-prompts"
            style={{
              backgroundColor: "white",
              padding: "10px 16px",
              borderTop: "1px solid #F0F0EE",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: "7px",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "#9CA3AF",
                fontWeight: 600,
                width: "100%",
                margin: "0 0 6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Quick questions
            </p>
            {QUICK_PROMPTS.map((p) => (
              <motion.button
                key={p.text}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => sendMessage(p.text)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 13px",
                  borderRadius: "50px",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F8FAFB",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#4B5563",
                  fontFamily: "Nunito, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{p.icon}</span>
                {p.text.length > 28 ? p.text.slice(0, 28) + "…" : p.text}
              </motion.button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="cb-input-area"
          style={{
            backgroundColor: "white",
            borderTop: "1px solid #F0F0EE",
            flexShrink: 0,
            boxShadow: "0 -2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              backgroundColor: "#F8FAFB",
              borderRadius: "14px",
              border: "1.5px solid #E5E7EB",
              padding: "7px 7px 7px 14px",
            }}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            <motion.button
              whileHover={{ scale: !loading ? 1.05 : 1 }}
              whileTap={{ scale: !loading ? 0.95 : 1 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Upload ingredient photo"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#E5E7EB",
                border: "none",
                cursor: !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              📷
            </motion.button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Chef Bems anything about Nigerian cooking..."
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                fontSize: "14px",
                fontFamily: "Nunito, sans-serif",
                resize: "none",
                lineHeight: 1.5,
                maxHeight: "100px",
                overflow: "auto",
                color: "#111827",
              }}
            />
            <motion.button
              whileHover={{ scale: input.trim() && !loading ? 1.05 : 1 }}
              whileTap={{ scale: input.trim() && !loading ? 0.95 : 1 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor:
                  input.trim() && !loading ? "#1B4332" : "#E5E7EB",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳" : "↑"}
            </motion.button>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "10px",
              color: "#D1D5DB",
              marginTop: "6px",
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
