import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useChefStore } from "../store/useChefStore";
import api from "../services/api";
import chefBemsImg from "../assets/chef_bems_cooking.jpg";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";

const QUICK_PROMPTS = [
  { icon: "🍲", text: "What can I cook with garri and tomatoes?" },
  { icon: "🌾", text: "How do I make perfect Jollof rice?" },
  { icon: "🥗", text: "Healthy Nigerian meal plan for the week" },
  { icon: "🔄", text: "Substitute for palm oil in egusi soup?" },
];

function formatMessage(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChefBemsPage() {
  const { cartItems, addToCart } = useCart();
  const { user } = useAuth();
  const { 
    messages, 
    sessionId, 
    activeConversationId, 
    conversations, 
    addMessage, 
    setMessages, 
    setConversations, 
    updateConversationTitle, 
    removeConversation, 
    clearChat 
  } = useChefStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Responsive Sidebar toggle on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch initial conversations list for logged in users
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setConversations([]);
        return;
      }
      try {
        const res = await api.get("/ai/context/conversations?bot_type=chef&limit=50");
        const list = res.data.conversations || [];
        setConversations(list);
        
        // Auto load latest active conversation if we have past sessions
        if (list.length > 0 && !activeConversationId) {
          handleSelectConversation(list[0]);
        }
      } catch (err) {
        console.warn("Failed to load initial conversations:", err);
      }
    };
    fetchHistory();
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = async (conv) => {
    try {
      setLoading(true);
      const res = await api.get(`/ai/context/conversations/${conv.id}`);
      const serverMsgs = res.data.messages || [];
      const formatted = serverMsgs.map((m) => ({
        id: m.id || (Date.now() + "-" + Math.random()),
        role: m.role,
        content: m.content,
        timestamp: m.created_at || new Date(),
      }));
      
      setMessages(formatted);
      useChefStore.setState({
        sessionId: conv.session_id,
        activeConversationId: conv.id,
      });

      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    } catch (err) {
      console.warn("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = () => {
    clearChat();
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat thread?")) return;
    try {
      await api.delete(`/ai/context/conversations/${convId}`);
      removeConversation(convId);
    } catch (err) {
      console.warn("Failed to delete conversation:", err);
    }
  };

  const handleStartEditing = (e, conv) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitleInput(conv.title || "Untitled Conversation");
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    if (!editTitleInput.trim()) return;
    try {
      await api.patch(`/ai/context/conversations/${convId}`, { title: editTitleInput.trim() });
      updateConversationTitle(convId, editTitleInput.trim());
      setEditingConvId(null);
    } catch (err) {
      console.warn("Failed to rename conversation:", err);
    }
  };

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
        image: base64Data,
        timestamp: new Date().toISOString(),
      };
      
      addMessage(userMsg);
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
        
        addMessage({
          id: Date.now() + "-a",
          role: "assistant",
          content: data.reply || "I analyzed your ingredients! Here is what I suggest.",
          timestamp: new Date().toISOString(),
          relatedProducts: data.relatedProducts || [],
        });
      } catch (err) {
        addMessage({
          id: Date.now() + "-e",
          role: "assistant",
          content: "⚠️ Visual scanner is taking a break. Make sure your GEMINI_API_KEY is configured properly.",
          timestamp: new Date().toISOString(),
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const callChefChat = async (payload) => {
    const res = await api.post("/ai/chef-chat", {
      message: payload.message,
      history: payload.conversationHistory,
      cartItems: payload.cartItems,
      userPreferences: payload.userPreferences,
      session_id: sessionId,
    });
    return res.data;
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    resetInputHeight();

    const userMsg = {
      id: Date.now() + "-u",
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
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

      const data = await callChefChat(payload);

      addMessage({
        id: Date.now() + "-a",
        role: "assistant",
        content: data.reply || "I didn't catch that — could you rephrase?",
        timestamp: new Date().toISOString(),
        relatedProducts: data.relatedProducts || [],
      });

      // Automatically capture new conversation on list
      if (user && !activeConversationId) {
        setTimeout(async () => {
          try {
            const listRes = await api.get("/ai/context/conversations?bot_type=chef&limit=50");
            const list = listRes.data.conversations || [];
            setConversations(list);
            const match = list.find((c) => c.session_id === sessionId);
            if (match) {
              useChefStore.setState({ activeConversationId: match.id });
            }
          } catch (err) {
            console.warn("Failed to update active conversation list:", err);
          }
        }, 1200);
      }
    } catch (err) {
      addMessage({
        id: Date.now() + "-e",
        role: "assistant",
        content: "⚠️ Chef Bems is taking a short break. Try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true,
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const resetInputHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
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
        .chef-page-layout {
          display: flex;
          height: calc(100vh - 72px);
          width: 100%;
          overflow: hidden;
          font-family: 'Nunito', sans-serif;
          background-color: #FAF9F6;
        }
        @media (max-width: 768px) {
          .chef-page-layout {
            height: calc(100vh - 56px);
          }
        }

        /* Collapsible Left Sidebar */
        .chef-sidebar {
          width: 260px;
          height: 100%;
          background-color: #0A1C14;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          color: #ffffff;
          transition: transform 0.3s ease, margin-left 0.3s ease;
          z-index: 100;
          border-right: 1px solid #122B1E;
        }
        .chef-sidebar.collapsed {
          margin-left: -260px;
        }
        @media (max-width: 768px) {
          .chef-sidebar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            margin-left: 0 !important;
          }
          .chef-sidebar.open {
            transform: translateX(0);
          }
        }

        .sidebar-header {
          padding: 16px;
          display: flex;
          gap: 10px;
        }
        
        .btn-new-chat {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background-color: transparent;
          border: 1px solid #1B4530;
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-new-chat:hover {
          background-color: #123323;
        }

        .sidebar-scroll-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        /* Chat list items scrollbar */
        .sidebar-scroll-list::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll-list::-webkit-scrollbar-thumb {
          background-color: #1B4530;
          border-radius: 4px;
        }

        .conv-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13.5px;
          transition: background-color 0.2s;
          color: #D1D5DB;
        }
        .conv-item:hover, .conv-item.active {
          background-color: #102F20;
          color: #ffffff;
        }
        .conv-item-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .conv-title-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .conv-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .conv-item:hover .conv-actions {
          opacity: 1;
        }
        .btn-conv-action {
          background: none;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 2px;
          font-size: 12px;
        }
        .btn-conv-action:hover {
          color: #ffffff;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #122B1E;
          background-color: #081610;
        }

        /* Right Side Chat viewport */
        .chat-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          min-width: 0;
        }

        /* Main chat content flow */
        .chat-scroll-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .message-content-wrapper {
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          gap: 16px;
          padding: 12px 16px;
          border-radius: 12px;
          transition: background-color 0.2s;
        }
        .message-content-wrapper.assistant {
          background-color: rgba(27, 67, 50, 0.03);
          border: 1px solid rgba(27, 67, 50, 0.05);
        }
        .message-content-wrapper.error {
          background-color: #FEF2F2;
          border-color: #FCA5A5;
        }
        
        .msg-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .msg-avatar.user {
          background-color: #F59E0B;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
        }

        .msg-body {
          flex: 1;
          min-width: 0;
        }
        .msg-sender-name {
          font-size: 12px;
          font-weight: 700;
          color: #4B5563;
          margin-bottom: 4px;
        }
        .msg-text {
          font-size: 15px;
          line-height: 1.6;
          color: #1F2937;
        }
        .msg-text p {
          margin: 0 0 10px;
        }
        .msg-text p:last-child {
          margin-bottom: 0;
        }
        .msg-text strong {
          color: #111827;
        }

        /* Bottom Floating Input bar */
        .chat-input-sticky {
          padding: 24px;
          background: linear-gradient(to top, #FAF9F6 70%, transparent 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        
        .chat-input-wrapper {
          width: 100%;
          max-width: 700px;
          background-color: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          padding: 8px;
        }
        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }
        
        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #1F2937;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          max-height: 180px;
          min-height: 24px;
          font-family: inherit;
          padding: 6px 4px;
        }
        
        .chat-textarea::placeholder {
          color: #9CA3AF;
        }

        .btn-input-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background-color: transparent;
          color: #6B7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-input-icon:hover {
          color: #1B4530;
          background-color: rgba(27, 67, 50, 0.05);
        }
        .btn-input-icon.send-active {
          background-color: #1B4332;
          color: #ffffff;
        }
        .btn-input-icon.send-active:hover {
          background-color: #113022;
        }
        
        /* Interactive grid for prompts on empty chat */
        .chatgpt-hero {
          max-width: 650px;
          margin: auto;
          width: 100%;
          text-align: center;
          padding: 40px 16px 20px;
        }
        .chatgpt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 32px;
        }
        @media (max-width: 640px) {
          .chatgpt-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .chatgpt-prompt-card {
          background-color: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.01);
        }
        .chatgpt-prompt-card:hover {
          background-color: rgba(27, 67, 50, 0.02);
          border-color: #1B4530;
          transform: translateY(-2px);
        }

        /* Mobile Burger Toggle */
        .btn-sidebar-toggle {
          background: none;
          border: none;
          color: #374151;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .btn-sidebar-toggle:hover {
          background-color: rgba(0,0,0,0.05);
        }

        .header-topbar {
          height: 60px;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          background-color: #ffffff;
          flex-shrink: 0;
        }
        
        /* Backdrop overlay for mobile sidebar */
        .sidebar-backdrop {
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar-backdrop.visible {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.4);
            z-index: 90;
          }
        }
      `}</style>

      <div className="chef-page-layout">
        
        {/* Sidebar Mobile Backdrop */}
        <div 
          className={`sidebar-backdrop ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ChatGPT Style Collapsible Left Sidebar */}
        <div className={`chef-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
          
          {/* New Chat Button */}
          <div className="sidebar-header">
            <button className="btn-new-chat" onClick={handleStartNewChat}>
              <span>➕</span> New Conversation
            </button>
          </div>

          {/* Chronological Chat List */}
          <div className="sidebar-scroll-list">
            {conversations.length === 0 ? (
              <div style={{ padding: "20px 10px", fontSize: "12px", color: "#6B7280", textAlign: "center" }}>
                {user ? "No conversations yet" : "Log in to save history"}
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const isEditing = editingConvId === conv.id;
                
                return (
                  <div 
                    key={conv.id}
                    className={`conv-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="conv-item-left">
                      <span>💬</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(e, conv.id);
                            if (e.key === "Escape") setEditingConvId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          style={{
                            backgroundColor: "#1B4530",
                            border: "none",
                            outline: "none",
                            color: "#ffffff",
                            fontSize: "13px",
                            padding: "2px 4px",
                            borderRadius: "4px",
                            width: "100%"
                          }}
                        />
                      ) : (
                        <span className="conv-title-text">{conv.title || "Untitled Chat"}</span>
                      )}
                    </div>
                    
                    {!isEditing && (
                      <div className="conv-actions">
                        <button 
                          className="btn-conv-action"
                          onClick={(e) => handleStartEditing(e, conv)}
                          title="Rename thread"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-conv-action"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          title="Delete thread"
                        >
                          🗑️
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <button 
                        className="btn-conv-action"
                        onClick={(e) => handleSaveRename(e, conv.id)}
                        title="Save name"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* User Profile Summary Footer */}
          <div className="sidebar-footer">
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#F59E0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: "#0A1C14"
                }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.email}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
                Guest Account
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Panel */}
        <div className="chat-viewport">
          
          {/* Top Navbar Header */}
          <div className="header-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button 
                className="btn-sidebar-toggle" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Toggle sidebar"
              >
                ≡
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#1B4332", fontFamily: "Space Grotesk, sans-serif" }}>
                  Chef Bems 👨‍🍳
                </h1>
                <span style={{ fontSize: "12px", color: "#6B7280" }}>Online</span>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                onClick={handleStartNewChat}
                style={{
                  background: "transparent",
                  color: "#1B4332",
                  border: "1px solid #1B4332",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                🔄 New Chat
              </button>
            )}
          </div>

          {/* Messages list viewport */}
          <div className="chat-scroll-container">
            
            {/* ChatGPT Landing Onboarding Page (Empty screen) */}
            {messages.length <= 1 && (
              <div className="chatgpt-hero">
                <div style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "1.5px solid #F59E0B",
                  overflow: "hidden"
                }}>
                  <img src={chefBemsAvatar} alt="Chef Bems" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1C3F2E", margin: 0, fontFamily: "Space Grotesk, sans-serif" }}>
                  What can I help you cook today?
                </h2>
                <p style={{ fontSize: "14px", color: "#6B7280", margin: "8px 0 0", lineHeight: 1.5 }}>
                  Ask me for Nigerian farm recipes, quick substitution options, ingredient prices, or scan your inventory with a photo!
                </p>
                
                {/* Visual Scanner Intro image banner */}
                <div style={{
                  maxWidth: "340px",
                  margin: "24px auto 0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.03)"
                }}>
                  <img src={chefBemsImg} alt="Visual scanner banner" style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }} />
                </div>

                <div className="chatgpt-grid">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <div 
                      key={idx}
                      className="chatgpt-prompt-card"
                      onClick={() => sendMessage(p.text)}
                    >
                      <div style={{ fontSize: "20px" }}>{p.icon}</div>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#374151" }}>{p.text}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF" }}>Click to ask Chef Bems instantly</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Flow messages list */}
            {messages.length > 1 && (
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isAI = msg.role === "assistant";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`message-content-wrapper ${isAI ? "assistant" : "user"} ${msg.isError ? "error" : ""}`}
                    >
                      <div className={`msg-avatar ${isAI ? "ai" : "user"}`}>
                        {isAI ? (
                          <img 
                            src={chefBemsAvatar} 
                            alt="Chef Avatar" 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        ) : (
                          user?.name?.[0]?.toUpperCase() || "U"
                        )}
                      </div>
                      
                      <div className="msg-body">
                        <div className="msg-sender-name">
                          {isAI ? "Chef Bems" : user?.name || "You"}
                        </div>
                        <div className="msg-text">
                          <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                          
                          {/* Image scanner inline view */}
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded Ingredients"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "240px",
                                borderRadius: "8px",
                                marginTop: "10px",
                                display: "block",
                                border: "1px solid rgba(0,0,0,0.1)",
                                objectFit: "cover"
                              }}
                            />
                          )}
                        </div>

                        {/* Interactive shopping items */}
                        {isAI && msg.relatedProducts?.length > 0 && (
                          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#F59E0B" }}>🛒 Farm Ingredients available on BemsFarms:</span>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px"
                            }}>
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
                                    gap: "10px",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
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
                                    {addedIds[p.id] ? "✓ Added" : "Add"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Loading Indicator dots */}
            {loading && (
              <div className="message-content-wrapper assistant">
                <div className="msg-avatar ai">
                  <img src={chefBemsAvatar} alt="Chef Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "10px 14px" }}>
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

          {/* Sticky Bottom Input Section */}
          <div className="chat-input-sticky">
            <div className="chat-input-wrapper">
              <div className="chat-input-row">
                
                {/* Visual scan triggers */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <button 
                  className="btn-input-icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Upload image for Visual Scanning"
                >
                  📸
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Chef Bems how to cook Egusi, Jollof, or scan kitchen items..."
                  rows={1}
                  disabled={loading}
                  className="chat-textarea"
                />

                <button 
                  className={`btn-input-icon ${input.trim() ? "send-active" : ""}`}
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  title="Send message"
                >
                  🚀
                </button>
              </div>
            </div>
            
            <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "8px", textAlign: "center" }}>
              Chef Bems may make mistakes. Verify recipe parameters, pricing estimates, and health directions.
            </div>
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
