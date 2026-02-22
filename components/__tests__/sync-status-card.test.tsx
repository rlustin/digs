import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SyncStatusCard } from "../sync/sync-status-bar";
import { useSyncStore } from "@/stores/sync-store";

describe("SyncStatusCard", () => {
  beforeEach(() => {
    useSyncStore.setState({
      isSyncing: false,
      phase: "idle",
      progress: null,
      lastFullSyncAt: null,
      error: null,
    });
  });

  it("renders nothing when phase is idle", () => {
    const { toJSON } = render(<SyncStatusCard />);
    expect(toJSON()).toBeNull();
  });

  it("renders sync label when syncing folders", () => {
    useSyncStore.setState({ phase: "folders" });
    render(<SyncStatusCard />);
    expect(screen.getByText("Syncing folders")).toBeTruthy();
  });

  it("renders sync label when syncing basic releases", () => {
    useSyncStore.setState({ phase: "basic-releases" });
    render(<SyncStatusCard />);
    expect(screen.getByText("Syncing collection")).toBeTruthy();
  });

  it("renders progress percentage", () => {
    useSyncStore.setState({
      phase: "basic-releases",
      progress: { current: 50, total: 200 },
    });
    render(<SyncStatusCard />);
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("renders error message in error state", () => {
    useSyncStore.setState({ phase: "error", error: "Network failure" });
    render(<SyncStatusCard />);
    expect(screen.getByText("Network failure")).toBeTruthy();
  });

  it("calls reset when dismiss button pressed in error state", () => {
    useSyncStore.setState({ phase: "error", error: "Failed" });
    render(<SyncStatusCard />);
    // The dismiss button renders an X icon
    fireEvent.press(screen.getByTestId("icon-X"));
    // After reset, phase should be idle
    expect(useSyncStore.getState().phase).toBe("idle");
  });
});
