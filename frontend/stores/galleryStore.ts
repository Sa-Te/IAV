import { create } from "zustand";

export interface MediaItem {
  id: number;
  user_id: number;
  uri: string;
  caption: string;
  taken_at: string;
  media_type: string;
}

interface GalleryState {
  items: MediaItem[];
  loading: boolean;
  error: string | null;
  activeTab: string;
  currentView: string;
  selectedIndex: number | null;
  fetchMedia: (token: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
  setCurrentView: (view: string) => void;
  setSelectedIndex: (i: number | null) => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  activeTab: "Posts",
  currentView: "Grid",
  selectedIndex: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedIndex: (i) => set({ selectedIndex: i }),

  fetchMedia: async (token) => {
    if (get().items.length > 0) return; // already cached
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/media", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load media");
      const data: MediaItem[] = await res.json();
      const unique = Array.from(new Map(data.map((i) => [i.id, i])).values());
      set({ items: unique, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
