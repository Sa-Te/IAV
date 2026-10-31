import { create } from "zustand";

export interface PostComment { id: number; user_id: number; post_owner_username: string; comment_text: string; commented_at: string; }
export interface ReelComment { id: number; user_id: number; reel_owner_username: string; comment_text: string; commented_at: string; }

interface CommentsState {
  post_comments: PostComment[];
  reel_comments: ReelComment[];
  loading: boolean;
  error: string | null;
  fetchComments: (token: string) => Promise<void>;
}

export const useCommentsStore = create<CommentsState>((set) => ({
  post_comments: [],
  reel_comments: [],
  loading: false,
  error: null,
  fetchComments: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/comments", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      set({ post_comments: data.post_comments ?? [], reel_comments: data.reel_comments ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
