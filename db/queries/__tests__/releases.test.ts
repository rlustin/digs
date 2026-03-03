import {
  clearAllReleases,
  getCollectionStats,
  getDetailSyncCounts,
  getLocalReleaseCountByFolder,
  getRandomRelease,
  getReleaseByReleaseId,
  getReleasesByFolder,
  getReleasesNeedingDetailSync,
  searchReleases,
} from "../releases";

// ── Chainable Drizzle mock ──────────────────────────────────

function createChainableMock(terminal?: unknown) {
  const chain: Record<string, jest.Mock> = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.offset = jest.fn().mockReturnValue(chain);
  chain.all = jest.fn().mockReturnValue(terminal ?? []);
  chain.get = jest.fn().mockReturnValue(terminal ?? undefined);
  chain.run = jest.fn();
  return chain;
}

const selectChain = createChainableMock();
const deleteChain = createChainableMock();

const mockDb = {
  select: jest.fn().mockReturnValue(selectChain),
  delete: jest.fn().mockReturnValue(deleteChain),
};

const mockExpo = {
  getAllSync: jest.fn().mockReturnValue([]),
  getFirstSync: jest.fn().mockReturnValue(null),
  execSync: jest.fn(),
};

jest.mock("@/db/client", () => ({
  get db() {
    return mockDb;
  },
  get expo() {
    return mockExpo;
  },
}));

jest.mock("drizzle-orm", () => ({
  desc: jest.fn((col) => col),
  eq: jest.fn((a, b) => [a, b]),
  sql: jest.fn((...args) => args),
}));

jest.mock("@/db/schema", () => ({
  releases: {
    folderId: "folder_id",
    releaseId: "release_id",
    detailSyncedAt: "detail_synced_at",
  },
}));

describe("getReleasesByFolder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.orderBy.mockReturnValue(selectChain);
    selectChain.limit.mockReturnValue(selectChain);
    selectChain.offset.mockReturnValue(selectChain);
    selectChain.all.mockReturnValue([]);
  });

  it("queries without folder filter when folderId is 0", () => {
    getReleasesByFolder(0);

    expect(mockDb.select).toHaveBeenCalled();
    expect(selectChain.from).toHaveBeenCalled();
    expect(selectChain.where).not.toHaveBeenCalled();
    expect(selectChain.all).toHaveBeenCalled();
  });

  it("applies folder filter when folderId is non-zero", () => {
    getReleasesByFolder(42);

    expect(selectChain.where).toHaveBeenCalled();
    expect(selectChain.all).toHaveBeenCalled();
  });

  it("applies limit and offset", () => {
    getReleasesByFolder(0, { limit: 20, offset: 10 });

    expect(selectChain.limit).toHaveBeenCalledWith(20);
    expect(selectChain.offset).toHaveBeenCalledWith(10);
  });
});

describe("getReleaseByReleaseId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
  });

  it("returns release when found", () => {
    const release = { releaseId: 123, title: "Test" };
    selectChain.get.mockReturnValue(release);

    const result = getReleaseByReleaseId(123);

    expect(result).toEqual(release);
    expect(selectChain.where).toHaveBeenCalled();
  });

  it("returns null when not found", () => {
    selectChain.get.mockReturnValue(undefined);

    const result = getReleaseByReleaseId(999);

    expect(result).toBeNull();
  });
});

describe("getLocalReleaseCountByFolder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
  });

  it("returns count", () => {
    selectChain.get.mockReturnValue({ count: 42 });

    const result = getLocalReleaseCountByFolder(1);

    expect(result).toBe(42);
  });

  it("returns 0 when no row", () => {
    selectChain.get.mockReturnValue(undefined);

    const result = getLocalReleaseCountByFolder(1);

    expect(result).toBe(0);
  });
});

describe("getReleasesNeedingDetailSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.orderBy.mockReturnValue(selectChain);
    selectChain.limit.mockReturnValue(selectChain);
    selectChain.all.mockReturnValue([]);
  });

  it("queries with NULL detailSyncedAt and applies limit", () => {
    getReleasesNeedingDetailSync(5);

    expect(selectChain.where).toHaveBeenCalled();
    expect(selectChain.limit).toHaveBeenCalledWith(5);
    expect(selectChain.all).toHaveBeenCalled();
  });

  it("defaults to limit 10", () => {
    getReleasesNeedingDetailSync();

    expect(selectChain.limit).toHaveBeenCalledWith(10);
  });
});

describe("getDetailSyncCounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
  });

  it("returns total and synced counts", () => {
    selectChain.get.mockReturnValue({ total: 100, synced: 75 });

    const result = getDetailSyncCounts();

    expect(result).toEqual({ total: 100, synced: 75 });
  });

  it("returns zeros when no row", () => {
    selectChain.get.mockReturnValue(undefined);

    const result = getDetailSyncCounts();

    expect(result).toEqual({ total: 0, synced: 0 });
  });
});

describe("searchReleases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty for blank query", () => {
    expect(searchReleases("")).toEqual([]);
    expect(searchReleases("   ")).toEqual([]);
  });

  it("constructs FTS query with prefix matching", () => {
    mockExpo.getAllSync.mockReturnValue([]);

    searchReleases("drum bass");

    expect(mockExpo.getAllSync).toHaveBeenCalledWith(
      expect.stringContaining("releases_fts MATCH"),
      ['"drum"* "bass"*']
    );
  });

  it("maps snake_case to camelCase and parses JSON fields", () => {
    mockExpo.getAllSync.mockReturnValue([
      {
        instance_id: 1,
        release_id: 100,
        folder_id: 2,
        title: "Test Album",
        year: 2022,
        artists: '[{"name":"Artist"}]',
        labels: '[{"name":"Label","catno":"CAT1"}]',
        formats: null,
        genres: '["Electronic"]',
        styles: null,
        thumb_url: "https://img.test/thumb.jpg",
        cover_url: null,
        date_added: "2022-01-01",
      },
    ]);

    const results = searchReleases("test");

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      instanceId: 1,
      releaseId: 100,
      folderId: 2,
      title: "Test Album",
      year: 2022,
      artists: [{ name: "Artist" }],
      labels: [{ name: "Label", catno: "CAT1" }],
      formats: null,
      genres: ["Electronic"],
      styles: null,
      thumbUrl: "https://img.test/thumb.jpg",
      coverUrl: null,
      dateAdded: "2022-01-01",
    });
  });
});

describe("getCollectionStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns release and artist counts", () => {
    mockExpo.getFirstSync
      .mockReturnValueOnce({ total: 200 })
      .mockReturnValueOnce({ total: 50 });

    const result = getCollectionStats();

    expect(result).toEqual({ totalReleases: 200, totalArtists: 50 });
  });

  it("returns zeros when no data", () => {
    mockExpo.getFirstSync.mockReturnValue(null);

    const result = getCollectionStats();

    expect(result).toEqual({ totalReleases: 0, totalArtists: 0 });
  });
});

describe("clearAllReleases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteChain.run.mockReturnValue(undefined);
  });

  it("deletes releases and rebuilds FTS index", () => {
    clearAllReleases();

    expect(mockDb.delete).toHaveBeenCalled();
    expect(deleteChain.run).toHaveBeenCalled();
    expect(mockExpo.execSync).toHaveBeenCalledWith(
      "INSERT INTO releases_fts(releases_fts) VALUES('rebuild')"
    );
  });
});

describe("getRandomRelease", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
    selectChain.orderBy.mockReturnValue(selectChain);
    selectChain.limit.mockReturnValue(selectChain);
  });

  it("queries without folder filter when no folderId", () => {
    selectChain.get.mockReturnValue({ title: "Random" });

    const result = getRandomRelease();

    expect(result).toEqual({ title: "Random" });
    expect(selectChain.where).not.toHaveBeenCalled();
    expect(selectChain.limit).toHaveBeenCalledWith(1);
  });

  it("applies folder filter when folderId is non-zero", () => {
    selectChain.get.mockReturnValue({ title: "Random" });

    getRandomRelease(5);

    expect(selectChain.where).toHaveBeenCalled();
  });

  it("returns null when no release found", () => {
    selectChain.get.mockReturnValue(undefined);

    const result = getRandomRelease();

    expect(result).toBeNull();
  });
});
