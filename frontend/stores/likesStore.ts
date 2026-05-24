import { create } from "zustand";

export interface PostLike { id: number; user_id: number; creator_username: string; post_url: string; liked_at: string; }
export interface CommentLike { id: number; user_id: number; owner_username: string; post_url: string; liked_at: string; }
export interface StoryLike { id: number; user_id: number; creator_username: string; liked_at: string; }

interface LikesState {
  post_likes: PostLike[];
  comment_likes: CommentLike[];
  story_likes: StoryLike[];
  loading: boolean;
  error: string | null;
  fetchLikes: (token: string) => Promise<void>;
}

export const useLikesStore = create<LikesState>((set) => ({
  post_likes: [],
  comment_likes: [],
  story_likes: [],
  loading: false,
  error: null,
  fetchLikes: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8080/api/v1/likes", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch likes");
      const data = await res.json();
      set({ post_likes: data.post_likes ?? [], comment_likes: data.comment_likes ?? [], story_likes: data.story_likes ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
