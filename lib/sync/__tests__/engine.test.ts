import { runFullSync, runDetailSyncLoop, runDetailSyncBatch } from "../engine";
import { syncFolders } from "../folder-sync";
import { syncBasicReleases, syncReleaseDetails } from "../release-sync";
import { useSyncStore } from "@/stores/sync-store";
import { queryClient } from "@/lib/query-client";

jest.mock("../folder-sync", () => ({
  syncFolders: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../release-sync", () => ({
  syncBasicReleases: jest.fn().mockResolvedValue(undefined),
  syncReleaseDetails: jest.fn().mockResolvedValue(0),
}));

jest.mock("@/stores/sync-store", () => {
  const state = {
    isSyncing: false,
    setSyncing: jest.fn(),
    setPhase: jest.fn(),
    setLastFullSyncAt: jest.fn(),
    setError: jest.fn(),
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
    mockSyncReleaseDetails.mockResolvedValue(0);
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
      return 0;
    });

    await runFullSync("testuser");

    expect(callOrder).toEqual(["folders", "basic-releases", "details"]);
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

  it("sets error and stops syncing on failure", async () => {
    mockSyncFolders.mockRejectedValue(new Error("network down"));

    await runFullSync("testuser");

    expect(store.setError).toHaveBeenCalledWith("network down");
    expect(store.setSyncing).toHaveBeenCalledWith(false);
  });

  it("passes signal to sync functions", async () => {
    await runFullSync("testuser");

    expect(mockSyncFolders).toHaveBeenCalledWith("testuser", expect.any(AbortSignal));
    expect(mockSyncBasicReleases).toHaveBeenCalledWith("testuser", expect.any(AbortSignal));
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
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    const promise = runDetailSyncLoop();

    // Advance through the 12s pauses between batches
    await jest.advanceTimersByTimeAsync(12500);
    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(3);
  });

  it("pauses 12s between batches", async () => {
    mockSyncReleaseDetails
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0);

    const promise = runDetailSyncLoop();

    // First batch completes, then 12s pause
    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(12500);

    await promise;

    expect(mockSyncReleaseDetails).toHaveBeenCalledTimes(2);
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

describe("runDetailSyncBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes batch size through to syncReleaseDetails", async () => {
    mockSyncReleaseDetails.mockResolvedValue(5);

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
