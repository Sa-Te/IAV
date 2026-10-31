import { create } from "zustand";

export interface AIInterest { id: number; user_id: number; interest_description: string; detected_at: string; }
export interface UserTopic { id: number; user_id: number; topic_name: string; }
export interface InferredLocation { id: number; user_id: number; city_name: string; }

interface TopicsState {
  ai_interests: AIInterest[];
  topics: UserTopic[];
  inferred_location: InferredLocation | null;
  locations_of_interest: string[];
  loading: boolean;
  error: string | null;
  fetchTopics: (token: string) => Promise<void>;
}

export const useTopicsStore = create<TopicsState>((set) => ({
  ai_interests: [],
  topics: [],
  inferred_location: null,
  locations_of_interest: [],
  loading: false,
  error: null,
  fetchTopics: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/topics", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch topics");
      const data = await res.json();
      set({ ai_interests: data.ai_interests ?? [], topics: data.topics ?? [], inferred_location: data.inferred_location ?? null, locations_of_interest: data.locations_of_interest ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
