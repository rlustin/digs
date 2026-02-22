jest.mock("@/db/client", () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    run: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
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

jest.mock("@/stores/sync-store", () => {
  const state = {
    setPhase: jest.fn(),
  };
  return {
    useSyncStore: { getState: () => state },
  };
});

import { syncFolders } from "../folder-sync";
import { fetchFolders } from "@/lib/discogs/endpoints";
import { useSyncStore } from "@/stores/sync-store";
import { db } from "@/db/client";

const mockFetchFolders = fetchFolders as jest.MockedFunction<typeof fetchFolders>;
const mockDb = db as any;

describe("syncFolders", () => {
  const store = useSyncStore.getState();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
  });

  it("sets sync phase to folders", async () => {
    mockFetchFolders.mockResolvedValue({ folders: [] });

    await syncFolders("testuser");

    expect(store.setPhase).toHaveBeenCalledWith("folders");
  });

  it("inserts new folders when no existing row", async () => {
    mockDb.get.mockReturnValue(null);
    mockFetchFolders.mockResolvedValue({
      folders: [
        { id: 1, name: "Uncategorized", count: 10, resource_url: "" },
      ],
    });

    await syncFolders("testuser");

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith({
      id: 1,
      name: "Uncategorized",
      count: 10,
    });
  });

  it("updates existing folders when row exists", async () => {
    mockDb.get.mockReturnValue({ id: 1, name: "Old Name", count: 5 });
    mockFetchFolders.mockResolvedValue({
      folders: [
        { id: 1, name: "New Name", count: 15, resource_url: "" },
      ],
    });

    await syncFolders("testuser");

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith({ name: "New Name", count: 15 });
  });
});
