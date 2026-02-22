import { create } from "zustand";

export type SyncPhase = "idle" | "folders" | "basic-releases" | "details" | "error";

interface SyncState {
  isSyncing: boolean;
  phase: SyncPhase;
  progress: { current: number; total: number } | null;
  lastFullSyncAt: string | null;
  error: string | null;
  abortController: AbortController | null;
  setPhase: (phase: SyncPhase) => void;
  setProgress: (current: number, total: number) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  setLastFullSyncAt: (date: string) => void;
  startSync: () => AbortController;
  cancelSync: () => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  phase: "idle",
  progress: null,
  lastFullSyncAt: null,
  error: null,
  abortController: null,
  setPhase: (phase) => set({ phase, error: null }),
  setProgress: (current, total) => set({ progress: { current, total } }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ phase: "error", error, isSyncing: false }),
  setLastFullSyncAt: (date) => set({ lastFullSyncAt: date }),
  startSync: () => {
    const controller = new AbortController();
    set({ isSyncing: true, abortController: controller });
    return controller;
  },
  cancelSync: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({ isSyncing: false, phase: "idle", progress: null, error: null, abortController: null });
  },
  reset: () =>
    set({ isSyncing: false, phase: "idle", progress: null, error: null, abortController: null }),
}));
