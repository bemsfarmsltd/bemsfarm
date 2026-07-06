import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import chefBemsImg from "../assets/chef_bems_cooking.jpg";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";

const N8N_WEBHOOK = "https://bfarms000.app.n8n.cloud/webhook/chef-bems";

const QUICK_PROMPTS = [
  { icon: "🍲", text: "What can I cook with garri and tomatoes?" },
  { icon: "🌾", text: "How do I make perfect Jollof rice?" },
  { icon: "🥗", text: "Healthy Nigerian meal plan for the week" },
  { icon: "🔄", text: "Substitute for palm oil in egusi soup?" },
];

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: `Welcome! I'm **Chef Bems** 👨‍🍳 — your personal Nigerian kitchen AI.\n\nI can help you with:\n• Recipes for any Nigerian dish\n• What to cook with ingredients you have\n• Healthy meal planning\n• Cooking tips and substitutions\n\nWhat would you like to cook today?`,
  timestamp: new Date(),
};

// Helper to format bolding and line breaks in messages
function formatMessage(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChefBemsPage() {
  const { cartItems, addToCart } = useCart();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState({});

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Visual scan image upload
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
        image: base64Data, // Save base64 image inline
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
          content: "⚠️ Chef Bems is taking a short break. Try again in a moment.",
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

  const handleAddProduct = (e, product) => {
    e.stopPropagation();
    addToCart(product);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => {
        const n = { ...prev };
        delete n[product.id];
        return n;
      });
    }, 1500);
  };

  return (
    <PageWrapper noFooter>
      {/* ── Page Styles ── */}
      <style>{`
        .chef-page-wrapper {
          background-color: #F8FAFC;
          min-height: calc(100vh - 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          font-family: 'Nunito', sans-serif;
        }
        @media (max-width: 768px) {
          .chef-page-wrapper {
            padding: 0;
            min-height: calc(100vh - 56px);
          }
        }

        .chef-chat-card {
          width: 100%;
          max-width: 800px;
          height: calc(100vh - 120px);
          background-color: #ffffff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .chef-chat-card {
            height: calc(100vh - 56px);
            border-radius: 0;
            border: none;
          }
        }

        .chef-chat-header {
          background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          color: #ffffff;
        }

        .chef-chat-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(27,67,50,0.25);
          overflow: hidden;
          border: 1.5px solid #F59E0B;
        }

        .chef-chat-body {
          flex: 1;
          overflow-y: auto;
          background-color: #FAFAF9;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chef-hero-banner {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #E5E7EB;
          background-color: #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          margin-bottom: 8px;
        }
        .chef-hero-img {
          width: 100%;
          height: 240px;
          object-fit: cover;
          display: block;
        }
        @media (max-width: 640px) {
          .chef-hero-img {
            height: 160px;
          }
        }

        .msg-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          max-width: 85%;
        }
        .msg-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .msg-row.assistant {
          align-self: flex-start;
        }

        .msg-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
        }
        .msg-avatar.ai {
          background: #ffffff;
          border: 1px solid #1B4332;
        }
        .msg-avatar.user {
          background: #F59E0B;
          color: #05130E;
        }

        .msg-content-wrapper {
          display: flex;
          flex-direction: column;
        }

        .msg-bubble {
          padding: 12px 16px;
          font-size: 14.5px;
          line-height: 1.5;
          word-break: break-word;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }
        .msg-row.assistant .msg-bubble {
          background-color: #ffffff;
          border: 1px solid #E5E7EB;
          color: #1F2937;
          border-radius: 18px 18px 18px 4px;
        }
        .msg-row.assistant.error .msg-bubble {
          background-color: #FEF2F2;
          border-color: #FCA5A5;
          color: #991B1B;
        }
        .msg-row.user .msg-bubble {
          background-color: #1B4332;
          color: #ffffff;
          border-radius: 18px 18px 4px 18px;
        }

        .chef-chat-footer {
          padding: 14px 20px;
          background-color: #ffffff;
          border-top: 1px solid #E5E7EB;
          flex-shrink: 0;
        }

        .input-bar-container {
          background-color: #F9FAFB;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .input-bar-container:focus-within {
          border-color: #1B4332;
        }

        .chat-textarea {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: #1F2937;
          font-size: 14px;
          resize: none;
          line-height: 1.5;
          max-height: 90px;
          min-height: 24px;
          font-family: inherit;
        }
        .chat-textarea::placeholder {
          color: #9CA3AF;
        }

        .btn-attachment {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .btn-attachment:hover {
          color: #1B4332;
        }

        .btn-send {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-send.active {
          background-color: #1B4332;
          color: #ffffff;
          cursor: pointer;
        }
        .btn-send.inactive {
          background-color: #F3F4F6;
          color: #9CA3AF;
          cursor: not-allowed;
        }

        .svg-icon {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
      `}</style>

      <div className="chef-page-wrapper">
        <div className="chef-chat-card">
          {/* Header */}
          <div className="chef-chat-header">
            <div className="chef-chat-avatar">
              <img 
                src={chefBemsAvatar} 
                alt="Chef Bems Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>Chef Bems</h1>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>AI Kitchen Assistant · Online</span>
              </div>
            </div>
          </div>

          {/* Messages view */}
          <div className="chef-chat-body">
            {/* Chef Bems Cooking Illustration Hero Section */}
            <div className="chef-hero-banner">
              <img 
                src={chefBemsImg} 
                className="chef-hero-img" 
                alt="Chef Bems Kitchen Illustration" 
              />
              <div style={{ padding: "16px 20px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1B4332", margin: "0 0 6px", fontFamily: "Space Grotesk, sans-serif" }}>
                  Meet Chef Bems 👨‍🍳
                </h2>
                <p style={{ fontSize: "13px", color: "#4B5563", lineHeight: 1.5, margin: 0 }}>
                  I'm your AI guide for fresh farm recipes, meal prep, and smart ingredient swaps. Ask me how to cook any Nigerian dish or get recommendations based on what you have!
                </p>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isAI = msg.role === "assistant";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`msg-row ${isAI ? "assistant" : "user"} ${msg.isError ? "error" : ""}`}
                  >
                    <div className={`msg-avatar ${isAI ? "ai" : "user"}`}>
                      {isAI ? (
                        <img 
                          src={chefBemsAvatar} 
                          alt="Chef Bems Avatar" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      ) : (
                        "U"
                      )}
                    </div>
                    <div className="msg-content-wrapper">
                      <div className="msg-bubble">
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                        
                        {/* Inline visual scan image preview */}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Visual Scan"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "220px",
                              borderRadius: "8px",
                              marginTop: "8px",
                              display: "block",
                              objectFit: "cover",
                              border: "1px solid rgba(0,0,0,0.1)"
                            }}
                          />
                        )}
                      </div>

                      {/* Interactive recipe ingredients suggestions */}
                      {isAI && msg.relatedProducts?.length > 0 && (
                        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#F59E0B" }}>🛒 Ingredients available on BemsFarms:</span>
                          {msg.relatedProducts.map((p, idx) => (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #E5E7EB",
                                borderRadius: "8px",
                                padding: "8px 12px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                <div style={{ fontSize: "11px", color: "#6B7280" }}>₦{Number(p.price).toLocaleString()}</div>
                              </div>
                              <button
                                onClick={(e) => handleAddProduct(e, p)}
                                style={{
                                  background: addedIds[p.id] ? "#10B981" : "#1B4332",
                                  color: "#ffffff",
                                  border: "none",
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  flexShrink: 0
                                }}
                              >
                                {addedIds[p.id] ? "✓ Added" : "Add to Cart"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing status */}
            {loading && (
              <div className="msg-row assistant">
                <div className="msg-avatar ai">
                  <img 
                    src={chefBemsAvatar} 
                    alt="Chef Bems Avatar" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                </div>
                <div className="msg-bubble" style={{ display: "flex", gap: "4px", alignItems: "center", padding: "10px 14px", backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "18px 18px 18px 4px" }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay }}
                      style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1B4332" }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Footer / Input area */}
          <div className="chef-chat-footer">
            {/* Quick Suggestions (shown when only welcome message is visible) */}
            {messages.length <= 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "8px" }} className="hide-scrollbar">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(p.text)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "50px",
                      border: "1px solid #E5E7EB",
                      backgroundColor: "#ffffff",
                      color: "#4B5563",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span>{p.icon}</span>
                    {p.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input wrap */}
            <div className="input-bar-container">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />

              {/* Upload trigger */}
              <button
                className="btn-attachment"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Visual Scan (Upload ingredients photo)"
              >
                <svg className="svg-icon" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Chef Bems anything about cooking Nigerian meals..."
                rows={1}
                disabled={loading}
                className="chat-textarea"
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className={`btn-send ${input.trim() && !loading ? "active" : "inactive"}`}
              >
                {loading ? (
                  <span style={{ fontSize: "12px" }}>⏳</span>
                ) : (
                  <svg style={{ width: "16px", height: "16px", fill: "currentColor" }} viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: "10px", color: "#9CA3AF", marginTop: "6px", marginBottom: 0 }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
