import { create } from "zustand";

export interface OffMetaActivity { id: number; user_id: number; app_name: string; event_type: string; event_id: string; event_at: string; }

interface OffMetaState {
  activities: OffMetaActivity[];
  loading: boolean;
  error: string | null;
  fetchOffMeta: (token: string) => Promise<void>;
}

export const useOffMetaStore = create<OffMetaState>((set) => ({
  activities: [],
  loading: false,
  error: null,
  fetchOffMeta: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/off-meta-activity", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch off-meta activity");
      const data = await res.json();
      set({ activities: data ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
