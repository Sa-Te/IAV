import { create } from "zustand";

export interface UserProfile { id: number; user_id: number; email: string; phone_number: string; username: string; bio: string; gender: string; date_of_birth: string; profile_photo_uri: string; }
export interface ProfileChange { id: number; user_id: number; field_changed: string; previous_value: string; new_value: string; changed_at: string; }
export interface ProfilePhoto { id: number; user_id: number; photo_uri: string; set_at: string; }

interface ProfileState {
  profile: UserProfile | null;
  changes: ProfileChange[];
  photos: ProfilePhoto[];
  loading: boolean;
  error: string | null;
  fetchProfile: (token: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  changes: [],
  photos: [],
  loading: false,
  error: null,
  fetchProfile: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      set({ profile: data.profile ?? null, changes: data.changes ?? [], photos: data.photos ?? [], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
