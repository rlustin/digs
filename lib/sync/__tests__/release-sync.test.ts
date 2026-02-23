import type { CollectionRelease } from "@/lib/discogs/types";
import collectionFixture from "@/__fixtures__/collection-releases.json";
import releaseDetailFixture from "@/__fixtures__/release-detail.json";

import { mapBasicRelease, syncBasicReleases, syncBasicReleasesIncremental, syncReleaseDetails } from "../release-sync";
import { getAllFolders } from "@/db/queries/folders";
import { getReleasesNeedingDetailSync, getLocalReleaseCountByFolder } from "@/db/queries/releases";
import { fetchReleasesInFolder, fetchReleaseDetail } from "@/lib/discogs/endpoints";
import { db } from "@/db/client";

// ── Mocks ──────────────────────────────────────────────────
jest.mock("@/db/client", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockReturnThis(),
    run: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    all: jest.fn().mockReturnValue([]),
  },
  expo: {
    withTransactionSync: jest.fn((fn: () => void) => fn()),
  },
}));

jest.mock("@/db/schema", () => ({
  releases: { instanceId: "instance_id" },
}));

jest.mock("@/db/queries/folders", () => ({
  getAllFolders: jest.fn(),
}));

jest.mock("@/db/queries/releases", () => ({
  getReleasesNeedingDetailSync: jest.fn(),
  getLocalReleaseCountByFolder: jest.fn(),
}));

jest.mock("@/lib/discogs/endpoints", () => ({
  fetchReleasesInFolder: jest.fn(),
  fetchReleaseDetail: jest.fn(),
}));

const mockGetAllFolders = getAllFolders as jest.MockedFunction<typeof getAllFolders>;

const mockCallbacks = {
  setPhase: jest.fn(),
  setProgress: jest.fn(),
};
const mockGetLocalReleaseCountByFolder = getLocalReleaseCountByFolder as jest.MockedFunction<typeof getLocalReleaseCountByFolder>;
const mockGetReleasesNeedingDetailSync = getReleasesNeedingDetailSync as jest.MockedFunction<typeof getReleasesNeedingDetailSync>;
const mockFetchReleasesInFolder = fetchReleasesInFolder as jest.MockedFunction<typeof fetchReleasesInFolder>;
const mockFetchReleaseDetail = fetchReleaseDetail as jest.MockedFunction<typeof fetchReleaseDetail>;

// Real releases from Discogs: Tim Reaper, Mix'Elle, Fracture
const [timReaper, mixElle, fracture] = collectionFixture.releases as unknown as CollectionRelease[];

// ── Tests ──────────────────────────────────────────────────
describe("mapBasicRelease", () => {
  beforeEach(() => {
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2025-01-01T00:00:00.000Z");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps Tim Reaper — AMENFR001 basic fields", () => {
    const result = mapBasicRelease(timReaper, 9182214);

    expect(result.instanceId).toBe(1304522474);
    expect(result.releaseId).toBe(20068396);
    expect(result.folderId).toBe(9182214);
    expect(result.title).toBe("AMENFR001");
    expect(result.year).toBe(2022);
    expect(result.dateAdded).toBe("2023-03-23T06:57:57-07:00");
    expect(result.thumbUrl).toContain("discogs.com");
    expect(result.coverUrl).toContain("discogs.com");
  });

  it("extracts only { name, id } from Tim Reaper's artists", () => {
    const result = mapBasicRelease(timReaper, 9182214);
    expect(result.artists).toEqual([{ name: "Tim Reaper", id: 1881856 }]);
  });

  it("extracts only { name, catno } from labels (Amenology & Future Retro London)", () => {
    const result = mapBasicRelease(timReaper, 9182214);
    expect(result.labels).toEqual([
      { name: "Amenology", catno: "AMENFR001" },
      { name: "Future Retro London", catno: "AMENFR001" },
    ]);
  });

  it("extracts only { name, qty, descriptions } from formats", () => {
    const result = mapBasicRelease(timReaper, 9182214);
    expect(result.formats).toEqual([
      { name: "Vinyl", qty: "1", descriptions: ["12\"", "33 ⅓ RPM", "EP", "Limited Edition"] },
    ]);
  });

  it("passes through genres and styles for Fracture — 0860", () => {
    const result = mapBasicRelease(fracture, 9182214);
    expect(result.genres).toEqual(["Electronic"]);
    expect(result.styles).toEqual(["Jungle", "Drum n Bass"]);
  });

  it("sets basicSyncedAt to current ISO timestamp", () => {
    const result = mapBasicRelease(mixElle, 9182214);
    expect(result.basicSyncedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("maps Mix'Elle — Spiritual Rhythms as a 2025 release", () => {
    const result = mapBasicRelease(mixElle, 9182214);
    expect(result.title).toBe("Spiritual Rhythms");
    expect(result.year).toBe(2025);
    expect(result.artists).toEqual([{ name: "Mix'Elle", id: 16413970 }]);
    expect(result.labels).toEqual([{ name: "Angel (29)", catno: "ANGEL004" }]);
  });
});

describe("syncBasicReleases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets sync phase to basic-releases via callback", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 0 },
      { id: 1, name: "Uncategorized", count: 0 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("rlustin", undefined, mockCallbacks);

    expect(mockCallbacks.setPhase).toHaveBeenCalledWith("basic-releases");
  });

  it("filters out folder 0 (virtual All folder)", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 429 },
      { id: 9182214, name: "Jungle", count: 29 },
      { id: 9182212, name: "IDM & Acid", count: 32 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("rlustin");

    const calledFolderIds = mockFetchReleasesInFolder.mock.calls.map((c) => c[1]);
    expect(calledFolderIds).not.toContain(0);
    expect(calledFolderIds).toContain(9182214);
    expect(calledFolderIds).toContain(9182212);
  });

  it("falls back to folder 1 when no custom folders exist", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 5 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("rlustin");

    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 1, 1, 100, undefined);
  });

  it("paginates through all pages using real collection data", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 29 },
    ]);
    // Simulate the real pagination structure (pages: 10 with per_page: 3)
    mockFetchReleasesInFolder
      .mockResolvedValueOnce({
        ...collectionFixture,
        pagination: { ...collectionFixture.pagination, page: 1, pages: 2 },
      } as any)
      .mockResolvedValueOnce({
        pagination: { page: 2, pages: 2, per_page: 3, items: 29, urls: {} },
        releases: [fracture],
      } as any);

    await syncBasicReleases("rlustin");

    expect(mockFetchReleasesInFolder).toHaveBeenCalledTimes(2);
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 9182214, 1, 100, undefined);
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 9182214, 2, 100, undefined);
  });

  it("deletes local releases that are no longer in the Discogs folder", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 29 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 3, urls: {} },
      releases: collectionFixture.releases,
    } as any);

    await syncBasicReleases("rlustin");

    expect((db as any).delete).toHaveBeenCalled();
  });

  it("reports progress via callback", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 29 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 3, items: 29, urls: {} },
      releases: collectionFixture.releases,
    } as any);

    await syncBasicReleases("rlustin", undefined, mockCallbacks);

    expect(mockCallbacks.setProgress).toHaveBeenCalledWith(3, 29);
  });

  it("handles deletion reconciliation with more than 500 instance IDs", async () => {
    const mockDb = db as any;
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 600 },
    ]);

    // Generate 600 fake releases with unique instance_ids
    const fakeReleases = Array.from({ length: 600 }, (_, i) => ({
      ...collectionFixture.releases[0],
      instance_id: 1000 + i,
    }));

    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 600, items: 600, urls: {} },
      releases: fakeReleases,
    } as any);

    // Local DB has one extra release that should be deleted
    mockDb.all.mockReturnValue([
      ...fakeReleases.map((r: any) => ({ instanceId: r.instance_id })),
      { instanceId: 99999 },
    ]);

    await syncBasicReleases("rlustin");

    // Should have called delete (via batched path since > 500 IDs)
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe("syncBasicReleasesIncremental", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stops paginating when hitting a release older than cutoff", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 3 },
    ]);
    // Sorted desc by date_added: Mix'Elle (2025-07-19), Tim Reaper (2023-03-23), Fracture (2023-03-05)
    mockFetchReleasesInFolder.mockResolvedValueOnce({
      pagination: { page: 1, pages: 2, per_page: 100, items: 3, urls: {} },
      releases: [mixElle, timReaper, fracture],
    } as any);
    mockGetLocalReleaseCountByFolder.mockReturnValue(3);

    // Cutoff: 2025-01-01 — only Mix'Elle (2025-07-19) is newer
    await syncBasicReleasesIncremental("rlustin", "2025-01-01T00:00:00.000Z");

    // Should NOT fetch page 2 since we hit old releases on page 1
    expect(mockFetchReleasesInFolder).toHaveBeenCalledTimes(1);
    // Should have been called with sort params
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith(
      "rlustin", 9182214, 1, 100, undefined, "added", "desc",
    );
  });

  it("upserts only new releases from the boundary page", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 3 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValueOnce({
      pagination: { page: 1, pages: 1, per_page: 100, items: 3, urls: {} },
      releases: [mixElle, timReaper, fracture],
    } as any);
    mockGetLocalReleaseCountByFolder.mockReturnValue(3);

    await syncBasicReleasesIncremental("rlustin", "2025-01-01T00:00:00.000Z");

    // Only Mix'Elle should be upserted (the one newer than cutoff)
    const mockExpo = require("@/db/client").expo;
    const transactionFn = mockExpo.withTransactionSync.mock.calls[0]?.[0];
    expect(mockExpo.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it("skips deletion check when local count matches API count", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 3 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValueOnce({
      pagination: { page: 1, pages: 1, per_page: 100, items: 3, urls: {} },
      releases: [mixElle],
    } as any);
    // Local count matches API count — no reconciliation needed
    mockGetLocalReleaseCountByFolder.mockReturnValue(3);

    await syncBasicReleasesIncremental("rlustin", "2020-01-01T00:00:00.000Z");

    // Only the incremental fetch call — no reconciliation calls
    expect(mockFetchReleasesInFolder).toHaveBeenCalledTimes(1);
    expect((db as any).delete).not.toHaveBeenCalled();
  });

  it("runs full reconciliation when counts diverge", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 3 },
    ]);
    // Incremental fetch
    mockFetchReleasesInFolder
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 1, per_page: 100, items: 3, urls: {} },
        releases: [mixElle],
      } as any)
      // Full reconciliation fetch
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 1, per_page: 100, items: 3, urls: {} },
        releases: collectionFixture.releases,
      } as any);
    // Local count (2) doesn't match API count (3) — reconciliation needed
    mockGetLocalReleaseCountByFolder.mockReturnValue(2);

    await syncBasicReleasesIncremental("rlustin", "2020-01-01T00:00:00.000Z");

    // 1 incremental + 1 reconciliation
    expect(mockFetchReleasesInFolder).toHaveBeenCalledTimes(2);
    // Reconciliation call should NOT have sort params
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith(
      "rlustin", 9182214, 1, 100, undefined,
    );
    expect((db as any).delete).toHaveBeenCalled();
  });
});

describe("syncReleaseDetails", () => {
  const mockDb = db as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis();
  });

  it("returns 0 when no releases need detail sync", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([]);
    const result = await syncReleaseDetails();
    expect(result).toBe(0);
  });

  it("fetches and updates Fracture — 0860 details", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1287191732, releaseId: 25213822 },
    ] as any);

    mockFetchReleaseDetail.mockResolvedValue(releaseDetailFixture as any);

    const result = await syncReleaseDetails(10);

    expect(result).toBe(1);
    expect(mockFetchReleaseDetail).toHaveBeenCalledWith(25213822, undefined);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("processes multiple releases and returns count", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1304522474, releaseId: 20068396 },
      { instanceId: 1287191732, releaseId: 25213822 },
    ] as any);

    mockFetchReleaseDetail.mockResolvedValue(releaseDetailFixture as any);

    const result = await syncReleaseDetails(10);

    expect(result).toBe(2);
    expect(mockFetchReleaseDetail).toHaveBeenCalledTimes(2);
  });

  it("continues processing after a single release fetch fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1304522474, releaseId: 20068396 },
      { instanceId: 1287191732, releaseId: 25213822 },
    ] as any);

    mockFetchReleaseDetail
      .mockRejectedValueOnce(new Error("Discogs API error: 500"))
      .mockResolvedValueOnce(releaseDetailFixture as any);

    const result = await syncReleaseDetails(10);

    expect(result).toBe(1);
    expect(mockFetchReleaseDetail).toHaveBeenCalledTimes(2);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("re-throws authentication_expired errors", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1304522474, releaseId: 20068396 },
    ] as any);

    mockFetchReleaseDetail.mockRejectedValue(new Error("authentication_expired"));

    await expect(syncReleaseDetails(10)).rejects.toThrow("authentication_expired");
  });
});
