import { create } from "zustand";

export interface StoryPoll { id: number; user_id: number; creator_username: string; poll_answer: string; answered_at: string; }
export interface StoryQuiz { id: number; user_id: number; creator_username: string; quiz_answer: string; answered_at: string; }
export interface StoryQuestion { id: number; user_id: number; creator_username: string; responded_at: string; }
export interface StoryEmojiSlider { id: number; user_id: number; creator_username: string; slider_value: number; responded_at: string; }
export interface StoryReaction { id: number; user_id: number; creator_username: string; responded_at: string; }

interface StoryState {
  polls: StoryPoll[];
  quizzes: StoryQuiz[];
  questions: StoryQuestion[];
  emoji_sliders: StoryEmojiSlider[];
  reactions: StoryReaction[];
  loading: boolean;
  error: string | null;
  fetchStoryInteractions: (token: string) => Promise<void>;
}

export const useStoryStore = create<StoryState>((set) => ({
  polls: [],
  quizzes: [],
  questions: [],
  emoji_sliders: [],
  reactions: [],
  loading: false,
  error: null,
  fetchStoryInteractions: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8080/api/v1/story-interactions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch story interactions");
      const data = await res.json();
      set({ polls: data.polls ?? [], quizzes: data.quizzes ?? [], questions: data.questions ?? [], emoji_sliders: data.emoji_sliders ?? [], reactions: data.reactions ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
