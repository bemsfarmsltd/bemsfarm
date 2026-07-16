import { create } from "zustand";
import { persist } from "zustand/middleware";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: `Welcome! I'm **Chef Bems** 👨‍🍳 — your personal Nigerian kitchen AI.\n\nI can help you with:\n• Recipes for any Nigerian dish\n• What to cook with ingredients you have\n• Healthy meal planning\n• Cooking tips and substitutions\n\nWhat would you like to cook today?`,
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

      setMessages: (messages) => set({ messages }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      
      clearChat: () => {
        set({
          messages: [WELCOME_MESSAGE],
          sessionId: generateSessionId(),
        });
      },
    }),
    {
      name: "chef-bems-chat-storage", // localStorage key
    }
  )
);
