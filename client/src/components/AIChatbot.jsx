// client/src/components/AIChatbot.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";
import { escapeHtml } from "../utils/sanitize";

const CHEF_QUESTIONS = [
  { text: "How to cook party jollof?", value: "Give me a step-by-step recipe for Nigerian party jollof rice using BemsFarms ingredients." },
  { text: "Best foods for diabetes?", value: "What Nigerian foods from BemsFarms are good for someone managing blood sugar or diabetes?" },
  { text: "Egusi soup recipe", value: "How do I make authentic Nigerian egusi soup? What ingredients do I need from BemsFarms?" },
  { text: "Healthy foods for weight loss?", value: "What BemsFarms products and whole foods should I buy for a healthy weight loss meal plan?" },
];

const SUPPORT_QUESTIONS = [
  { text: "Where is my order?", value: "Where is my order right now? Can you provide live tracking details?" },
  { text: "Delivery zones & tariffs", value: "What are your delivery fees and delivery zones in Abia State?" },
  { text: "Payment options & COD", value: "What payment methods do you accept, and is Cash on Delivery available?" },
  { text: "Speak to Support Agent", value: "I would like to speak directly with a human customer support agent." },
];

export default function AIChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("chef"); // "chef" | "support"

  // Chef Mode State
  const [chefMessages, setChefMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to BemsFarms! I'm Chef Bems, your personal AI culinary guide.\n\nAsk me anything — recipes, cooking tips, or healthy food ideas the authentic Nigerian way!",
    },
  ]);

  // Support Mode State
  const [supportMessages, setSupportMessages] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load customer support messages and recent orders when logged in
  const loadSupportData = useCallback(async () => {
    if (!user) return;
    try {
      const [msgRes, ordRes] = await Promise.all([
        api.get("/customer-chat/messages").catch(() => ({ data: { messages: [] } })),
        api.get("/customer-chat/reference-options").catch(() => ({ data: { orders: [] } })),
      ]);

      const msgs = msgRes.data.messages || [];
      if (msgs.length > 0) {
        setSupportMessages(msgs);
      } else {
        setSupportMessages([
          {
            id: 'init-1',
            sender_type: 'bot',
            message: `Hello ${user.name || 'there'}! 👋 Welcome to Bems Farms Customer Support.\n\nYou can ask about tracking, delivery fees, return requests, or type "@" or "/" to reference any of your recent orders!`,
            created_at: new Date().toISOString(),
          }
        ]);
      }

      setRecentOrders(ordRes.data.orders || []);
    } catch (e) {
      console.warn("Support data load error:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "support") {
      loadSupportData();
      const interval = setInterval(loadSupportData, 5000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab, loadSupportData]);

  // Scroll to bottom when opening or switching tabs
  useEffect(() => {
    if (open && !isMinimized) {
      setUnread(0);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    }
  }, [open, isMinimized, activeTab, chefMessages, supportMessages]);

  const handleSendChefMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg = { role: "user", content };
    const newMessages = [...chefMessages, userMsg];
    setChefMessages(newMessages);

    if (!user) {
      setChefMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "🔒 Chef Bems AI is exclusively available to registered members. Please sign in or create an account to chat!",
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const conversationHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post("/ai/chef-chat", {
        message: content,
        history: conversationHistory,
        userId: user?.id || null,
        email: user?.email || null,
        name: user?.name || null,
      });

      const reply = res.data?.reply || res.data?.message || res.data?.content || "I'm here to help! Could you please clarify your culinary question?";
      setChefMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open || isMinimized) setUnread((n) => n + 1);
    } catch (err) {
      setChefMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach my kitchen brain right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  };

  const handleSendSupportMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    if (!user) {
      setSupportMessages((prev) => [
        ...prev,
        {
          id: `auth-req-${Date.now()}`,
          sender_type: 'bot',
          message: "🔒 Please log in to your Bems Farms account to chat with our Customer Support and track your live orders.",
          created_at: new Date().toISOString(),
        }
      ]);
      setInput("");
      return;
    }

    const orderRefId = selectedOrder?.order_ref || selectedOrder?.order_id || selectedOrder?.id;
    setInput("");
    setSelectedOrder(null);
    setShowMentionMenu(false);

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender_type: 'customer',
      message: content,
      order_id: orderRefId || null,
      created_at: new Date().toISOString(),
    };
    setSupportMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.post("/customer-chat/messages", {
        message: content,
        order_id: orderRefId || undefined,
        enable_ai: true,
      });

      if (res.data?.message) {
        setSupportMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          const next = [...filtered, res.data.message];
          if (res.data.message.bot_reply) {
            next.push(res.data.message.bot_reply);
          }
          return next;
        });
      }
      if (!open || isMinimized) setUnread((n) => n + 1);
    } catch (err) {
      setSupportMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender_type: 'bot',
          message: "⚠️ Could not send message. Please check your network and retry.",
          created_at: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  };

  const handleSendMessage = (text) => {
    if (activeTab === "chef") {
      handleSendChefMessage(text);
    } else {
      handleSendSupportMessage(text);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (activeTab === "support") {
      if (val.endsWith("@") || val.endsWith("/")) {
        setShowMentionMenu(true);
      } else if (val === "" || (!val.includes("@") && !val.includes("/"))) {
        setShowMentionMenu(false);
      }
    }
  };

  const handleSelectOrder = (ord) => {
    setSelectedOrder(ord);
    setShowMentionMenu(false);
    setInput((prev) => prev.replace(/[@/][a-zA-Z0-9_-]*$/, "") + ` #${ord.order_ref || ord.order_id} `);
  };

  const formatMessage = (content) => {
    if (!content) return "";
    return content.split("\n").map((line, i) => {
      const boldFormatted = escapeHtml(line).replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );
      return (
        <span key={i} className="block min-h-[1.2em]">
          <span dangerouslySetInnerHTML={{ __html: boldFormatted }} />
        </span>
      );
    });
  };

  return (
    <>
      {/* DRAGGABLE FLOATING AVATAR TRIGGER */}
      <AnimatePresence>
        {(!open || isMinimized) && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.12}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => {
              setTimeout(() => setIsDragging(false), 80);
            }}
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 9999,
              touchAction: "none",
            }}
            onMouseEnter={() => setShowDragHint(true)}
            onMouseLeave={() => setShowDragHint(false)}
            className="group cursor-grab active:cursor-grabbing select-none"
          >
            <AnimatePresence>
              {showDragHint && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#143c2d] px-3 py-1 text-[11px] font-bold text-amber-300 shadow-lg border border-amber-300/20"
                >
                  Chef & Live Support · Tap to chat
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => {
                if (!isDragging) {
                  setOpen(true);
                  setIsMinimized(false);
                }
              }}
              className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white p-1 shadow-2xl transition hover:scale-105 active:scale-95 border-2 border-[#F59E0B] ring-4 ring-[#143c2d]/10"
              aria-label="Open Bems chat assistant"
            >
              <div className="h-full w-full overflow-hidden rounded-full bg-[#FAF8F5]">
                <img
                  src={chefBemsAvatar}
                  alt="Chef Bems"
                  className="h-full w-full object-cover pointer-events-none"
                />
              </div>

              {/* Online Green Pulse Dot */}
              <span className="absolute bottom-0 right-0 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
              </span>

              {/* Unread badge */}
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#c85a17] px-1 text-[10px] font-black text-white shadow-md"
                >
                  {unread}
                </motion.span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT WINDOW */}
      <AnimatePresence>
        {open && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 9999,
              width: "min(420px, calc(100vw - 32px))",
              height: "min(620px, calc(100vh - 48px))",
            }}
            className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#DFD6C2] bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-950/15 bg-gradient-to-r from-[#143c2d] to-[#1a4e3b] px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-amber-400/50 bg-white shadow-md">
                  <img
                    src={chefBemsAvatar}
                    alt="Chef Bems"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-display text-xs font-bold text-white">
                    <span>{activeTab === "chef" ? "Chef Bems AI" : "Customer Support"}</span>
                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-100/80">
                    {activeTab === "chef" ? "Recipes & Cooking Assistant" : "Order Help & Admin Dispatch"}
                  </p>
                </div>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-1.5">
                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize chat"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  title="Close chat"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("chef")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  activeTab === "chef"
                    ? "bg-white text-[#143c2d] shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>👨‍🍳 Chef Bems</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("support");
                  loadSupportData();
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  activeTab === "support"
                    ? "bg-white text-[#143c2d] shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>💬 Order & Support</span>
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAF9F6] p-3.5 text-xs">
              {/* CHEF MESSAGES */}
              {activeTab === "chef" &&
                chefMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-end gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-emerald-800 bg-white shadow-xs">
                        <img
                          src={chefBemsAvatar}
                          alt="Chef Bems"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                        msg.role === "user"
                          ? "rounded-br-xs bg-[#143c2d] font-medium text-white"
                          : "rounded-bl-xs border border-slate-200/80 bg-white font-normal text-slate-800"
                      }`}
                    >
                      {formatMessage(msg.content)}
                    </div>
                  </div>
                ))}

              {/* SUPPORT MESSAGES */}
              {activeTab === "support" &&
                supportMessages.map((msg, i) => {
                  const isUser = msg.sender_type === "customer";
                  const isAdmin = msg.sender_type === "admin";
                  const isBot = msg.sender_type === "bot";
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      {/* Attached Order Reference Card */}
                      {msg.metadata && (
                        <div className="mb-1.5 max-w-[90%] rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-[11px] text-emerald-950 shadow-2xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>📦 Order #{msg.metadata.order_ref || msg.metadata.order_id}</span>
                            <span className="rounded-sm bg-emerald-200/60 px-1.5 py-0.5 text-[9px] uppercase">
                              {msg.metadata.status}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-emerald-800">
                            Total: ₦{Number(msg.metadata.total || 0).toLocaleString()} · {msg.metadata.items_count || 1} produce items
                          </div>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-white shadow-xs flex items-center justify-center font-bold text-xs text-emerald-800">
                            {isAdmin ? "👨‍💼" : "🤖"}
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                            isUser
                              ? "rounded-br-xs bg-[#143c2d] font-medium text-white"
                              : isAdmin
                              ? "rounded-bl-xs border border-blue-200 bg-blue-50 text-blue-950 font-normal"
                              : "rounded-bl-xs border border-slate-200/80 bg-white font-normal text-slate-800"
                          }`}
                        >
                          {!isUser && (
                            <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {isAdmin ? (msg.admin_name || "Support Staff") : "Bems AI Assistant"}
                            </div>
                          )}
                          {formatMessage(msg.message)}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-end gap-2">
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-emerald-800 bg-white shadow-xs">
                    <img
                      src={chefBemsAvatar}
                      alt="Chef Bems"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-xs border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs">
                    {[0, 0.15, 0.3].map((delay, idx) => (
                      <motion.span
                        key={idx}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay }}
                        className="h-1.5 w-1.5 rounded-full bg-[#143c2d]"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="border-t border-slate-200/60 bg-white px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                {(activeTab === "chef" ? CHEF_QUESTIONS : SUPPORT_QUESTIONS).map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(q.value)}
                    className="rounded-full border border-emerald-600/30 bg-emerald-50/60 px-2.5 py-0.5 text-[10px] font-bold text-[#143c2d] transition hover:bg-emerald-100/80 active:scale-95"
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Mention / Order Autocomplete Dropdown */}
            {showMentionMenu && activeTab === "support" && recentOrders.length > 0 && (
              <div className="max-h-40 overflow-y-auto border-t border-slate-200 bg-white p-2 text-xs shadow-lg">
                <div className="mb-1 text-[10px] font-extrabold uppercase text-slate-400 px-1">
                  Select Order to Reference (@ or /):
                </div>
                {recentOrders.map((ord) => (
                  <button
                    key={ord.order_id || ord.id}
                    type="button"
                    onClick={() => handleSelectOrder(ord)}
                    className="w-full flex items-center justify-between rounded-lg p-1.5 text-left transition hover:bg-emerald-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📦</span>
                      <div>
                        <div className="font-bold text-slate-800">#{ord.order_ref || ord.order_id}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{ord.status}</div>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-700">
                      ₦{Number(ord.total).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Input Footer */}
            <div className="border-t border-slate-200 bg-white p-2.5">
              {selectedOrder && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-200">
                  <span>📦 Attached: #{selectedOrder.order_ref || selectedOrder.order_id} (₦{Number(selectedOrder.total).toLocaleString()})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-red-500 hover:text-red-700 font-extrabold"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-1.5"
              >
                {activeTab === "support" && (
                  <button
                    type="button"
                    onClick={() => setShowMentionMenu(!showMentionMenu)}
                    title="Reference an Order (@ or /)"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 hover:bg-emerald-100 transition text-xs"
                  >
                    @
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    activeTab === "chef"
                      ? "Ask Chef Bems recipes or tips…"
                      : "Type question… Use @ or / to attach order"
                  }
                  className="flex-1 rounded-full border border-slate-300 bg-[#FAF9F6] px-3.5 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#143c2d] focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#143c2d] text-white shadow-md transition hover:bg-[#1a4e3b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
