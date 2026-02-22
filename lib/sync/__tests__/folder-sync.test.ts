import foldersFixture from "@/__fixtures__/folders.json";

import { syncFolders } from "../folder-sync";
import { fetchFolders } from "@/lib/discogs/endpoints";
import { db } from "@/db/client";

jest.mock("@/db/client", () => {
  const mockDb = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockReturnThis(),
    run: jest.fn(),
  };
  return {
    db: mockDb,
    expo: {
      withTransactionSync: jest.fn((fn: () => void) => fn()),
    },
  };
});

jest.mock("@/db/schema", () => ({
  folders: { id: "id" },
}));

jest.mock("@/lib/discogs/endpoints", () => ({
  fetchFolders: jest.fn(),
}));

const mockFetchFolders = fetchFolders as jest.MockedFunction<typeof fetchFolders>;
const mockDb = db as any;

const mockCallbacks = {
  setPhase: jest.fn(),
};

describe("syncFolders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.onConflictDoUpdate.mockReturnThis();
  });

  it("sets sync phase to folders via callback", async () => {
    mockFetchFolders.mockResolvedValue({ folders: [] });

    await syncFolders("rlustin", undefined, mockCallbacks);

    expect(mockCallbacks.setPhase).toHaveBeenCalledWith("folders");
  });

  it("upserts Jungle folder via onConflictDoUpdate", async () => {
    const jungleFolder = foldersFixture.folders.find((f) => f.name === "Jungle")!;
    mockFetchFolders.mockResolvedValue({
      folders: [jungleFolder],
    });

    await syncFolders("rlustin");

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith({
      id: 9182214,
      name: "Jungle",
      count: 29,
    });
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith({
      target: "id",
      set: { name: "Jungle", count: 29 },
    });
  });

  it("upserts Ambient folder via onConflictDoUpdate", async () => {
    const ambientFolder = foldersFixture.folders.find((f) => f.name === "Ambient")!;
    mockFetchFolders.mockResolvedValue({
      folders: [ambientFolder],
    });

    await syncFolders("rlustin");

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith({
      id: 9182196,
      name: "Ambient",
      count: 15,
    });
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith({
      target: "id",
      set: { name: "Ambient", count: 15 },
    });
  });

  it("syncs all 30 real folders from fixture", async () => {
    mockFetchFolders.mockResolvedValue(foldersFixture as any);

    await syncFolders("rlustin");

    // insert called once per folder
    expect(mockDb.values).toHaveBeenCalledTimes(30);
  });
});
