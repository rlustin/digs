import { create } from "zustand";

export type SyncPhase = "idle" | "folders" | "basic-releases" | "details" | "error";

interface SyncState {
  isSyncing: boolean;
  phase: SyncPhase;
  progress: { current: number; total: number } | null;
  lastFullSyncAt: string | null;
  error: string | null;
  setPhase: (phase: SyncPhase) => void;
  setProgress: (current: number, total: number) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  setLastFullSyncAt: (date: string) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  phase: "idle",
  progress: null,
  lastFullSyncAt: null,
  error: null,
  setPhase: (phase) => set({ phase, error: null }),
  setProgress: (current, total) => set({ progress: { current, total } }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ phase: "error", error, isSyncing: false }),
  setLastFullSyncAt: (date) => set({ lastFullSyncAt: date }),
  reset: () =>
    set({ isSyncing: false, phase: "idle", progress: null, error: null }),
}));
