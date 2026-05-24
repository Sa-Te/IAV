import { create } from "zustand";

interface AdInterests {
  advertisers: string[];
  topics: string[];
}

interface InterestState {
  interests: AdInterests | null;
  loading: boolean;
  error: string | null;
  fetchInterests: (token: string) => Promise<void>;
}

export const useInterestStore = create<InterestState>((set, get) => ({
  interests: null,
  loading: true,
  error: null,

  fetchInterests: async (token) => {
    if (get().interests) {
      set({ loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await fetch(
        "http://localhost:8080/api/v1/ad-interests",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok)
        throw new Error("Failed to fetch ad interests from server.");
      const data: AdInterests = await response.json();
      set({ interests: data, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      set({ error: errorMessage, loading: false });
      console.error("Failed to fetch ad interests:", error);
    }
  },
}));
