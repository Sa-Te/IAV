import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  setToken: (newToken: string | null) => void;
  isHydrating: boolean;
  setHydrated: () => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (newToken) => set({ token: newToken }),
      isHydrating: true,
      setHydrated: () => set({ isHydrating: false }),
      logout: () => set({ token: null }),
    }),
    {
      name: "authToken",
      onRehydrateStorage: () => {
        return (state) => state?.setHydrated();
      },
      partialize: (state) => ({ token: state.token }),
    }
  )
);
