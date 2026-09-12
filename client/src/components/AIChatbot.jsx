// client/src/components/AIChatbot.jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";
import { escapeHtml } from "../utils/sanitize";

const QUICK_QUESTIONS = [
  {
    category: "Recipes",
    text: "How do I cook jollof rice?",
    value: "Give me a step-by-step recipe for Nigerian party jollof rice using BemsFarms ingredients.",
  },
  {
    category: "Health",
    text: "Best foods for diabetes?",
    value: "What Nigerian foods from BemsFarms are good for someone managing blood sugar or diabetes?",
  },
  {
    category: "Soups",
    text: "Egusi soup recipe",
    value: "How do I make authentic Nigerian egusi soup? What ingredients do I need from BemsFarms?",
  },
  {
    category: "Diet",
    text: "Healthy foods for weight loss?",
    value: "What BemsFarms products and whole foods should I buy for a healthy weight loss meal plan?",
  },
  {
    category: "Pantry",
    text: "What can I cook with garri?",
    value: "What versatile dishes or snacks can I make using authentic Nigerian garri?",
  },
  {
    category: "Storage",
    text: "How to store palm oil?",
    value: "How do I properly store pure palm oil to maintain freshness and prevent rancidity?",
  },
];

export default function AIChatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to BemsFarms! I'm Chef Bems, your personal AI kitchen chef.\n\nAsk me anything — recipes, cooking tips, what to cook with your ingredients, or the best foods for your health goals. I'm here to help you eat well the Nigerian way!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showDragHint, setShowDragHint] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Scroll to bottom when opening or adding messages
  useEffect(() => {
    if (open && !isMinimized) {
      setUnread(0);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [open, isMinimized, messages]);

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
        userId: user?.id || null,
        email: user?.email || null,
      });

      const reply =
        res.data?.reply ||
        res.data?.message ||
        res.data?.content ||
        "I'm here to help! Could you please clarify your cooking or ingredient question?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open || isMinimized) setUnread((n) => n + 1);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach my kitchen brain right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation restarted! How can Chef Bems assist your cooking or meal prep today?",
      },
    ]);
  };

  const formatMessage = (content) => {
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
              // small delay so drag end doesn't trigger onClick
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
            {/* Tooltip on hover */}
            <AnimatePresence>
              {showDragHint && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#143c2d] px-3 py-1 text-[11px] font-bold text-amber-300 shadow-lg border border-amber-300/20"
                >
                  Drag anywhere · Tap to chat
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
              aria-label="Open Chef Bems chat assistant"
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
              width: "min(400px, calc(100vw - 32px))",
              height: "min(600px, calc(100vh - 48px))",
            }}
            className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#DFD6C2] bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-950/15 bg-gradient-to-r from-[#143c2d] to-[#1a4e3b] px-4 py-3.5 text-white">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-amber-400/50 bg-white shadow-md">
                  <img
                    src={chefBemsAvatar}
                    alt="Chef Bems"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-display text-sm font-bold text-white">
                    <span>Chef Bems</span>
                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                      AI Chef
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-100/80">
                    Always Online · Nigerian Kitchen Expert
                  </p>
                </div>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-1.5">
                {/* Reset Chat */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Restart conversation"
                  aria-label="Restart conversation"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* Open Full Page */}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/chef-chat");
                  }}
                  title="Open full screen Chef Bems"
                  aria-label="Open full screen Chef Bems"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize chat to float"
                  aria-label="Minimize chat to float"
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
                  aria-label="Close chat"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-emerald-100 transition hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAF9F6] p-4 text-xs">
              {messages.map((msg, i) => (
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
            {messages.length <= 2 && (
              <div className="border-t border-slate-200/60 bg-white px-3 py-2">
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Quick Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(q.value)}
                      className="rounded-full border border-emerald-600/30 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-bold text-[#143c2d] transition hover:bg-emerald-100/80 active:scale-95"
                    >
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Store Quick CTA if conversation is deep */}
            {messages.length > 3 && (
              <div className="border-t border-slate-100 bg-white px-3.5 py-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/products");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#143c2d] py-2 text-xs font-extrabold text-amber-300 shadow-sm transition hover:bg-[#1a4e3b]"
                >
                  <span>Shop Fresh Ingredients in Store</span>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input Footer */}
            <div className="border-t border-slate-200 bg-white p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Chef Bems anything…"
                  className="flex-1 rounded-full border border-slate-300 bg-[#FAF9F6] px-4 py-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#143c2d] focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#143c2d] text-white shadow-md transition hover:bg-[#1a4e3b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message to Chef Bems"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
