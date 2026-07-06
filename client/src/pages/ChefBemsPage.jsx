import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const N8N_WEBHOOK = "https://bfarms000.app.n8n.cloud/webhook/chef-bems";

const PERSONAS = {
  "chef-bems": {
    id: "chef-bems",
    name: "Chef Bems",
    title: "AI Kitchen Assistant",
    avatar: "👨‍🍳",
    status: "Active Online",
    lastSeen: "Online now",
    description: "Friendly expert in Nigerian culinary heritage & recipes.",
    welcome: `Welcome! I'm **Chef Bems** 👨‍🍳 — your personal Nigerian kitchen AI.\n\nI can help you with:\n• Recipes for any Nigerian dish\n• What to cook with ingredients you have\n• Healthy meal planning\n• Cooking tips and substitutions\n\nWhat would you like to cook today?`
  },
  "meal-planner": {
    id: "meal-planner",
    name: "Meal Planner",
    title: "AI Dietary Advisor",
    avatar: "🥗",
    status: "Online",
    lastSeen: "Active 5m ago",
    description: "Personalized advice for health goals, keto, diabetic diets.",
    welcome: `Hello! I'm your **Healthy Meal Planner** 🥗.\n\nTell me about your health goals, allergies, or dietary preferences:\n• Low-carb / Keto options\n• Diabetic-friendly Nigerian meals\n• High-protein muscle building diets\n• Hypertension or low-sodium ideas\n\nWhat are your dietary goals today?`
  },
  "visual-scanner": {
    id: "visual-scanner",
    name: "Visual Scanner",
    title: "AI Ingredient Scanner",
    avatar: "📷",
    status: "Online",
    lastSeen: "Ready to scan",
    description: "Upload photos of ingredients to instantly get dish ideas.",
    welcome: `Hey! I'm the **Visual Scanner** 📷.\n\nClick the 📷 icon in the chat input to upload a photo of ingredients in your kitchen. I will visually scan them and suggest recipes you can make right away!`
  },
  "support": {
    id: "support",
    name: "Support Desk",
    title: "Customer Support",
    avatar: "🤝",
    status: "Away (AI Powered)",
    lastSeen: "Replies instantly",
    description: "AI support for orders, delivery status, and payments.",
    welcome: `Hello! I'm the **Bems Farms Support Assistant** 🤝.\n\nHow can I help you today?\n• Track an existing order\n• Inquire about delivery zones or rates\n• Apply discount codes or refund queries\n• Ask about our farmers or sourcing`
  }
};

const QUICK_PROMPTS = [
  { icon: "🍲", text: "What can I cook with garri and tomatoes?" },
  { icon: "🌾", text: "How do I make perfect Jollof rice?" },
  { icon: "🥗", text: "Healthy Nigerian meal plan for the week" },
  { icon: "🔄", text: "Substitute for palm oil in egusi soup?" },
];

const MOCK_BACKUP_PRODUCTS = [
  { id: 1, name: "Ofada Rice", price: 4500, unit: "1kg", description: "Local premium unpolished rice" },
  { id: 2, name: "Palm Oil", price: 3200, unit: "1 Liter", description: "Pure organic palm oil" },
  { id: 3, name: "Fresh Tomatoes", price: 1500, unit: "1 Basket", description: "Red ripe farm fresh tomatoes" },
  { id: 4, name: "Yellow Garri", price: 2000, unit: "1 Painter", description: "Premium yellow garri from Bendel" }
];

const KITCHEN_ALERTS = [
  { id: 1, type: "alert", title: "Fresh Tomatoes in Stock!", time: "1 hour ago", text: "Fresh basket tomatoes just arrived from the northern farms. Order now before stock runs out." },
  { id: 2, type: "tip", title: "Chef's Jollof Secret", time: "3 hours ago", text: "Adding a tiny touch of ginger and scent leaf at the very end enhances the Jollof smoky aroma!" },
  { id: 3, type: "offer", title: "Get 10% Discount", time: "Yesterday", text: "Use discount code BEMS10 at checkout to save 10% on your fresh greens." }
];

// Helper to format messages with bolding and line breaks
function formatMessage(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChefBemsPage() {
  const { cartItems, addToCart } = useCart();
  const [activePersona, setActivePersona] = useState("chef-bems");
  
  // Keep separate chat logs for each persona
  const [conversations, setConversations] = useState({
    "chef-bems": [
      {
        id: "welcome-chef",
        role: "assistant",
        content: PERSONAS["chef-bems"].welcome,
        timestamp: new Date()
      }
    ],
    "meal-planner": [
      {
        id: "welcome-planner",
        role: "assistant",
        content: PERSONAS["meal-planner"].welcome,
        timestamp: new Date()
      }
    ],
    "visual-scanner": [
      {
        id: "welcome-scanner",
        role: "assistant",
        content: PERSONAS["visual-scanner"].welcome,
        timestamp: new Date()
      }
    ],
    "support": [
      {
        id: "welcome-support",
        role: "assistant",
        content: PERSONAS["support"].welcome,
        timestamp: new Date()
      }
    ]
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Real database suggestions
  const [suggestedProducts, setSuggestedProducts] = useState(MOCK_BACKUP_PRODUCTS);
  const [addedIds, setAddedIds] = useState({});

  // Mobile drawers states
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load products from backend catalog
  useEffect(() => {
    api.get("/products")
      .then((res) => {
        const prodList = res.data?.products || [];
        if (prodList.length > 0) {
          // Shuffle or select 4 products
          setSuggestedProducts(prodList.slice(0, 4));
        }
      })
      .catch((err) => {
        console.warn("ChefBemsPage: API get products failed, using mock fallbacks", err);
      });
  }, []);

  // Scroll active chat container to bottom when messages update or persona changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activePersona]);

  // Handle visual image scanning
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
        image: base64Data, // Save base64 image data to render inline
        timestamp: new Date(),
      };
      
      setConversations((prev) => ({
        ...prev,
        [activePersona]: [...(prev[activePersona] || []), userMsg]
      }));
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
        
        const assistantMsg = {
          id: Date.now() + "-a",
          role: "assistant",
          content: data.reply || "I analyzed your ingredients! Here is what I suggest.",
          timestamp: new Date(),
          relatedProducts: data.relatedProducts || [],
        };
        
        setConversations((prev) => ({
          ...prev,
          [activePersona]: [...(prev[activePersona] || []), assistantMsg]
        }));
      } catch (err) {
        const errMsg = {
          id: Date.now() + "-e",
          role: "assistant",
          content: "⚠️ Visual scanner is taking a break. Make sure your GEMINI_API_KEY is configured properly.",
          timestamp: new Date(),
          isError: true,
        };
        setConversations((prev) => ({
          ...prev,
          [activePersona]: [...(prev[activePersona] || []), errMsg]
        }));
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

    setConversations((prev) => ({
      ...prev,
      [activePersona]: [...(prev[activePersona] || []), userMsg]
    }));
    setLoading(true);

    try {
      const activeThread = conversations[activePersona] || [];
      const history = activeThread
        .filter((m) => !m.id?.startsWith("welcome"))
        .map((m) => ({ role: m.role, content: m.content }));

      // Formulate persona system directives to pass to LLM back-end
      let directedMessage = userText;
      if (activePersona === "meal-planner") {
        directedMessage = `[System Directive: Act as the Healthy Meal Planner AI. Tailor suggestions to Nigerian health nutrition] ${userText}`;
      } else if (activePersona === "support") {
        directedMessage = `[System Directive: Act as BemsFarms Customer Support AI. Help with orders, coupons, zones] ${userText}`;
      } else if (activePersona === "visual-scanner") {
        directedMessage = `[System Directive: Focus on scanning ingredients and recommending recipes] ${userText}`;
      }

      const payload = {
        message: directedMessage,
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

      const replyMsg = {
        id: Date.now() + "-a",
        role: "assistant",
        content: data.reply || "I didn't catch that — could you rephrase?",
        timestamp: new Date(),
        relatedProducts: data.relatedProducts || [],
      };

      setConversations((prev) => ({
        ...prev,
        [activePersona]: [...(prev[activePersona] || []), replyMsg]
      }));
    } catch (err) {
      const errMsg = {
        id: Date.now() + "-e",
        role: "assistant",
        content: "⚠️ Chef Bems is taking a short break. Try again in a moment.",
        timestamp: new Date(),
        isError: true,
      };
      setConversations((prev) => ({
        ...prev,
        [activePersona]: [...(prev[activePersona] || []), errMsg]
      }));
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

  const currentMessages = conversations[activePersona] || [];
  const currentPersona = PERSONAS[activePersona];

  return (
    <PageWrapper noFooter>
      {/* ── Page CSS ── */}
      <style>{`
        .chat-app-wrapper {
          width: 100%;
          background-color: #05130E;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: 'Nunito', sans-serif;
          height: calc(100vh - 72px);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .chat-app-wrapper {
            height: calc(100vh - 56px);
          }
        }
        
        .chat-subheader {
          height: 48px;
          background-color: #0B251A;
          border-bottom: 1px solid #1f4e3c;
          display: flex;
          align-items: center;
          padding: 0 16px;
          overflow-x: auto;
          gap: 24px;
          flex-shrink: 0;
        }
        .chat-subheader-tab {
          font-size: 13px;
          font-weight: 600;
          color: #9CA3AF;
          background: none;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .chat-subheader-tab:hover {
          color: #ffffff;
        }
        .chat-subheader-tab.active {
          color: #F59E0B;
          border-bottom: 2px solid #F59E0B;
          height: 100%;
          padding-top: 2px;
        }

        .chat-layout-body {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        /* Column 1: Left Sidebar */
        .chat-col-left {
          width: 300px;
          background-color: #0B251A;
          border-right: 1px solid #1f4e3c;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: transform 0.3s ease;
          z-index: 10;
        }
        @media (max-width: 768px) {
          .chat-col-left {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 10px 0 20px rgba(0,0,0,0.5);
          }
          .chat-col-left.open {
            transform: translateX(0);
          }
        }

        /* Column 2: Center Viewport */
        .chat-col-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #05130E;
          height: 100%;
          position: relative;
        }

        /* Column 3: Right Sidebar */
        .chat-col-right {
          width: 320px;
          background-color: #0B251A;
          border-left: 1px solid #1f4e3c;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow-y: auto;
          padding: 20px;
          gap: 24px;
          transition: transform 0.3s ease;
          z-index: 10;
        }
        @media (max-width: 1024px) {
          .chat-col-right {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            transform: translateX(100%);
            box-shadow: -10px 0 20px rgba(0,0,0,0.5);
          }
          .chat-col-right.open {
            transform: translateX(0);
          }
        }

        .chat-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0,0,0,0.6);
          z-index: 9;
        }

        /* Search input styling */
        .chat-search-wrap {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .chat-search-box {
          background-color: #16382C;
          border: 1px solid #1f4e3c;
          border-radius: 8px;
          display: flex;
          align-items: center;
          padding: 6px 12px;
          width: 100%;
        }
        .chat-search-input {
          background: none;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 13px;
          margin-left: 8px;
          flex: 1;
        }
        .chat-search-input::placeholder {
          color: #9CA3AF;
        }

        /* Direct/Group pills */
        .chat-pills-row {
          display: flex;
          padding: 10px 14px;
          gap: 6px;
        }
        .chat-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 50px;
          background-color: #16382C;
          color: #9CA3AF;
          border: none;
          cursor: pointer;
        }
        .chat-pill.active {
          background-color: #F59E0B;
          color: #05130E;
        }

        /* Thread Items */
        .thread-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .thread-item:hover {
          background-color: rgba(255,255,255,0.02);
        }
        .thread-item.active {
          background-color: #1B4332;
          border-left: 3px solid #F59E0B;
        }

        /* Message bubbles */
        .msg-bubble-ai {
          background-color: #16382C;
          border-radius: 18px 18px 18px 4px;
          padding: 12px 16px;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .msg-bubble-user {
          background-color: #F59E0B;
          border-radius: 18px 18px 4px 18px;
          padding: 12px 16px;
          color: #05130E;
          box-shadow: 0 4px 12px rgba(245,158,11,0.2);
        }

        /* SVG Icons */
        .svg-icon {
          width: 18px;
          height: 18px;
          fill: currentColor;
          display: inline-block;
        }
      `}</style>

      <div className="chat-app-wrapper">
        {/* ── Subheader Navigation Tabs ── */}
        <div className="chat-subheader">
          <button className="chat-subheader-tab" onClick={() => (window.location.href = "/home")}>
            <svg className="svg-icon" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Dashboard
          </button>
          <button className="chat-subheader-tab active">
            <svg className="svg-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            Chef Chat
          </button>
          <button className="chat-subheader-tab" onClick={() => (window.location.href = "/products")}>
            <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.17 19.58 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
            Recipes
          </button>
          <button className="chat-subheader-tab" onClick={() => setActivePersona("meal-planner")}>
            <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
            Meal Planner
          </button>
          <button className="chat-subheader-tab" onClick={() => (window.location.href = "/products")}>
            <svg className="svg-icon" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
            Ingredients
          </button>
        </div>

        <div className="chat-layout-body">
          {/* ── Drawers Backdrop (Under Mobile Sizes) ── */}
          {(mobileSidebarOpen || mobileInfoOpen) && (
            <div 
              className="chat-overlay" 
              onClick={() => {
                setMobileSidebarOpen(false);
                setMobileInfoOpen(false);
              }}
            />
          )}

          {/* ── Column 1: AI Personas / Channels Sidebar ── */}
          <div className={`chat-col-left ${mobileSidebarOpen ? "open" : ""}`}>
            {/* Top row of utility icons */}
            <div style={{ display: "flex", padding: "14px 16px", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "16px", color: "#9CA3AF" }}>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Chats">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </button>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Call logs">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </button>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Mail inbox">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </button>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Groups">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 3.66 5 2s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                </button>
              </div>
              <div 
                style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F59E0B", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color: "#05130E" }}
                title="User Profile"
              >
                U
              </div>
            </div>

            {/* Chat directory title & search */}
            <div className="chat-search-wrap">
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 10px", fontFamily: "Space Grotesk, sans-serif" }}>Chats</h2>
              <div className="chat-search-box">
                <svg style={{ width: "16px", height: "16px", fill: "#9CA3AF" }} viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" className="chat-search-input" placeholder="Search AI channels..." />
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="chat-pills-row">
              <button className="chat-pill active">Direct</button>
              <button className="chat-pill">Group</button>
              <button className="chat-pill">Public</button>
            </div>

            {/* Persona Threads Directory */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {Object.values(PERSONAS).map((persona) => {
                const isActive = activePersona === persona.id;
                const lastMsgList = conversations[persona.id] || [];
                const lastMsg = lastMsgList[lastMsgList.length - 1];
                
                return (
                  <button
                    key={persona.id}
                    className={`thread-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActivePersona(persona.id);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <div style={{ 
                      width: "42px", height: "42px", borderRadius: "50%", 
                      background: "linear-gradient(135deg, #1B4332, #40916C)", 
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: "20px", flexShrink: 0 
                    }}>
                      {persona.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff" }}>{persona.name}</span>
                        <span style={{ fontSize: "10px", color: "#9CA3AF" }}>10:00pm</span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lastMsg ? lastMsg.content : persona.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Column 2: Chat Viewport Panel ── */}
          <div className="chat-col-center">
            {/* Viewport Header */}
            <div style={{ 
              height: "64px", borderBottom: "1px solid #1f4e3c", backgroundColor: "#0B251A", 
              padding: "0 16px", display: "flex", alignItems: "center", justifyItems: "center", 
              justifyContent: "space-between", flexShrink: 0 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                {/* Mobile hamburger to toggle Left Sidebar */}
                <button 
                  style={{ background: "none", border: "none", color: "#ffffff", padding: "8px", cursor: "pointer", display: "none" }}
                  className="mobile-hamburger-btn"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                </button>
                <style>{`
                  @media (max-width: 768px) {
                    .mobile-hamburger-btn { display: block !important; }
                  }
                `}</style>
                <div style={{ 
                  width: "40px", height: "40px", borderRadius: "50%", 
                  background: "linear-gradient(135deg, #F59E0B, #D97706)", 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  fontSize: "18px", flexShrink: 0 
                }}>
                  {currentPersona.avatar}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, color: "#ffffff" }}>{currentPersona.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                    <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{currentPersona.status}</span>
                  </div>
                </div>
              </div>

              {/* Call logs, camera, video menu icons */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#9CA3AF" }}>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Voice call">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.57c-2.83-1.44-5.15-3.75-6.59-6.59l1.57-1.57c.27-.27.35-.65.24-1.01-.36-1.11-.56-2.3-.56-3.53 0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
                </button>
                <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} title="Video call">
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </button>
                
                {/* Info button triggers column 3 on smaller viewport */}
                <button 
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }} 
                  onClick={() => setMobileInfoOpen(true)}
                  title="Context Panel"
                >
                  <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </button>
              </div>
            </div>

            {/* Chat Log Viewport */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {currentMessages.map((msg) => {
                const isAI = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: isAI ? "row" : "row-reverse",
                      gap: "12px",
                      alignItems: "flex-end",
                      maxWidth: "85%",
                      alignSelf: isAI ? "flex-start" : "flex-end"
                    }}
                  >
                    {/* Avatar display */}
                    <div style={{ 
                      width: "32px", height: "32px", borderRadius: "50%", 
                      background: isAI ? "linear-gradient(135deg, #1B4332, #40916C)" : "#F59E0B",
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: "14px", flexShrink: 0, fontWeight: "bold",
                      color: isAI ? "#ffffff" : "#05130E"
                    }}>
                      {isAI ? currentPersona.avatar : "U"}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px", textAlign: isAI ? "left" : "right" }}>
                        {isAI ? currentPersona.name : "You"} · {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>

                      {/* Bubble block */}
                      <div className={isAI ? "msg-bubble-ai" : "msg-bubble-user"}>
                        <div 
                          style={{ fontSize: "13.5px", lineHeight: 1.5, wordBreak: "break-word" }}
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />

                        {/* Inline visual scan image preview */}
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Visual Scan" 
                            style={{ 
                              maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", 
                              marginTop: "8px", display: "block", objectFit: "cover",
                              border: "2px solid rgba(255,255,255,0.2)"
                            }}
                          />
                        )}
                      </div>

                      {/* Related products recommendation cards */}
                      {isAI && msg.relatedProducts?.length > 0 && (
                        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#F59E0B" }}>🛒 Ingredients in this recipe:</span>
                          {msg.relatedProducts.map((p, idx) => (
                            <div 
                              key={idx}
                              style={{ 
                                backgroundColor: "#0B251A", border: "1px solid #1f4e3c", borderRadius: "8px", 
                                padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center"
                              }}
                            >
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#ffffff" }}>{p.name}</div>
                                <div style={{ fontSize: "11px", color: "#9CA3AF" }}>₦{Number(p.price).toLocaleString()}</div>
                              </div>
                              <button
                                onClick={(e) => handleAddProduct(e, p)}
                                style={{ 
                                  background: addedIds[p.id] ? "#10B981" : "#F59E0B", 
                                  color: addedIds[p.id] ? "#ffffff" : "#05130E",
                                  border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", 
                                  fontWeight: "bold", cursor: "pointer"
                                }}
                              >
                                {addedIds[p.id] ? "✓ Added" : "Add to Cart"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicator */}
              {loading && (
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", maxWidth: "80%" }}>
                  <div style={{ 
                    width: "32px", height: "32px", borderRadius: "50%", 
                    background: "linear-gradient(135deg, #1B4332, #40916C)", 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    fontSize: "14px", flexShrink: 0 
                  }}>
                    {currentPersona.avatar}
                  </div>
                  <div className="msg-bubble-ai" style={{ display: "flex", gap: "4px", alignItems: "center", padding: "10px 14px" }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                        style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#F59E0B" }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Bottom Input Area */}
            <div style={{ padding: "14px", borderTop: "1px solid #1f4e3c", backgroundColor: "#0B251A", flexShrink: 0 }}>
              {/* Quick Prompt Suggestions Row */}
              {currentMessages.length <= 1 && (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", margin: "0 0 8px" }} className="hide-scrollbar">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(p.text)}
                      style={{ 
                        display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", 
                        borderRadius: "50px", border: "1px solid #1f4e3c", backgroundColor: "#16382C", 
                        color: "#ffffff", fontSize: "11.5px", cursor: "pointer", whiteSpace: "nowrap"
                      }}
                    >
                      <span>{p.icon}</span>
                      {p.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Textbox Container */}
              <div style={{ 
                backgroundColor: "#05130E", border: "1px solid #1f4e3c", borderRadius: "12px", 
                padding: "8px 12px", display: "flex", alignItems: "flex-end", gap: "8px" 
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Send message to ${currentPersona.name}...`}
                  rows={1}
                  disabled={loading}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none", 
                    color: "#ffffff", fontSize: "13.5px", resize: "none", lineHeight: 1.5, 
                    maxHeight: "90px", minHeight: "24px"
                  }}
                />
                
                {/* Visual Image Uploader hook */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  style={{ display: "none" }} 
                />

                {/* Attachment/Utility bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#9CA3AF" }}>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={loading} 
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
                    title="Upload visual scan"
                  >
                    <svg className="svg-icon" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={loading} 
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
                    title="Camera Visual Scan"
                  >
                    <svg className="svg-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </button>
                  <button 
                    onClick={() => sendMessage()} 
                    disabled={!input.trim() || loading}
                    style={{ 
                      width: "32px", height: "32px", borderRadius: "50%", 
                      background: input.trim() && !loading ? "#F59E0B" : "#16382C",
                      color: input.trim() && !loading ? "#05130E" : "#9CA3AF",
                      border: "none", display: "flex", alignItems: "center", justifyContent: "center", 
                      cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.2s"
                    }}
                  >
                    <svg style={{ width: "16px", height: "16px", fill: "currentColor" }} viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Column 3: Context Panel Sidebar ── */}
          <div className={`chat-col-right ${mobileInfoOpen ? "open" : ""}`}>
            {/* Header info close for mobile */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>Info & Alerts</h3>
              <button 
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", display: "none" }} 
                className="mobile-close-btn"
                onClick={() => setMobileInfoOpen(false)}
              >
                ✕
              </button>
              <style>{`
                @media (max-width: 1024px) {
                  .mobile-close-btn { display: block !important; }
                }
              `}</style>
            </div>

            {/* Notification Section */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#9CA3AF", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px" }}>Notifications</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {KITCHEN_ALERTS.map((alert) => (
                  <div 
                    key={alert.id} 
                    style={{ 
                      padding: "12px", borderRadius: "10px", backgroundColor: "#16382C", 
                      border: "1px solid #1f4e3c" 
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#F59E0B" }}>{alert.title}</span>
                      <span style={{ fontSize: "9px", color: "#9CA3AF" }}>{alert.time}</span>
                    </div>
                    <p style={{ fontSize: "11.5px", color: "#ffffff", margin: 0, lineHeight: 1.4 }}>{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Suggestions Section */}
            <div style={{ marginTop: "10px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#9CA3AF", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px" }}>Suggestions</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {suggestedProducts.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => (window.location.href = `/product/${p.id}`)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: "10px", padding: "10px", 
                      borderRadius: "10px", backgroundColor: "#16382C", border: "1px solid #1f4e3c", 
                      cursor: "pointer", transition: "background-color 0.2s" 
                    }}
                    className="suggestion-card"
                  >
                    <style>{`
                      .suggestion-card:hover {
                        background-color: #1B4332 !important;
                      }
                    `}</style>
                    <div style={{ 
                      width: "36px", height: "36px", borderRadius: "6px", backgroundColor: "#05130E", 
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 
                    }}>
                      🌾
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: "#F59E0B", fontWeight: "bold" }}>₦{Number(p.price).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={(e) => handleAddProduct(e, p)}
                      style={{ 
                        background: addedIds[p.id] ? "#10B981" : "#F59E0B", 
                        color: addedIds[p.id] ? "#ffffff" : "#05130E",
                        border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "10px", 
                        fontWeight: "bold", cursor: "pointer", flexShrink: 0
                      }}
                    >
                      {addedIds[p.id] ? "✓" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
