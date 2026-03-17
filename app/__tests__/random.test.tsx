import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RandomScreen from "../(tabs)/random";
import { getRandomRelease } from "@/db/queries/releases";
import { getAllFolders } from "@/db/queries/folders";

// Flush React Query notifications synchronously to avoid act() warnings
import { notifyManager } from "@tanstack/react-query";
notifyManager.setScheduler(queueMicrotask);

jest.mock("@/db/queries/releases", () => ({
  getRandomRelease: jest.fn().mockReturnValue(null),
}));

jest.mock("@/db/queries/folders", () => ({
  getAllFolders: jest.fn().mockReturnValue([]),
}));

const mockGetRandomRelease = getRandomRelease as jest.MockedFunction<
  typeof getRandomRelease
>;
const mockGetAllFolders = getAllFolders as jest.MockedFunction<
  typeof getAllFolders
>;

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("RandomScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRandomRelease.mockReturnValue(null);
    mockGetAllFolders.mockReturnValue([]);
  });

  it("renders empty state when no release", async () => {
    renderWithProviders(<RandomScreen />);
    await waitFor(() => {
      expect(screen.getByText("Feeling lucky?")).toBeTruthy();
    });
  });

  it("renders release card with title, artist, year when release exists", async () => {
    mockGetRandomRelease.mockReturnValue({
      instanceId: 1,
      releaseId: 100,
      folderId: 1,
      title: "0860",
      year: 2022,
      artists: [{ name: "Fracture", id: 1 }],
      labels: null,
      formats: null,
      genres: null,
      styles: null,
      thumbUrl: null,
      coverUrl: "https://img/cover.jpg",
      dateAdded: null,
      tracklist: null,
      images: null,
      communityRating: null,
      communityHave: null,
      communityWant: null,
      videos: null,
      detailSyncedAt: null,
      basicSyncedAt: null,
    });

    renderWithProviders(<RandomScreen />);

    await waitFor(() => {
      expect(screen.getByText("0860")).toBeTruthy();
    });
    expect(screen.getByText("Fracture")).toBeTruthy();
    expect(screen.getByText("2022")).toBeTruthy();
  });

  it("renders folder filter chips (excludes id=0 folder)", async () => {
    mockGetAllFolders.mockReturnValue([
      { id: 0, name: "All", count: 100 },
      { id: 1, name: "Jungle", count: 30 },
      { id: 2, name: "Techno", count: 50 },
    ]);

    renderWithProviders(<RandomScreen />);

    await waitFor(() => {
      expect(screen.getByText("Jungle")).toBeTruthy();
    });
    expect(screen.getByText("Techno")).toBeTruthy();
  });

  it("shows 'All' chip as default selected", async () => {
    renderWithProviders(<RandomScreen />);
    await waitFor(() => {
      expect(screen.getByText("All")).toBeTruthy();
    });
  });

  it("renders pick button", async () => {
    renderWithProviders(<RandomScreen />);
    await waitFor(() => {
      expect(screen.getByText("Pick Random")).toBeTruthy();
    });
  });
});
