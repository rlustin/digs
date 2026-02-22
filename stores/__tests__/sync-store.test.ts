import { useSyncStore } from "../sync-store";

describe("useSyncStore", () => {
  beforeEach(() => {
    useSyncStore.setState({
      isSyncing: false,
      phase: "idle",
      progress: null,
      lastFullSyncAt: null,
      error: null,
    });
  });

  it("has correct initial state", () => {
    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(false);
    expect(state.phase).toBe("idle");
    expect(state.progress).toBeNull();
    expect(state.lastFullSyncAt).toBeNull();
    expect(state.error).toBeNull();
  });

  it("setPhase updates phase and clears error", () => {
    useSyncStore.setState({ error: "something broke" });
    useSyncStore.getState().setPhase("folders");
    const state = useSyncStore.getState();
    expect(state.phase).toBe("folders");
    expect(state.error).toBeNull();
  });

  it("setProgress sets current and total", () => {
    useSyncStore.getState().setProgress(5, 100);
    const state = useSyncStore.getState();
    expect(state.progress).toEqual({ current: 5, total: 100 });
  });

  it("setSyncing toggles the flag", () => {
    useSyncStore.getState().setSyncing(true);
    expect(useSyncStore.getState().isSyncing).toBe(true);
    useSyncStore.getState().setSyncing(false);
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it("setError sets phase to error, stores message, and stops syncing", () => {
    useSyncStore.setState({ isSyncing: true, phase: "folders" });
    useSyncStore.getState().setError("network failure");
    const state = useSyncStore.getState();
    expect(state.phase).toBe("error");
    expect(state.error).toBe("network failure");
    expect(state.isSyncing).toBe(false);
  });

  it("setLastFullSyncAt stores ISO date", () => {
    const date = "2025-01-15T10:30:00.000Z";
    useSyncStore.getState().setLastFullSyncAt(date);
    expect(useSyncStore.getState().lastFullSyncAt).toBe(date);
  });

  it("reset clears syncing/phase/progress/error but preserves lastFullSyncAt", () => {
    useSyncStore.setState({
      isSyncing: true,
      phase: "basic-releases",
      progress: { current: 50, total: 200 },
      error: "oops",
      lastFullSyncAt: "2025-01-15T10:30:00.000Z",
    });
    useSyncStore.getState().reset();
    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(false);
    expect(state.phase).toBe("idle");
    expect(state.progress).toBeNull();
    expect(state.error).toBeNull();
    expect(state.lastFullSyncAt).toBe("2025-01-15T10:30:00.000Z");
  });

  it("startSync sets isSyncing and returns an AbortController", () => {
    const controller = useSyncStore.getState().startSync();
    const state = useSyncStore.getState();
    expect(state.isSyncing).toBe(true);
    expect(state.abortController).toBe(controller);
    expect(controller).toBeInstanceOf(AbortController);
  });

  it("cancelSync aborts the controller and resets state", () => {
    const controller = useSyncStore.getState().startSync();
    const abortSpy = jest.spyOn(controller, "abort");

    useSyncStore.getState().cancelSync();
    const state = useSyncStore.getState();

    expect(abortSpy).toHaveBeenCalled();
    expect(state.isSyncing).toBe(false);
    expect(state.phase).toBe("idle");
    expect(state.abortController).toBeNull();
  });
});
