import { create } from "zustand";
import { persist } from "zustand/middleware";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: `Welcome! I am **Chef Bems**, your Nigerian culinary and pantry specialist from Bems Farms.\n\nI can assist you with:\n• Authentic recipes for any Nigerian soup, stew, rice, or swallow\n• Smart meal suggestions based on ingredients in your kitchen\n• Healthy weekly Nigerian meal planning and nutrition advice\n• Cooking substitutions and stone-free grain preparation\n\nWhat dish would you like to prepare today?`,
  timestamp: new Date().toISOString(),
};

function generateSessionId() {
  return "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
}

export const useChefStore = create(
  persist(
    (set, get) => ({
      messages: [WELCOME_MESSAGE],
      sessionId: generateSessionId(),
      conversations: [],
      activeConversationId: null,

      setMessages: (messages) => set({ messages }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      
      setConversations: (conversations) => set({ conversations }),
      addConversation: (conv) => set((state) => {
        // Avoid duplicate conversations
        if (state.conversations.some(c => c.id === conv.id || c.session_id === conv.session_id)) {
          return {};
        }
        return { conversations: [conv, ...state.conversations] };
      }),
      updateConversationTitle: (id, newTitle) => set((state) => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, title: newTitle } : c)
      })),
      removeConversation: (id) => set((state) => {
        const conversations = state.conversations.filter(c => c.id !== id);
        // If we deleted the currently active conversation, reset current chat too
        const isCurrentActive = state.activeConversationId === id;
        if (isCurrentActive) {
          return {
            conversations,
            messages: [WELCOME_MESSAGE],
            sessionId: generateSessionId(),
            activeConversationId: null,
          };
        }
        return { conversations };
      }),
      
      clearChat: () => {
        set({
          messages: [WELCOME_MESSAGE],
          sessionId: generateSessionId(),
          activeConversationId: null,
        });
      },
    }),
    {
      name: "chef-bems-chat-storage", // localStorage key
      // Only persist messages, sessionId and activeConversationId for local guest experience.
      // Conversations list is dynamically loaded from the server when logged in.
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
