import {
  getAllFolders,
  getFolderById,
  clearAllFolders,
  getFolderThumbnails,
} from "../folders";

// ── Chainable Drizzle mock ──────────────────────────────────

function createChainableMock() {
  const chain: Record<string, jest.Mock> = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.all = jest.fn().mockReturnValue([]);
  chain.get = jest.fn().mockReturnValue(undefined);
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
  eq: jest.fn((a, b) => [a, b]),
}));

jest.mock("@/db/schema", () => ({
  folders: {
    id: "id",
    name: "name",
    count: "count",
  },
}));

describe("getAllFolders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
  });

  it("delegates to db.select and returns results", () => {
    const folders = [
      { id: 0, name: "All", count: 100 },
      { id: 1, name: "Jungle", count: 30 },
    ];
    selectChain.all.mockReturnValue(folders);

    const result = getAllFolders();

    expect(mockDb.select).toHaveBeenCalled();
    expect(selectChain.from).toHaveBeenCalled();
    expect(result).toEqual(folders);
  });
});

describe("getFolderById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectChain.from.mockReturnValue(selectChain);
    selectChain.where.mockReturnValue(selectChain);
  });

  it("returns folder when found", () => {
    const folder = { id: 1, name: "Jungle", count: 30 };
    selectChain.get.mockReturnValue(folder);

    const result = getFolderById(1);

    expect(result).toEqual(folder);
  });

  it("returns null when not found", () => {
    selectChain.get.mockReturnValue(undefined);

    const result = getFolderById(999);

    expect(result).toBeNull();
  });
});

describe("clearAllFolders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls db.delete", () => {
    clearAllFolders();

    expect(mockDb.delete).toHaveBeenCalled();
    expect(deleteChain.run).toHaveBeenCalled();
  });
});

describe("getFolderThumbnails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns grouped thumbnails from raw SQL", () => {
    mockExpo.getAllSync.mockReturnValue([
      { folder_id: 1, thumb_url: "https://img/a.jpg" },
      { folder_id: 1, thumb_url: "https://img/b.jpg" },
      { folder_id: 2, thumb_url: "https://img/c.jpg" },
    ]);

    const result = getFolderThumbnails();

    expect(result).toEqual({
      1: ["https://img/a.jpg", "https://img/b.jpg"],
      2: ["https://img/c.jpg"],
    });
  });

  it("returns empty object when no thumbnails", () => {
    mockExpo.getAllSync.mockReturnValue([]);

    const result = getFolderThumbnails();

    expect(result).toEqual({});
  });
});
