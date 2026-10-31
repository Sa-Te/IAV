import { create } from "zustand";

export interface Conversation {
  id: number;
  user_id: number;
  conversation_id: string;
  participants: string;
  thread_type: string;
}
export interface Message {
  id: number;
  user_id: number;
  conversation_id: string;
  sender_name: string;
  content: string;
  sent_at: string;
}

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  activeConversation: string | null;
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  fetchMessages: (token: string) => Promise<void>;
  fetchConversationMessages: (token: string, conversationId: string) => Promise<void>;
  setActiveConversation: (token: string, id: string | null) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversation: null,
  loading: false,
  loadingMessages: false,
  error: null,

  fetchMessages: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const convs: Conversation[] = data.conversations ?? [];
      const msgs: Message[] = data.messages ?? [];
      const firstConvId = convs[0]?.conversation_id ?? null;
      set({ conversations: convs, messages: msgs, activeConversation: firstConvId, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchConversationMessages: async (token, conversationId) => {
    set({ loadingMessages: true });
    try {
      const res = await fetch(`/api/v1/messages?conversation_id=${encodeURIComponent(conversationId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const newMsgs: Message[] = data.messages ?? [];
      set((state) => {
        const existing = state.messages.filter((m) => m.conversation_id !== conversationId);
        return { messages: [...existing, ...newMsgs], loadingMessages: false };
      });
    } catch {
      set({ loadingMessages: false });
    }
  },

  setActiveConversation: (token, id) => {
    set({ activeConversation: id });
    if (!id) return;
    const loaded = get().messages.filter((m) => m.conversation_id === id);
    if (loaded.length === 0) {
      get().fetchConversationMessages(token, id);
    }
  },
}));
