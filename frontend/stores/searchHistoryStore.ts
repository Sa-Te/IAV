import { create } from "zustand";

export interface SearchEntry { id: number; user_id: number; search_query: string; search_type: string; searched_at: string; }

interface SearchHistoryState {
  entries: SearchEntry[];
  loading: boolean;
  error: string | null;
  fetchSearchHistory: (token: string) => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set) => ({
  entries: [],
  loading: false,
  error: null,
  fetchSearchHistory: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8080/api/v1/search-history", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch search history");
      const data = await res.json();
      set({ entries: data ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
