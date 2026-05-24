import { create } from "zustand";

// Matches the Go model models.ActivityLog
interface ActivityLog {
  id: number;
  user_id: number;
  activity_type: string;
  author: string | null;
  timestamp: string;
  details: string | null;
}

export type ActivityType =
  | "ad_viewed"
  | "post_viewed"
  | "video_watched"
  | "suggested_profile_viewed"
  | "post_not_interested";

interface ActivityState {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  activeTab: ActivityType;
  fetchActivities: (token: string) => Promise<void>;
  setActiveTab: (tab: ActivityType) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loading: true,
  error: null,
  activeTab: "ad_viewed",

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchActivities: async (token) => {
    // Only fetch if the data isn't already loaded.
    if (get().activities.length > 0) {
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/v1/activity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Failed to fetch activity from server.");
      const data: ActivityLog[] = await response.json();
      set({ activities: data, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      set({ error: errorMessage, loading: false });
      console.error("Failed to fetch activity log:", error);
    }
  },
}));
