import { create } from "zustand";

interface MediaState {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  activeTab: "Posts",
  setActiveTab: (tabName) => set({ activeTab: tabName }),
  currentView: "Grid",
  setCurrentView: (view) => set({ currentView: view }),
}));
