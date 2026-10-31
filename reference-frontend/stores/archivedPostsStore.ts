import { create } from "zustand";

export interface ArchivedPost { id: number; user_id: number; uri: string; caption: string; taken_at: string; }

interface ArchivedPostsState {
  posts: ArchivedPost[];
  loading: boolean;
  error: string | null;
  fetchArchivedPosts: (token: string) => Promise<void>;
}

export const useArchivedPostsStore = create<ArchivedPostsState>((set) => ({
  posts: [],
  loading: false,
  error: null,
  fetchArchivedPosts: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/archived-posts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch archived posts");
      const data = await res.json();
      set({ posts: data ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
