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
  error: string | null;
  fetchMessages: (token: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  conversations: [],
  messages: [],
  activeConversation: null,
  loading: false,
  error: null,
  fetchMessages: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8080/api/v1/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const convs: Conversation[] = data.conversations ?? [];
      set({
        conversations: convs,
        messages: data.messages ?? [],
        activeConversation: convs[0]?.conversation_id ?? null,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  setActiveConversation: (id) => set({ activeConversation: id }),
}));
