import { create } from "zustand";

export interface SavedMedia { id: number; user_id: number; creator_username: string; post_url: string; saved_at: string; }
export interface SavedCollection { id: number; user_id: number; collection_name: string; created_at: string; updated_at: string; }
export interface SavedCollectionItem { id: number; user_id: number; collection_name: string; item_url: string; creator_username: string; added_at: string; }

interface SavedState {
  saved_media: SavedMedia[];
  collections: SavedCollection[];
  collection_items: SavedCollectionItem[];
  loading: boolean;
  error: string | null;
  fetchSaved: (token: string) => Promise<void>;
}

export const useSavedStore = create<SavedState>((set) => ({
  saved_media: [],
  collections: [],
  collection_items: [],
  loading: false,
  error: null,
  fetchSaved: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("http://localhost:8080/api/v1/saved", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch saved");
      const data = await res.json();
      set({ saved_media: data.saved_media ?? [], collections: data.collections ?? [], collection_items: data.collection_items ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
