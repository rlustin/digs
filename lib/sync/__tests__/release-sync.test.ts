import type { CollectionRelease } from "@/lib/discogs/types";
import collectionFixture from "@/__fixtures__/collection-releases.json";
import releaseDetailFixture from "@/__fixtures__/release-detail.json";

import { mapBasicRelease, syncBasicReleases, syncReleaseDetails } from "../release-sync";
import { getAllFolders } from "@/db/queries/folders";
import { getReleasesNeedingDetailSync } from "@/db/queries/releases";
import { fetchReleasesInFolder, fetchReleaseDetail } from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";
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
}));

jest.mock("@/lib/discogs/endpoints", () => ({
  fetchReleasesInFolder: jest.fn(),
  fetchReleaseDetail: jest.fn(),
}));

jest.mock("@/stores/sync-store", () => {
  const state = {
    setPhase: jest.fn(),
    setProgress: jest.fn(),
  };
  return {
    useSyncStore: { getState: () => state },
  };
});

const mockGetAllFolders = getAllFolders as jest.MockedFunction<typeof getAllFolders>;
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
  const store = useSyncStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets sync phase to basic-releases", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 0 },
      { id: 1, name: "Uncategorized", count: 0 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("rlustin");

    expect(store.setPhase).toHaveBeenCalledWith("basic-releases");
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

    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 1, 1);
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
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 9182214, 1);
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("rlustin", 9182214, 2);
  });

  it("reports progress via setProgress", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 9182214, name: "Jungle", count: 29 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 3, items: 29, urls: {} },
      releases: collectionFixture.releases,
    } as any);

    await syncBasicReleases("rlustin");

    expect(store.setProgress).toHaveBeenCalledWith(3, 29);
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
    expect(mockFetchReleaseDetail).toHaveBeenCalledWith(25213822);
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
});
