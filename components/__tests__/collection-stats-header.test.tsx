import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CollectionStatsHeader } from "../collection/collection-stats-header";

describe("CollectionStatsHeader", () => {
  it("renders nothing when totalReleases is 0", () => {
    const { toJSON } = render(
      <CollectionStatsHeader totalReleases={0} totalArtists={0} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders release count", () => {
    render(<CollectionStatsHeader totalReleases={42} totalArtists={15} />);
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders artist count", () => {
    render(<CollectionStatsHeader totalReleases={42} totalArtists={15} />);
    expect(screen.getByText("15")).toBeTruthy();
  });
});
