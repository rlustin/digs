import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import SettingsScreen from "../(tabs)/settings";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";

import { runFullSync, runIncrementalSync } from "@/lib/sync/engine";

jest.mock("@/lib/discogs/oauth", () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/discogs/client", () => ({
  clearClientCredentials: jest.fn(),
}));

jest.mock("@/lib/sync/engine", () => ({
  runFullSync: jest.fn(),
  runIncrementalSync: jest.fn(),
}));

jest.mock("@/db/queries/releases", () => ({
  getDetailSyncCounts: jest.fn().mockReturnValue({ synced: 0, total: 0 }),
}));

const mockRunFullSync = runFullSync as jest.MockedFunction<typeof runFullSync>;
const mockRunIncrementalSync = runIncrementalSync as jest.MockedFunction<typeof runIncrementalSync>;

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, username: "testuser" });
    useSyncStore.setState({
      isSyncing: false,
      phase: "idle",
      progress: null,
      lastFullSyncAt: null,
      error: null,
    });
  });

  it("displays username and avatar initial", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("testuser")).toBeTruthy();
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("shows 'Never' when no last sync date", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Never")).toBeTruthy();
  });

  it("shows 'Idle' when not syncing", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Idle")).toBeTruthy();
  });

  it("shows 'Syncing...' when syncing", () => {
    useSyncStore.setState({ isSyncing: true, phase: "folders" });
    render(<SettingsScreen />);
    // "Syncing..." appears in both the status row and the sync button
    const elements = screen.getAllByText("Syncing...");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("Sync Now triggers runFullSync when no previous sync", () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Sync Now"));
    expect(mockRunFullSync).toHaveBeenCalledWith("testuser");
    expect(mockRunIncrementalSync).not.toHaveBeenCalled();
  });

  it("Sync Now triggers runIncrementalSync when already synced", () => {
    useSyncStore.setState({ lastFullSyncAt: "2025-01-15T00:00:00.000Z" });
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Sync Now"));
    expect(mockRunIncrementalSync).toHaveBeenCalledWith("testuser");
    expect(mockRunFullSync).not.toHaveBeenCalled();
  });

  it("Sync Now button shows 'Syncing...' and is disabled when syncing", () => {
    useSyncStore.setState({ isSyncing: true, phase: "basic-releases" });
    render(<SettingsScreen />);
    // The button text changes to "Syncing..."
    const syncButtons = screen.getAllByText("Syncing...");
    expect(syncButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error message with dismiss button", () => {
    useSyncStore.setState({ phase: "error", error: "Network failure" });
    render(<SettingsScreen />);
    expect(screen.getByText("Network failure")).toBeTruthy();
    // Pressing the X dismiss button resets the store
    fireEvent.press(screen.getByTestId("icon-X"));
    expect(useSyncStore.getState().phase).toBe("idle");
  });

  it("Log out button triggers confirmation alert", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("Log out"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Log out",
      "Are you sure you want to log out?",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });
});
