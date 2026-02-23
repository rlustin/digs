import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const KEY_LAST_FULL_SYNC_AT = "last_full_sync_at";

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
  finishSync: () => void;
  setLastFullSyncAt: (date: string) => void;
  restoreLastFullSyncAt: () => Promise<void>;
  clearLastFullSyncAt: () => void;
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
  finishSync: () => set({ isSyncing: false, phase: "idle", progress: null, abortController: null }),
  setLastFullSyncAt: (date) => {
    set({ lastFullSyncAt: date });
    SecureStore.setItemAsync(KEY_LAST_FULL_SYNC_AT, date).catch((e) =>
      console.warn("Failed to persist lastFullSyncAt:", e)
    );
  },
  restoreLastFullSyncAt: async () => {
    const date = await SecureStore.getItemAsync(KEY_LAST_FULL_SYNC_AT);
    if (date) set({ lastFullSyncAt: date });
  },
  clearLastFullSyncAt: () => {
    set({ lastFullSyncAt: null });
    SecureStore.deleteItemAsync(KEY_LAST_FULL_SYNC_AT).catch((e) =>
      console.warn("Failed to delete lastFullSyncAt:", e)
    );
  },
  startSync: () => {
    const { abortController: previous } = get();
    if (previous) previous.abort();
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
