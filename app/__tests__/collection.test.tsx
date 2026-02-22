import React from "react";
import { render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionScreen from "../(tabs)/collection/index";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import foldersFixture from "@/__fixtures__/folders.json";

import { getAllFolders, getFolderThumbnails } from "@/db/queries/folders";
import { getCollectionStats } from "@/db/queries/releases";

jest.mock("@/db/queries/folders", () => ({
  getAllFolders: jest.fn(),
  getFolderThumbnails: jest.fn(),
}));

jest.mock("@/db/queries/releases", () => ({
  getCollectionStats: jest.fn(),
}));

jest.mock("@/lib/sync/engine", () => ({
  runFullSync: jest.fn(),
}));

jest.mock("@/components/sync/sync-status-bar", () => ({
  SyncStatusCard: () => null,
}));

const mockGetAllFolders = getAllFolders as jest.MockedFunction<typeof getAllFolders>;
const mockGetFolderThumbnails = getFolderThumbnails as jest.MockedFunction<typeof getFolderThumbnails>;
const mockGetCollectionStats = getCollectionStats as jest.MockedFunction<typeof getCollectionStats>;

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

// Use real folder data, stripping resource_url for the DB shape
const realFolders = foldersFixture.folders.map((f) => ({
  id: f.id,
  name: f.name,
  count: f.count,
}));

describe("CollectionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, username: "rlustin" });
    useSyncStore.setState({
      isSyncing: false,
      phase: "idle",
      progress: null,
      lastFullSyncAt: null,
      error: null,
    });
  });

  it("shows empty state when no folders", async () => {
    mockGetAllFolders.mockReturnValue([]);
    mockGetFolderThumbnails.mockReturnValue({});
    mockGetCollectionStats.mockReturnValue({ totalReleases: 0, totalArtists: 0 });

    renderWithQuery(<CollectionScreen />);

    expect(await screen.findByText("No folders yet")).toBeTruthy();
  });

  it("renders real folder names from Discogs collection", async () => {
    mockGetAllFolders.mockReturnValue(realFolders);
    mockGetFolderThumbnails.mockReturnValue({});
    mockGetCollectionStats.mockReturnValue({ totalReleases: 429, totalArtists: 200 });

    renderWithQuery(<CollectionScreen />);

    // FlatList only renders visible items — assert on folders near the top
    expect(await screen.findByText("All")).toBeTruthy();
    expect(screen.getByText("Ambient")).toBeTruthy();
    expect(screen.getByText("Breakbeat & Breaks")).toBeTruthy();
    expect(screen.getByText("Drum & Bass")).toBeTruthy();
    expect(screen.getByText("Dubstep")).toBeTruthy();
  });

  it("renders real folder counts", async () => {
    mockGetAllFolders.mockReturnValue(realFolders);
    mockGetFolderThumbnails.mockReturnValue({});
    mockGetCollectionStats.mockReturnValue({ totalReleases: 429, totalArtists: 200 });

    renderWithQuery(<CollectionScreen />);

    await screen.findByText("All");
    // Ambient has 15 releases
    expect(screen.getByText(/15 releases/)).toBeTruthy();
    // Breakbeat & Breaks has 19 releases
    expect(screen.getByText(/19 releases/)).toBeTruthy();
  });
});
