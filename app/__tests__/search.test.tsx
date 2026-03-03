import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import SearchScreen from "../(tabs)/search";
import { searchReleases } from "@/db/queries/releases";

jest.mock("@/db/queries/releases", () => ({
  searchReleases: jest.fn().mockReturnValue([]),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    isFocused: jest.fn().mockReturnValue(true),
    addListener: jest.fn().mockReturnValue(() => {}),
  }),
}));

const mockSearchReleases = searchReleases as jest.MockedFunction<
  typeof searchReleases
>;

describe("SearchScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSearchReleases.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders search input with placeholder", () => {
    render(<SearchScreen />);
    expect(
      screen.getByPlaceholderText("Search artists, albums, labels...")
    ).toBeTruthy();
  });

  it("shows no results empty state after typing with no matches", () => {
    render(<SearchScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search artists, albums, labels..."),
      "nonexistent"
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText("No results")).toBeTruthy();
  });

  it("shows results when searchReleases returns data", () => {
    mockSearchReleases.mockReturnValue([
      {
        instanceId: 1,
        releaseId: 100,
        folderId: 1,
        title: "0860",
        year: 2022,
        artists: [{ name: "Fracture", id: 434256 }],
        labels: [{ name: "Astrophonica", catno: "APHA0860" }],
        formats: [{ name: "Vinyl", qty: "2", descriptions: ["12\""] }],
        genres: ["Electronic"],
        styles: ["Jungle"],
        thumbUrl: "https://img/thumb.jpg",
        coverUrl: null,
        dateAdded: "2022-01-01",
      },
    ]);

    render(<SearchScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search artists, albums, labels..."),
      "fracture"
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText("0860")).toBeTruthy();
  });

  it("debounces input — only calls search once after settling", () => {
    render(<SearchScreen />);

    const input = screen.getByPlaceholderText(
      "Search artists, albums, labels..."
    );

    fireEvent.changeText(input, "d");
    fireEvent.changeText(input, "dr");
    fireEvent.changeText(input, "dru");
    fireEvent.changeText(input, "drum");

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // searchReleases should have been called once with "drum", not 4 times
    expect(mockSearchReleases).toHaveBeenCalledTimes(1);
    expect(mockSearchReleases).toHaveBeenCalledWith("drum");
  });

  it("does not search for empty/whitespace-only queries", () => {
    render(<SearchScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search artists, albums, labels..."),
      "   "
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockSearchReleases).not.toHaveBeenCalled();
  });
});
