import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CollectionScreen from "../(tabs)/collection/index";
import FolderReleasesScreen from "../(tabs)/collection/[folderId]";
import ReleaseDetailScreen from "../release/[releaseId]";
import { FloatingTabBar } from "@/components/ui/tab-bar";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import foldersFixture from "@/__fixtures__/folders.json";

import { getAllFolders, getFolderThumbnails, getFolderById } from "@/db/queries/folders";
import { getCollectionStats, getReleasesByFolder, getReleaseByReleaseId } from "@/db/queries/releases";

// ── Mocks ──────────────────────────────────────────────────
jest.mock("@/db/queries/folders", () => ({
  getAllFolders: jest.fn(),
  getFolderThumbnails: jest.fn(),
  getFolderById: jest.fn(),
}));

jest.mock("@/db/queries/releases", () => ({
  getCollectionStats: jest.fn(),
  getReleasesByFolder: jest.fn(),
  getReleaseByReleaseId: jest.fn(),
}));

jest.mock("@/lib/sync/engine", () => ({
  runFullSync: jest.fn(),
  runIncrementalSync: jest.fn(),
}));

jest.mock("@/components/sync/sync-status-bar", () => ({
  SyncStatusCard: () => null,
}));

jest.mock("@/lib/discogs/endpoints", () => ({
  fetchReleaseDetail: jest.fn(),
}));

jest.mock("@/lib/sync/detail-mapper", () => ({
  mapReleaseDetailToRow: jest.fn(),
}));

jest.mock("@/db/schema", () => ({
  releases: { releaseId: "release_id" },
}));

// ── Typed mocks ────────────────────────────────────────────
const mockGetAllFolders = getAllFolders as jest.MockedFunction<typeof getAllFolders>;
const mockGetFolderThumbnails = getFolderThumbnails as jest.MockedFunction<typeof getFolderThumbnails>;
const mockGetFolderById = getFolderById as jest.MockedFunction<typeof getFolderById>;
const mockGetCollectionStats = getCollectionStats as jest.MockedFunction<typeof getCollectionStats>;
const mockGetReleasesByFolder = getReleasesByFolder as jest.MockedFunction<typeof getReleasesByFolder>;
const mockGetReleaseByReleaseId = getReleaseByReleaseId as jest.MockedFunction<typeof getReleaseByReleaseId>;

// ── Helpers ────────────────────────────────────────────────
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

// ── Fixture data ───────────────────────────────────────────
const ambientFolder = { id: 9182196, name: "Ambient", count: 15 };

const fractureRelease = {
  instanceId: 1287191732,
  releaseId: 25213822,
  folderId: 9182196,
  title: "0860",
  year: 2022,
  artists: [{ name: "Fracture (2)", id: 434256 }],
  labels: [{ name: "Astrophonica", catno: "APHA0860" }],
  formats: [{ name: "Vinyl", qty: "2", descriptions: ['12"', "33 ⅓ RPM", "EP"] }],
  genres: ["Electronic"],
  styles: ["Ambient", "Drum n Bass"],
  thumbUrl: "https://example.com/thumb.jpg",
  coverUrl: "https://example.com/cover.jpg",
  dateAdded: "2022-06-30T00:23:57-07:00",
  basicSyncedAt: "2025-01-01T00:00:00.000Z",
  detailSyncedAt: "2025-01-01T00:00:00.000Z",
  tracklist: [{ position: "A1", title: "0860", duration: "5:01" }],
  images: null,
  communityRating: 4.83,
  communityHave: 416,
  communityWant: 248,
  videos: null,
};

const realFolders = foldersFixture.folders.map((f) => ({
  id: f.id,
  name: f.name,
  count: f.count,
}));

// ── Tests ──────────────────────────────────────────────────
describe("Collection navigation flow", () => {
  const mockRouter = require("expo-router").useRouter();
  const { useLocalSearchParams } = require("expo-router");

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
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it("navigates from folder list to Ambient folder", async () => {
    mockGetAllFolders.mockReturnValue(realFolders);
    mockGetFolderThumbnails.mockReturnValue({});
    mockGetCollectionStats.mockReturnValue({ totalReleases: 429, totalArtists: 200 });

    renderWithQuery(<CollectionScreen />);

    fireEvent.press(await screen.findByText("Ambient"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/collection/9182196");
  });

  it("navigates from Ambient folder to Fracture — 0860", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ folderId: "9182196" });
    mockGetAllFolders.mockReturnValue([ambientFolder]);
    mockGetReleasesByFolder.mockReturnValue([fractureRelease]);

    renderWithQuery(<FolderReleasesScreen />);

    fireEvent.press(await screen.findByText("0860"));

    expect(mockRouter.push).toHaveBeenCalledWith("/release/25213822");
  });

  it("navigates from release detail back to Ambient folder via badge", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ releaseId: "25213822" });
    mockGetReleaseByReleaseId.mockReturnValue(fractureRelease);
    mockGetFolderById.mockReturnValue(ambientFolder);

    renderWithQuery(<ReleaseDetailScreen />);

    fireEvent.press(await screen.findByText("Ambient"));

    expect(mockRouter.navigate).toHaveBeenCalledWith("/(tabs)/collection/9182196");
  });

  it("resets collection stack when tapping focused Collection tab", () => {
    const nestedStateKey = "collection-stack-123";

    let defaultPrevented = false;
    const mockEvent = {
      get defaultPrevented() { return defaultPrevented; },
      preventDefault: jest.fn(() => { defaultPrevented = true; }),
    };

    const mockNavigation = {
      emit: jest.fn(() => mockEvent),
      navigate: jest.fn(),
      dispatch: jest.fn(),
    };

    const tabState = {
      index: 0,
      routes: [
        {
          key: "collection-route-key",
          name: "collection",
          state: {
            key: nestedStateKey,
            index: 1,
            routes: [
              { key: "idx", name: "index" },
              { key: "folder", name: "[folderId]" },
            ],
          },
        },
      ],
    };

    const descriptors = {
      "collection-route-key": {
        options: {
          tabBarIcon: ({ color }: { color: string }) =>
            React.createElement("Text", {}, "icon"),
          title: "Collection",
        },
      },
    };

    render(
      <FloatingTabBar
        state={tabState as any}
        descriptors={descriptors as any}
        navigation={mockNavigation as any}
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      />,
    );

    fireEvent.press(screen.getByText("Collection"));

    // Prevents native stack's popToTop from firing in the next rAF
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    // Dispatches reset targeting the nested collection stack
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ target: nestedStateKey }),
    );

    // Does not switch tabs — we're already on collection
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});
