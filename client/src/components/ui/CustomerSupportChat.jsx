// client/src/components/ui/CustomerSupportChat.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function CustomerSupportChat() {
  const { isLoggedIn, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.get("/support/messages");
      if (res.data?.messages) {
        setMessages(res.data.messages);
        // Calculate unread admin messages
        const unread = res.data.messages.filter(
          (m) => m.sender_type === "admin" && !m.is_read
        ).length;
        setUnreadCount(unread);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic polling when chat is open
  useEffect(() => {
    setMessages([]); setUnreadCount(0); setError("");
    if (!isLoggedIn || user?.role !== "user") return;
    fetchMessages();

    const interval = setInterval(fetchMessages, isOpen ? 4000 : 15000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (unreadCount > 0) {
        api.post("/support/read").catch(() => {});
        setUnreadCount(0);
      }
    }
  }, [isOpen, messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || sending || !isLoggedIn) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);
    setError("");

    // Optimistic message update
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      sender_type: "customer",
      message: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await api.post("/support/messages", { message: messageText });
      if (res.data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? res.data.message : m))
        );
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(messageText);
      setError("Message was not sent. Please try again.");
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  if (user && user.role !== "user") return null;
  return (
    <>
      {error && <div role="alert" className="fixed bottom-24 left-6 z-50 bg-red-50 text-red-800 p-3 rounded">{error}</div>}
      {/* Floating Trigger Button pinned to bottom left */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
        {!isOpen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full text-white bg-[#17352a] hover:bg-[#204a3a] shadow-xl border-2 border-white/20 transition-all font-semibold text-sm"
            aria-label="Open support chat"
          >
            <div className="relative flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Support Chat</span>
          </motion.button>
        )}
      </div>

      {/* Chat Drawer / Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-6 left-4 sm:left-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#17352a] text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-base text-white border-2 border-white/30">
                    BF
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#17352a] rounded-full" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-white">Bems Farms Support</h4>
                  <p className="text-[11px] text-emerald-200">Usually replies in minutes</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9f6]">
              {!isLoggedIn ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl">
                    <i className="ri-user-smile-line" />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">Sign In to Chat with Support</h5>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Sign in to your account so our support team can review your orders, answer questions, and help you directly.
                  </p>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="mt-2 py-2 px-5 bg-[#17352a] text-white rounded-xl text-xs font-bold hover:bg-[#204a3a] transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              ) : messages.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
                    <i className="ri-question-answer-line" />
                  </div>
                  <div>
                    <h6 className="font-semibold text-slate-700 text-sm">How can we help today?</h6>
                    <p className="text-xs text-slate-400 mt-1">
                      Ask about fresh produce stock, order status, or delivery locations.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center my-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-200/60 px-2.5 py-1 rounded-full">
                      Support Conversation
                    </span>
                  </div>

                  {messages.map((m) => {
                    const isMe = m.sender_type === "customer";
                    const time = m.created_at
                      ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        {!isMe && (
                          <span className="text-[10px] font-semibold text-emerald-800 mb-1 ml-1 flex items-center gap-1">
                            <i className="ri-shield-check-fill text-emerald-600" />
                            {m.admin_name || "Bems Farms Staff"}
                          </span>
                        )}

                        <div
                          className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-[#17352a] text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                          }`}
                        >
                          <div className="whitespace-pre-line">{m.message}</div>
                        </div>

                        <span className="text-[10px] text-slate-400 mt-1 px-1">{time}</span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            {isLoggedIn && (
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message or question…"
                  disabled={sending}
                  className="flex-1 py-2 px-3.5 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 border border-transparent"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-[#17352a] text-white hover:bg-[#204a3a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
