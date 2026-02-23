import { runFullSync, runIncrementalSync, runDetailSyncLoop, runDetailSyncBatch } from "../engine";
import { syncFolders } from "../folder-sync";
import { syncBasicReleases, syncBasicReleasesIncremental, syncReleaseDetails } from "../release-sync";
import { useSyncStore } from "@/stores/sync-store";
import { useAuthStore } from "@/stores/auth-store";
import { AuthExpiredError } from "@/lib/discogs/errors";
import { logout } from "@/lib/discogs/oauth";
import { queryClient } from "@/lib/query-client";

jest.mock("../folder-sync", () => ({
  syncFolders: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../release-sync", () => ({
  syncBasicReleases: jest.fn().mockResolvedValue(undefined),
  syncBasicReleasesIncremental: jest.fn().mockResolvedValue(undefined),
  syncReleaseDetails: jest.fn().mockResolvedValue({ processed: 0, failed: 0 }),
}));

jest.mock("@/lib/discogs/oauth", () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/stores/auth-store", () => {
  const state = { clearAuth: jest.fn() };
  return {
    useAuthStore: { getState: () => state },
  };
});

jest.mock("@/stores/sync-store", () => {
  const state = {
    isSyncing: false,
    setSyncing: jest.fn(),
    setPhase: jest.fn(),
    setProgress: jest.fn(),
    setLastFullSyncAt: jest.fn(),
    setError: jest.fn(),
    setDetailSyncFailed: jest.fn(),
    finishSync: jest.fn(),
    startSync: jest.fn(() => new AbortController()),
  };
  return {
    useSyncStore: { getState: () => state },
  };
});

jest.mock("@/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockSyncFolders = syncFolders as jest.MockedFunction<typeof syncFolders>;
const mockSyncBasicReleases = syncBasicReleases as jest.MockedFunction<typeof syncBasicReleases>;
const mockSyncBasicReleasesIncremental = syncBasicReleasesIncremental as jest.MockedFunction<typeof syncBasicReleasesIncremental>;
const mockSyncReleaseDetails = syncReleaseDetails as jest.MockedFunction<typeof syncReleaseDetails>;
const mockInvalidateQueries = queryClient.invalidateQueries as jest.MockedFunction<typeof queryClient.invalidateQueries>;

describe("runFullSync", () => {
  const store = useSyncStore.getState();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (store as any).isSyncing = false;
    (store.startSync as jest.Mock).mockReturnValue(new AbortController());
    mockSyncFolders.mockResolvedValue(undefined);
    mockSyncBasicReleases.mockResolvedValue(undefined);
    mockSyncReleaseDetails.mockResolvedValue({ processed: 0, failed: 0 } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("no-ops when already syncing", async () => {
    (store as any).isSyncing = true;

    await runFullSync("testuser");

    expect(mockSyncFolders).not.toHaveBeenCalled();
    expect(store.startSync).not.toHaveBeenCalled();
  });

  it("runs pipeline in order: folders → basic releases → detail loop", async () => {
    const callOrder: string[] = [];
    mockSyncFolders.mockImplementation(async () => { callOrder.push("folders"); });
    mockSyncBasicReleases.mockImplementation(async () => { callOrder.push("basic-releases"); });
    mockSyncReleaseDetails.mockImplementation(async () => {
      callOrder.push("details");
      return { processed: 0, failed: 0 };
    });

    await runFullSync("testuser");

    expect(callOrder).toEqual(["folders", "basic-releases", "details"]);
  });

  it("keeps isSyncing true during detail sync loop", async () => {
    let finishedDuringDetails = false;
    mockSyncReleaseDetails.mockImplementation(async () => {
      finishedDuringDetails = (store.finishSync as jest.Mock).mock.calls.length > 0;
      return { processed: 0, failed: 0 };
    });

    await runFullSync("testuser");

    expect(finishedDuringDetails).toBe(false);
    // finishSync is called after detail loop completes
    expect(store.finishSync).toHaveBeenCalled();
  });

  it("sets phase to details before running detail sync loop", async () => {
    await runFullSync("testuser");

    expect(store.setPhase).toHaveBeenCalledWith("details");
  });

  it("invalidates query cache after folders and releases stages", async () => {
    await runFullSync("testuser");

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["releases"] });
  });

  it("records lastFullSyncAt on success", async () => {
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2025-02-01T00:00:00.000Z");

    await runFullSync("testuser");

    expect(store.setLastFullSyncAt).toHaveBeenCalledWith("2025-02-01T00:00:00.000Z");
    jest.restoreAllMocks();
  });

  it("sets error on failure", async () => {
    mockSyncFolders.mockRejectedValue(new Error("network down"));

    await runFullSync("testuser");

    expect(store.setError).toHaveBeenCalledWith("network down");
  });

  it("calls logout and clearAuth on auth expiry", async () => {
    mockSyncFolders.mockRejectedValue(new AuthExpiredError());

    await runFullSync("testuser");

    expect(logout).toHaveBeenCalled();
    expect(useAuthStore.getState().clearAuth).toHaveBeenCalled();
    expect(store.finishSync).toHaveBeenCalled();
  });

  it("passes signal and callbacks to sync functions", async () => {
    await runFullSync("testuser");

    expect(mockSyncFolders).toHaveBeenCalledWith(
      "testuser",
      expect.any(AbortSignal),
      expect.objectContaining({ setPhase: expect.any(Function), setProgress: expect.any(Function) }),
    );
    expect(mockSyncBasicReleases).toHaveBeenCalledWith(
      "testuser",
      expect.any(AbortSignal),
      expect.objectContaining({ setPhase: expect.any(Function), setProgress: expect.any(Function) }),
    );
  });
});

describe("runDetailSyncLoop", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loops until syncReleaseDetails returns 0", async () => {
    mockSyncReleaseDetails
      .mockResolvedValueOnce({ processed: 10, failed: 0 } as any)
      .mockResolvedValueOnce({ processed: 5, failed: 0 } as any)
      .mockResolvedValueOnce({ processed: 0, failed: 0 } as any);

    const promise = runDetailSyncLoop();

    // Advance through the 12s pauses between batches
    await jest.advanceTimersByTimeAsync(12500);
    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(3);
  });

  it("stops after maxBatches even if more data is available", async () => {
    mockSyncReleaseDetails.mockResolvedValue({ processed: 10, failed: 0 } as any);

    const promise = runDetailSyncLoop(undefined, 3);

    await jest.advanceTimersByTimeAsync(12500);
    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(3);
  });

  it("pauses 12s between batches", async () => {
    mockSyncReleaseDetails
      .mockResolvedValueOnce({ processed: 10, failed: 0 } as any)
      .mockResolvedValueOnce({ processed: 0, failed: 0 } as any);

    const promise = runDetailSyncLoop();

    // First batch completes, then 12s pause
    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(2);
  });

  it("invalidates queries once at the end, not per batch", async () => {
    mockSyncReleaseDetails
      .mockResolvedValueOnce({ processed: 10, failed: 0 } as any)
      .mockResolvedValueOnce({ processed: 5, failed: 0 } as any)
      .mockResolvedValueOnce({ processed: 0, failed: 0 } as any);

    const promise = runDetailSyncLoop();

    await jest.advanceTimersByTimeAsync(12500);
    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    const releaseCalls = mockInvalidateQueries.mock.calls.filter(
      (c) => (c[0] as any).queryKey[0] === "releases"
    );
    expect(releaseCalls).toHaveLength(1);
  });

  it("does not invalidate queries when no releases were processed", async () => {
    mockSyncReleaseDetails.mockResolvedValue({ processed: 0, failed: 0 } as any);

    await runDetailSyncLoop();

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("logs and breaks on error", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSyncReleaseDetails.mockRejectedValue(new Error("oops"));

    await expect(runDetailSyncLoop()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      "Detail sync loop stopped:",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it("stops when signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await runDetailSyncLoop(controller.signal);

    expect(mockSyncReleaseDetails).not.toHaveBeenCalled();
  });
});

describe("runIncrementalSync", () => {
  const store = useSyncStore.getState();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (store as any).isSyncing = false;
    (store as any).lastFullSyncAt = "2025-01-15T00:00:00.000Z";
    (store.startSync as jest.Mock).mockReturnValue(new AbortController());
    mockSyncFolders.mockResolvedValue(undefined);
    mockSyncBasicReleasesIncremental.mockResolvedValue(undefined);
    mockSyncReleaseDetails.mockResolvedValue({ processed: 0, failed: 0 } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("no-ops when already syncing", async () => {
    (store as any).isSyncing = true;

    await runIncrementalSync("testuser");

    expect(mockSyncFolders).not.toHaveBeenCalled();
  });

  it("no-ops when lastFullSyncAt is not set", async () => {
    (store as any).lastFullSyncAt = null;

    await runIncrementalSync("testuser");

    expect(mockSyncFolders).not.toHaveBeenCalled();
  });

  it("calls syncBasicReleasesIncremental with lastFullSyncAt", async () => {
    await runIncrementalSync("testuser");

    expect(mockSyncBasicReleasesIncremental).toHaveBeenCalledWith(
      "testuser",
      "2025-01-15T00:00:00.000Z",
      expect.any(AbortSignal),
      expect.objectContaining({ setPhase: expect.any(Function) }),
    );
  });

  it("runs pipeline: folders → incremental releases → detail loop", async () => {
    const callOrder: string[] = [];
    mockSyncFolders.mockImplementation(async () => { callOrder.push("folders"); });
    mockSyncBasicReleasesIncremental.mockImplementation(async () => { callOrder.push("incremental-releases"); });
    mockSyncReleaseDetails.mockImplementation(async () => {
      callOrder.push("details");
      return { processed: 0, failed: 0 };
    });

    await runIncrementalSync("testuser");

    expect(callOrder).toEqual(["folders", "incremental-releases", "details"]);
  });

  it("updates lastFullSyncAt on success", async () => {
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2025-02-01T00:00:00.000Z");

    await runIncrementalSync("testuser");

    expect(store.setLastFullSyncAt).toHaveBeenCalledWith("2025-02-01T00:00:00.000Z");
    jest.restoreAllMocks();
  });

  it("sets error on failure", async () => {
    mockSyncFolders.mockRejectedValue(new Error("network down"));

    await runIncrementalSync("testuser");

    expect(store.setError).toHaveBeenCalledWith("network down");
  });
});

describe("runDetailSyncBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes batch size through to syncReleaseDetails", async () => {
    mockSyncReleaseDetails.mockResolvedValue({ processed: 5, failed: 0 } as any);

    await runDetailSyncBatch(25);

    expect(mockSyncReleaseDetails).toHaveBeenCalledWith(25);
  });

  it("swallows errors with console.warn", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSyncReleaseDetails.mockRejectedValue(new Error("batch fail"));

    await expect(runDetailSyncBatch()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      "Background detail sync batch failed:",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });
});
