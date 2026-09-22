import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/layout/PageWrapper";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useChefStore } from "../store/useChefStore";
import api from "../services/api";
import chefBemsImg from "../assets/chef_bems_cooking.jpg";
import chefBemsAvatar from "../assets/chef_bems_avatar.png";
import { escapeHtml } from "../utils/sanitize";

const QUICK_PROMPTS = [
  {
    tag: "Cart Sync",
    title: "Review My Active Cart",
    text: "Can you review my current shopping cart, check if I have everything for a complete meal, and suggest portion adjustments?",
  },
  {
    tag: "Pantry Match",
    title: "Pantry Ingredients Meal",
    text: "What delicious meal can I cook with garri, fresh tomatoes, and palm oil?",
  },
  {
    tag: "Masterclass",
    title: "Party Jollof Rice",
    text: "How do I make authentic Nigerian Party Jollof Rice with that signature smoky flavor for 10 people?",
  },
  {
    tag: "Meal Planner",
    title: "Weekly Nigerian Plan",
    text: "Create a healthy, budget-friendly Nigerian meal plan for the entire week.",
  },
  {
    tag: "Healthy Swaps",
    title: "Palm Oil Substitute",
    text: "What is a healthy substitute for palm oil in traditional Egusi soup?",
  },
];

const SUGGESTED_FOLLOW_UPS = [
  "Add all ingredients to my cart",
  "Adjust this recipe for 10 people instead",
  "Can you fit this recipe into a ₦15,000 budget?",
  "Review my active cart ingredients",
  "Give me step-by-step cooking instructions",
];

function formatMessage(text) {
  if (!text) return "";
  let formatted = escapeHtml(text);

  // Headers
  formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="font-display font-bold text-emerald-900 text-sm mt-3 mb-1">$1</h4>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="font-display font-black text-emerald-950 text-base mt-3.5 mb-1.5">$1</h3>');
  formatted = formatted.replace(/^# (.*$)/gim, '<h2 class="font-display font-black text-emerald-950 text-lg mt-4 mb-2">$1</h2>');

  // Bold & Italic
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');

  // Bullet points
  formatted = formatted.replace(/^[•\-\*] (.*$)/gim, '<li class="ml-4 list-disc text-slate-800 leading-relaxed">$1</li>');

  // Numbered lists
  formatted = formatted.replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal text-slate-800 leading-relaxed"><span class="font-semibold">$2</span></li>');

  // Line breaks
  formatted = formatted.replace(/\n/g, "<br/>");

  return formatted;
}

// ── INTERACTIVE RECIPE BUNDLE CARD (AI ADD-TO-CART) ────────────
function RecipeBundleCard({ bundle, onAddItems, onInstantCheckout, onPromptChat, isAutoAdded = false, cartItems = [] }) {
  const [selectedItems, setSelectedItems] = useState(() => {
    const initial = {};
    (bundle.items || []).forEach((item) => {
      initial[item.id] = true;
    });
    return initial;
  });

  const toggleItem = (id) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeItems = useMemo(() => {
    return (bundle.items || []).filter((item) => selectedItems[item.id]);
  }, [bundle.items, selectedItems]);

  const bundleTotal = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  }, [activeItems]);

  const isItemInCart = (item) => {
    return cartItems.some((ci) => {
      const ciId = ci.product?.id || ci.id;
      const ciName = ci.product?.name || ci.name || "";
      const matchesId = item.id && ciId && String(ciId) === String(item.id);
      const matchesName = item.name && ciName && ciName.toLowerCase().trim() === item.name.toLowerCase().trim();
      return Boolean(matchesId || matchesName);
    });
  };

  const allActiveInCart = useMemo(() => {
    if (activeItems.length === 0) return false;
    return activeItems.every((item) => isItemInCart(item));
  }, [activeItems, cartItems]);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 to-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A2E1C]">
            👨‍🍳 1-Click Recipe Bundle
          </span>
          <h4 className="mt-1 font-display text-sm font-black text-[#0A2E1C]">
            {bundle.recipe_name || "Farm-Fresh Recipe Ingredients"}
          </h4>
        </div>
        {bundle.servings && (
          <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">
            Serves {bundle.servings} People
          </span>
        )}
      </div>

      {/* Auto-Added Confirmation Banner */}
      {(isAutoAdded || bundle.isAutoAdded || allActiveInCart) && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100/90 border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-900">
          <span className="text-base">✨</span>
          <span>Chef Bems has added these recipe ingredients to your active shopping cart!</span>
        </div>
      )}

      {/* Ingredients Selection Checklist */}
      <div className="my-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Select Ingredients ({activeItems.length}/{bundle.items?.length || 0} selected):
        </p>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {(bundle.items || []).map((item) => {
            const isChecked = !!selectedItems[item.id];
            const inCart = isItemInCart(item);
            return (
              <label
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-2 text-xs transition cursor-pointer ${
                  isChecked
                    ? "border-emerald-600 bg-emerald-50/50 text-slate-900"
                    : "border-slate-200 bg-white/70 text-slate-400 line-through"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-500">{item.unit || "1 unit"} &bull; Qty: {item.quantity || 1}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-black text-emerald-800 block">
                      ₦{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                    </span>
                    {(item.quantity || 1) > 1 && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        (₦{Number(item.price).toLocaleString()} each)
                      </span>
                    )}
                  </div>
                  {inCart && (
                    <span className="rounded-md bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                      ✓ In Cart
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Bundle Total and Action Buttons */}
      <div className="pt-3 border-t border-amber-200/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-600">Bundle Subtotal:</span>
          <span className="text-base font-black text-emerald-900">₦{bundleTotal.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allActiveInCart ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 py-2 px-3 text-xs font-black shadow-xs">
              <span>✅ Added to Cart</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={activeItems.length === 0}
              onClick={() => onAddItems(activeItems)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0A2E1C] hover:bg-[#13422B] text-white py-2 px-3 text-xs font-black shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span>🛒 Add All ({activeItems.length}) to Cart</span>
            </button>
          )}

          {/* Option 3: Instant Express Checkout */}
          <button
            type="button"
            disabled={activeItems.length === 0}
            onClick={() => onInstantCheckout(activeItems)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] py-2 px-3 text-xs font-black shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <span>⚡ Instant Checkout</span>
          </button>
        </div>

        {/* Adjust portions in chat */}
        <button
          type="button"
          onClick={() => onPromptChat(`Chef Bems, could you please adjust the ingredients or portion size for this ${bundle.recipe_name || "recipe"}?`)}
          className="mt-2.5 w-full text-center text-[11px] font-bold text-amber-800 hover:text-emerald-900 transition underline cursor-pointer"
        >
          🔄 Want to change portion size, budget, or swap ingredients? Ask Chef Bems
        </button>
      </div>
    </div>
  );
}

export default function ChefBemsPage() {
  const navigate = useNavigate();
  const { cartItems, cartCount, cartSubtotal, addToCart, addMultipleToCart, replaceCart, openCartDrawer } = useCart();
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
    clearChat,
    syncUser,
  } = useChefStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [actionToast, setActionToast] = useState(null);

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

  // Fetch initial conversations list for logged in users & isolate by user ID
  useEffect(() => {
    syncUser(user?.id || null);

    if (!user) {
      setConversations([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await api.get("/ai/context/conversations?bot_type=chef&limit=50");
        const list = res.data.conversations || [];
        setConversations(list);
        
        // If we have an active conversation, keep it loaded; if not, only load if on blank welcome screen
        const currentMessages = useChefStore.getState().messages;
        const currentActiveId = useChefStore.getState().activeConversationId;
        
        if (currentActiveId) {
          const activeConv = list.find((c) => c.id === currentActiveId);
          if (activeConv) {
            handleSelectConversation(activeConv);
          }
        } else if (currentMessages.length <= 1 && list.length > 0) {
          handleSelectConversation(list[0]);
        }
      } catch (err) {
        console.warn("Failed to load initial conversations:", err);
      }
    };
    fetchHistory();
  }, [user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast(null);
    }, 4000);
  };

  const handleSelectConversation = async (conv) => {
    try {
      setLoading(true);
      const res = await api.get(`/ai/context/conversations/${conv.id}`);
      const serverMsgs = res.data.messages || [];
      const formatted = serverMsgs.map((m) => ({
        id: m.id || `${Date.now()}-${Math.random()}`,
        role: m.role,
        content: m.content,
        timestamp: m.created_at || new Date().toISOString(),
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
    setUploadedPreview(null);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this culinary chat thread?")) return;
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      addMessage({
        id: `${Date.now()}-auth`,
        role: "assistant",
        content: "🔒 **Registration Required**: Chef Bems AI and the ingredient scanner are exclusively available to registered members.\n\nPlease [Sign In](/login) or [Create a Free Account](/register) to start cooking and chatting with me!",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target.result;
      setUploadedPreview(base64Data);

      addMessage({
        id: `${Date.now()}-u-img`,
        role: "user",
        content: "[Photo of kitchen ingredients uploaded for AI scanning]",
        timestamp: new Date().toISOString(),
      });

      setLoading(true);
      try {
        const res = await api.post("/ai/visual-scan", { image: base64Data });
        const data = res.data;

        addMessage({
          id: `${Date.now()}-a`,
          role: "assistant",
          content: data.reply || "I analyzed your ingredients! Here is a recommended recipe from Bems Farms.",
          timestamp: new Date().toISOString(),
          relatedProducts: data.relatedProducts || [],
          recipeBundle: data.recipeBundle || null,
        });
      } catch (err) {
        addMessage({
          id: `${Date.now()}-e`,
          role: "assistant",
          content: err.response?.data?.message || "The visual scanner encountered an issue. Please describe your ingredients in text and I will help you right away.",
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
      userId: user?.id || null,
      email: user?.email || null,
      name: user?.name || null,
    });
    return res.data;
  };

  // Option 1 & 3: Add Items helper
  const handleBundleAddItems = (items) => {
    const formatted = items.map((i) => ({
      ...i,
      price: Number(i.price) || 0,
      quantity: i.quantity || 1,
    }));

    // Filter out items already in the cart
    const itemsToAdd = formatted.filter((item) => {
      return !cartItems.some((ci) => {
        const ciId = ci.product?.id || ci.id;
        const ciName = ci.product?.name || ci.name || "";
        const matchesId = item.id && ciId && String(ciId) === String(item.id);
        const matchesName = item.name && ciName && ciName.toLowerCase().trim() === item.name.toLowerCase().trim();
        return Boolean(matchesId || matchesName);
      });
    });

    if (itemsToAdd.length === 0) {
      showToast("✨ All selected recipe ingredients are already in your cart!", "info");
      return;
    }

    addMultipleToCart(itemsToAdd, { preventDuplicate: true });
    showToast(`🛒 Added ${itemsToAdd.length} recipe ingredient(s) to your cart!`);
  };

  const handleBundleInstantCheckout = (items) => {
    const formatted = items.map((i) => ({
      ...i,
      price: Number(i.price) || 0,
      quantity: i.quantity || 1,
    }));
    addMultipleToCart(formatted, { preventDuplicate: true });
    navigate("/checkout");
  };

  // Bidirectional Cart Sync: send cart to chat
  const handleSyncCartToChat = () => {
    if (cartItems.length === 0) {
      sendMessage("Chef Bems, my cart is currently empty. What staple groceries and recipe items should I start with?");
      return;
    }
    const cartSummary = cartItems
      .map((item) => {
        const name = item.product?.name || item.name;
        const qty = item.quantity || 1;
        const price = Number(item.product?.price || item.price || 0);
        return `• ${qty}x ${name} (₦${(price * qty).toLocaleString()})`;
      })
      .join("\n");

    const prompt = `Chef Bems, please review my active shopping cart:\n${cartSummary}\n\nTotal: ₦${cartSubtotal.toLocaleString()}.\n\nCan you review these items, suggest what delicious Nigerian meal I can cook with them, tell me if I am missing any essential spices or vegetables, or help me adjust the quantities?`;
    sendMessage(prompt);
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    resetInputHeight();

    const userMsg = {
      id: `${Date.now()}-u`,
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    if (!user) {
      addMessage({
        id: `${Date.now()}-auth`,
        role: "assistant",
        content: "🔒 **Registration Required**: Chef Bems AI is exclusively available to registered members.\n\nPlease [Sign In](/login) or [Create a Free Account](/register) to start cooking, saving recipes, and chatting with me!",
        timestamp: new Date().toISOString(),
      });
      return;
    }

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

      const isAutoAdd = data.action === "AUTO_ADD_TO_CART";
      const itemsToAdd = data.recipeBundle?.items || data.relatedProducts || [];

      // Handle Option 2: AI Direct Intent Auto-Add
      if (isAutoAdd && itemsToAdd.length > 0) {
        const formatted = itemsToAdd.map((i) => ({
          ...i,
          price: Number(i.price) || 0,
          quantity: i.quantity || 1,
        }));
        addMultipleToCart(formatted, { preventDuplicate: true });
        showToast(`✨ Chef Bems added ${itemsToAdd.length} ingredient(s) directly to your active cart!`);
      }

      addMessage({
        id: `${Date.now()}-a`,
        role: "assistant",
        content: data.reply || "I did not catch that. Could you please rephrase?",
        timestamp: new Date().toISOString(),
        relatedProducts: data.relatedProducts || [],
        recipeBundle: data.recipeBundle ? { ...data.recipeBundle, isAutoAdded: isAutoAdd } : null,
        autoAdded: isAutoAdd,
      });

      if (data.conversationId) {
        useChefStore.setState({ activeConversationId: data.conversationId });
      }

      // Refresh sidebar threads list silently without resetting the active chat
      if (user) {
        setTimeout(async () => {
          try {
            const listRes = await api.get("/ai/context/conversations?bot_type=chef&limit=50");
            const list = listRes.data.conversations || [];
            setConversations(list);
          } catch (err) {
            console.warn("Failed to update active conversation list:", err);
          }
        }, 1500);
      }
    } catch (err) {
      addMessage({
        id: `${Date.now()}-e`,
        role: "assistant",
        content: "Chef Bems is momentarily busy in the kitchen. Please try again in a few seconds.",
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
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
    addToCart({ ...product, price: Number(product.price) || 0 });
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    showToast(`🛒 Added ${product.name} to cart`);
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
      <div className="flex flex-1 h-full min-h-0 w-full overflow-hidden bg-[#FAF8F5] text-slate-900 font-sans relative">
        
        {/* Mobile Backdrop Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
            />
          )}
        </AnimatePresence>

        {/* ── LEFT SIDEBAR (CONVERSATIONS) ── */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 sm:w-80 bg-[#0A2E1C] text-white border-r border-emerald-950/40 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden"
          }`}
        >
          {/* Sidebar Top: New Chat & Close */}
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewChat}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] px-4 py-2.5 text-xs font-black transition-all shadow-md active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>New Recipe Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-emerald-200 hover:bg-white/20 transition"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conversations History List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
              Saved Recipe Threads
            </div>

            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-200/60 leading-relaxed">
                {user ? "No saved threads yet. Ask Chef Bems a question to begin." : "Sign in to save and sync your cooking conversations."}
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const isEditing = editingConvId === conv.id;
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? "bg-emerald-800/90 text-white font-bold shadow-xs"
                        : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <svg className="w-4 h-4 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.84-.84c.15-.845.385-1.666.697-2.433A8.17 8.17 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      
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
                          className="w-full rounded bg-emerald-950 px-2 py-1 text-xs text-white outline-none border border-emerald-500"
                        />
                      ) : (
                        <span className="truncate">{conv.title || "Untitled Conversation"}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartEditing(e, conv)}
                          title="Rename thread"
                          className="p-1 text-emerald-300 hover:text-white transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          title="Delete thread"
                          className="p-1 text-rose-300 hover:text-rose-100 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => handleSaveRename(e, conv.id)}
                        className="text-xs font-bold text-amber-300 hover:underline ml-1"
                      >
                        Save
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer User Card */}
          <div className="p-3 border-t border-white/10 bg-[#061D12]">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-xs font-black text-[#0A2E1C]">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{user.name}</p>
                  <p className="truncate text-[11px] text-emerald-300/80">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-[11px] text-emerald-200/70 py-1">
                Guest Mode &bull; Sign in to sync recipes
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CHAT VIEWPORT ── */}
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#FAF8F5] overflow-hidden">
          
          {/* Top Header Bar */}
          <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#EAE3D2] flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                aria-label="Toggle recipe threads"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={chefBemsAvatar}
                    alt="Chef Bems"
                    className="h-9 w-9 rounded-full object-cover border border-amber-300 shadow-xs"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-display text-sm sm:text-base font-black text-[#0A2E1C]">
                      Chef Bems
                    </h1>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">
                      Culinary AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Bems Farms Farm-to-Table Kitchen Guide</p>
                </div>
              </div>
            </div>

            {messages.length > 1 && (
              <button
                type="button"
                onClick={handleStartNewChat}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </header>

          {/* Top Cart Sync Bar (Bidirectional Cart Modification) */}
          {cartCount > 0 && (
            <div className="bg-gradient-to-r from-[#0A2E1C] via-[#103D26] to-[#0A2E1C] text-white px-4 py-2.5 shadow-sm border-b border-emerald-800 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-black text-amber-300">Active Cart:</span>
                <span className="truncate">{cartCount} item{cartCount > 1 ? "s" : ""} (₦{cartSubtotal.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncCartToChat}
                  className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0A2E1C] font-black transition text-xs shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>🔄 Review in Chat</span>
                </button>
                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 font-bold transition text-xs"
                >
                  View Cart
                </button>
              </div>
            </div>
          )}

          {/* Floating Action Toast */}
          <AnimatePresence>
            {actionToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 right-4 sm:right-8 z-50 rounded-2xl bg-[#0A2E1C] text-white px-4 py-3 shadow-2xl border border-amber-400/60 flex items-center gap-3 text-xs font-bold"
              >
                <span>{actionToast}</span>
                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="rounded-lg bg-amber-400 px-2 py-1 text-[11px] font-black text-[#0A2E1C] hover:bg-amber-300 transition"
                >
                  Open Cart
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Empty Onboarding Landing */}
            {messages.length <= 1 && (
              <div className="mx-auto max-w-3xl text-center py-6 sm:py-10">
                <div className="relative mx-auto mb-4 h-20 w-20 rounded-full bg-white p-1 shadow-xl ring-2 ring-amber-300">
                  <img
                    src={chefBemsAvatar}
                    alt="Chef Bems"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                <span className="inline-block rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-900 border border-emerald-200">
                  Nigerian Culinary & Pantry AI
                </span>

                <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
                  What would you like to cook today?
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Ask for Nigerian recipes, substitute ingredients with farm-fresh produce, get weekly meal plans, or scan your kitchen items with a photo.
                </p>

                {/* Visual Banner */}
                <div className="mt-6 mx-auto max-w-md overflow-hidden rounded-2xl border border-[#E0D7C3] shadow-lg">
                  <img
                    src={chefBemsImg}
                    alt="Chef Bems preparing fresh harvest ingredients"
                    className="h-44 w-full object-cover"
                  />
                </div>

                {/* Quick Prompts Grid */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (prompt.tag === "Cart Sync") {
                          handleSyncCartToChat();
                        } else {
                          sendMessage(prompt.text);
                        }
                      }}
                      className="group flex flex-col justify-between rounded-2xl border border-[#DFD6C2] bg-white p-4 shadow-xs hover:border-emerald-700 hover:shadow-md transition text-left cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                          {prompt.tag}
                        </span>
                        <h3 className="mt-1 font-display text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                          {prompt.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {prompt.text}
                        </p>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                        <span>Ask Chef Bems</span>
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Stream */}
            {messages.length > 1 && (
              <div className="mx-auto max-w-3xl space-y-5">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isAI = msg.role === "assistant";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`flex gap-3 sm:gap-4 ${isAI ? "justify-start" : "justify-end"}`}
                      >
                        {isAI && (
                          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white border border-amber-300 shadow-xs shrink-0 overflow-hidden mt-1">
                            <img
                              src={chefBemsAvatar}
                              alt="Chef Bems"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isAI ? "items-start" : "items-end"}`}>
                          <div className="text-[11px] font-bold text-slate-400 mb-1 px-1">
                            {isAI ? "Chef Bems" : user?.name || "You"}
                          </div>

                          <div
                            className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                              isAI
                                ? msg.isError
                                  ? "bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-xs"
                                  : "bg-white border border-[#E2DAC8] text-slate-800 rounded-tl-xs"
                                : "bg-[#0A2E1C] text-white rounded-tr-xs"
                            }`}
                          >
                            <div
                              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                              className="space-y-2"
                            />

                            {/* Attached pantry image view */}
                            {msg.image && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-white/20">
                                <img
                                  src={msg.image}
                                  alt="Scanned pantry ingredients"
                                  className="max-h-60 w-full object-cover"
                                />
                              </div>
                            )}

                            {/* Option 1 & 3: Interactive Recipe Bundle Card */}
                            {isAI && msg.recipeBundle && (
                              <RecipeBundleCard
                                bundle={msg.recipeBundle}
                                onAddItems={handleBundleAddItems}
                                onInstantCheckout={handleBundleInstantCheckout}
                                onPromptChat={(p) => sendMessage(p)}
                                isAutoAdded={msg.autoAdded || msg.recipeBundle?.isAutoAdded}
                                cartItems={cartItems}
                              />
                            )}

                            {/* Fallback Single Produce Items */}
                            {isAI && !msg.recipeBundle && msg.relatedProducts?.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 block mb-2">
                                  Order Fresh Ingredients from Bems Farms:
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {msg.relatedProducts.map((product, pIdx) => {
                                    const inCart =
                                      msg.autoAdded ||
                                      addedIds[product.id] ||
                                      cartItems.some((ci) => {
                                        const ciId = ci.product?.id || ci.id;
                                        const ciName = ci.product?.name || ci.name || "";
                                        const matchesId = product.id && ciId && String(ciId) === String(product.id);
                                        const matchesName = product.name && ciName && ciName.toLowerCase().trim() === product.name.toLowerCase().trim();
                                        return Boolean(matchesId || matchesName);
                                      });

                                    return (
                                      <div
                                        key={pIdx}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#FAF9F6] p-2.5 shadow-2xs"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-xs font-bold text-slate-900">{product.name}</p>
                                          <p className="text-[11px] font-bold text-emerald-800">
                                            ₦{Number(product.price).toLocaleString()}
                                          </p>
                                        </div>

                                        {inCart ? (
                                          <span className="rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-1 text-[11px] font-black shrink-0">
                                            ✓ In Cart
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => handleAddProduct(e, product)}
                                            className="rounded-lg px-3 py-1.5 text-[11px] font-black transition cursor-pointer shrink-0 bg-[#0A2E1C] hover:bg-[#14422B] text-white"
                                          >
                                            + Add
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {!isAI && (
                          <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-amber-400 text-xs font-black text-[#0A2E1C] shrink-0 mt-1 shadow-xs">
                            {user?.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* AI Typing Indicator */}
                {loading && (
                  <div className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full bg-white border border-amber-300 shadow-xs shrink-0 overflow-hidden mt-1">
                      <img
                        src={chefBemsAvatar}
                        alt="Chef Bems"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs bg-white border border-[#E2DAC8] px-4 py-3 shadow-xs flex items-center gap-1.5">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                          className="h-2 w-2 rounded-full bg-emerald-700"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-up Action Chips */}
                {!loading && messages.length > 1 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Suggested Follow-Ups:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_FOLLOW_UPS.map((followUp, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          onClick={() => sendMessage(followUp)}
                          className="rounded-full border border-[#D5CCB8] bg-white px-3 py-1 text-[11px] font-bold text-slate-700 hover:border-emerald-700 hover:text-emerald-900 transition shadow-2xs"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>

          {/* ── STICKY STATIC BOTTOM INPUT BAR ── */}
          <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-[#EAE3D2] shrink-0 sticky bottom-0 z-20">
            <div className="mx-auto max-w-3xl">
              
              {/* Unregistered Member Alert Banner */}
              {!user && (
                <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs text-amber-950 font-medium text-center sm:text-left">
                    <span className="text-base">🔒</span>
                    <span>Chef Bems AI is reserved for registered members. Sign in or create an account to start cooking!</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to="/login" className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-extrabold text-amber-950 hover:bg-amber-100 transition shadow-2xs">
                      Sign In
                    </Link>
                    <Link to="/register" className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-xs font-black text-[#0A2E1C] hover:bg-amber-300 transition shadow-xs">
                      Register Free
                    </Link>
                  </div>
                </div>
              )}

              {/* Hidden file input for camera / pantry scanner */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex items-end gap-2 rounded-2xl border border-[#DFD6C2] bg-[#FAF9F6] p-2 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/10 transition shadow-inner">
                {/* Pantry Camera Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Scan pantry ingredients from photo"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-slate-600 hover:text-emerald-900 hover:bg-emerald-50 border border-slate-200 transition disabled:opacity-50"
                  aria-label="Scan pantry photo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </button>

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Chef Bems how to cook Egusi, Jollof, or scan kitchen items..."
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none resize-none leading-relaxed min-h-[24px] max-h-40"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-[#0A2E1C] hover:bg-amber-300 disabled:opacity-35 disabled:hover:bg-amber-400 transition shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>

              <p className="mt-2 text-center text-[10px] text-slate-400">
                Chef Bems provides culinary guidance. Always verify recipe ingredients, pricing, and allergy precautions.
              </p>
            </div>
          </div>

        </div>

      </div>
    </PageWrapper>
  );
}
