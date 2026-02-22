import type { CollectionRelease } from "@/lib/discogs/types";

// ── Mocks ──────────────────────────────────────────────────
jest.mock("@/db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnValue(null),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    run: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
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

import { mapBasicRelease, syncBasicReleases, syncReleaseDetails } from "../release-sync";
import { getAllFolders } from "@/db/queries/folders";
import { getReleasesNeedingDetailSync } from "@/db/queries/releases";
import { fetchReleasesInFolder, fetchReleaseDetail } from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";
import { db } from "@/db/client";

const mockGetAllFolders = getAllFolders as jest.MockedFunction<typeof getAllFolders>;
const mockGetReleasesNeedingDetailSync = getReleasesNeedingDetailSync as jest.MockedFunction<typeof getReleasesNeedingDetailSync>;
const mockFetchReleasesInFolder = fetchReleasesInFolder as jest.MockedFunction<typeof fetchReleasesInFolder>;
const mockFetchReleaseDetail = fetchReleaseDetail as jest.MockedFunction<typeof fetchReleaseDetail>;

// ── Fixtures ───────────────────────────────────────────────
function makeCollectionRelease(overrides: Partial<CollectionRelease> = {}): CollectionRelease {
  return {
    id: 100,
    instance_id: 1,
    folder_id: 1,
    date_added: "2024-06-01T12:00:00-07:00",
    basic_information: {
      id: 100,
      title: "Test Album",
      year: 2020,
      resource_url: "https://api.discogs.com/releases/100",
      thumb: "https://img.discogs.com/thumb.jpg",
      cover_image: "https://img.discogs.com/cover.jpg",
      artists: [
        { name: "Artist One", id: 1, resource_url: "https://api.discogs.com/artists/1" },
        { name: "Artist Two", id: 2, resource_url: "https://api.discogs.com/artists/2" },
      ],
      labels: [
        { name: "Label A", catno: "LAB-001", resource_url: "https://api.discogs.com/labels/1" },
      ],
      formats: [
        { name: "Vinyl", qty: "1", descriptions: ["LP", "Album"] },
      ],
      genres: ["Electronic"],
      styles: ["Ambient"],
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────
describe("mapBasicRelease", () => {
  beforeEach(() => {
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2025-01-01T00:00:00.000Z");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps all basic fields", () => {
    const release = makeCollectionRelease();
    const result = mapBasicRelease(release, 5);

    expect(result.instanceId).toBe(1);
    expect(result.releaseId).toBe(100);
    expect(result.folderId).toBe(5);
    expect(result.title).toBe("Test Album");
    expect(result.year).toBe(2020);
    expect(result.dateAdded).toBe("2024-06-01T12:00:00-07:00");
    expect(result.thumbUrl).toBe("https://img.discogs.com/thumb.jpg");
    expect(result.coverUrl).toBe("https://img.discogs.com/cover.jpg");
  });

  it("extracts only { name, id } from artists", () => {
    const result = mapBasicRelease(makeCollectionRelease(), 1);
    expect(result.artists).toEqual([
      { name: "Artist One", id: 1 },
      { name: "Artist Two", id: 2 },
    ]);
  });

  it("extracts only { name, catno } from labels", () => {
    const result = mapBasicRelease(makeCollectionRelease(), 1);
    expect(result.labels).toEqual([{ name: "Label A", catno: "LAB-001" }]);
  });

  it("extracts only { name, qty, descriptions } from formats", () => {
    const result = mapBasicRelease(makeCollectionRelease(), 1);
    expect(result.formats).toEqual([
      { name: "Vinyl", qty: "1", descriptions: ["LP", "Album"] },
    ]);
  });

  it("passes through genres and styles arrays", () => {
    const result = mapBasicRelease(makeCollectionRelease(), 1);
    expect(result.genres).toEqual(["Electronic"]);
    expect(result.styles).toEqual(["Ambient"]);
  });

  it("sets basicSyncedAt to current ISO timestamp", () => {
    const result = mapBasicRelease(makeCollectionRelease(), 1);
    expect(result.basicSyncedAt).toBe("2025-01-01T00:00:00.000Z");
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

    await syncBasicReleases("testuser");

    expect(store.setPhase).toHaveBeenCalledWith("basic-releases");
  });

  it("filters out folder 0 (virtual All folder)", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 10 },
      { id: 1, name: "Uncategorized", count: 5 },
      { id: 2, name: "Jazz", count: 5 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("testuser");

    const calledFolderIds = mockFetchReleasesInFolder.mock.calls.map((c) => c[1]);
    expect(calledFolderIds).not.toContain(0);
    expect(calledFolderIds).toContain(1);
    expect(calledFolderIds).toContain(2);
  });

  it("falls back to folder 1 when no custom folders exist", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 5 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 0, urls: {} },
      releases: [],
    });

    await syncBasicReleases("testuser");

    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("testuser", 1, 1);
  });

  it("paginates through all pages", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 1, name: "Uncategorized", count: 3 },
    ]);
    mockFetchReleasesInFolder
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 2, per_page: 2, items: 3, urls: {} },
        releases: [makeCollectionRelease(), makeCollectionRelease({ instance_id: 2 })],
      })
      .mockResolvedValueOnce({
        pagination: { page: 2, pages: 2, per_page: 2, items: 3, urls: {} },
        releases: [makeCollectionRelease({ instance_id: 3 })],
      });

    await syncBasicReleases("testuser");

    expect(mockFetchReleasesInFolder).toHaveBeenCalledTimes(2);
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("testuser", 1, 1);
    expect(mockFetchReleasesInFolder).toHaveBeenCalledWith("testuser", 1, 2);
  });

  it("reports progress via setProgress", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 1, name: "Uncategorized", count: 2 },
    ]);
    mockFetchReleasesInFolder.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 2, urls: {} },
      releases: [makeCollectionRelease(), makeCollectionRelease({ instance_id: 2 })],
    });

    await syncBasicReleases("testuser");

    expect(store.setProgress).toHaveBeenCalledWith(2, 2);
  });
});

describe("syncReleaseDetails", () => {
  const mockDb = db as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the chained mock so .set().where().run() works
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis();
  });

  it("returns 0 when no releases need detail sync", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([]);
    const result = await syncReleaseDetails();
    expect(result).toBe(0);
  });

  it("fetches and updates details for pending releases", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1, releaseId: 100 },
      { instanceId: 2, releaseId: 200 },
    ] as any);

    mockFetchReleaseDetail.mockResolvedValue({
      id: 100,
      title: "Test",
      year: 2020,
      artists: [],
      labels: [],
      formats: [],
      genres: [],
      styles: [],
      tracklist: [{ position: "A1", title: "Track 1", duration: "3:45" }],
      images: [{ type: "primary", uri: "https://img.jpg", uri150: "", width: 600, height: 600, resource_url: "" }],
      videos: [{ uri: "https://youtube.com/v", title: "Video", duration: 240 }],
      community: { rating: { average: 4.2, count: 10 }, have: 50, want: 20 },
      thumb: "",
    });

    const result = await syncReleaseDetails(10);

    expect(result).toBe(2);
    expect(mockFetchReleaseDetail).toHaveBeenCalledTimes(2);
    expect(mockFetchReleaseDetail).toHaveBeenCalledWith(100);
    expect(mockFetchReleaseDetail).toHaveBeenCalledWith(200);
  });

  it("returns count of processed releases", async () => {
    mockGetReleasesNeedingDetailSync.mockReturnValue([
      { instanceId: 1, releaseId: 100 },
    ] as any);

    mockFetchReleaseDetail.mockResolvedValue({
      id: 100,
      title: "T",
      year: 2020,
      artists: [],
      labels: [],
      formats: [],
      genres: [],
      styles: [],
      tracklist: [],
      images: [],
      videos: [],
      community: { rating: { average: 0, count: 0 }, have: 0, want: 0 },
      thumb: "",
    });

    const result = await syncReleaseDetails(5);
    expect(result).toBe(1);
  });
});
