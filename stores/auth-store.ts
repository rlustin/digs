import { create } from "zustand";

const SCREENSHOT_MODE =
  process.env.EXPO_PUBLIC_SCREENSHOT_MODE === "true";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  setAuthenticated: (username: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: SCREENSHOT_MODE,
  username: SCREENSHOT_MODE ? "digs_demo" : null,
  setAuthenticated: (username) => set({ isAuthenticated: true, username }),
  clearAuth: () => set({ isAuthenticated: false, username: null }),
}));
