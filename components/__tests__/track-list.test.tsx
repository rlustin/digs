import React from "react";
import { render, screen } from "@testing-library/react-native";
import { TrackList } from "../release/track-list";
import releaseDetailFixture from "@/__fixtures__/release-detail.json";

const realTracks = releaseDetailFixture.tracklist.map((t) => ({
  position: t.position,
  title: t.title,
  duration: t.duration,
}));

describe("TrackList", () => {
  it("renders nothing when tracks is empty", () => {
    const { toJSON } = render(<TrackList tracks={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("renders Fracture — 0860 tracklist from real data", () => {
    render(<TrackList tracks={realTracks} />);

    expect(screen.getByText("Tracklist")).toBeTruthy();
    expect(screen.getByText("A1")).toBeTruthy();
    expect(screen.getByText("0860")).toBeTruthy();
    expect(screen.getByText("A2")).toBeTruthy();
    expect(screen.getByText("Buzzing Crew")).toBeTruthy();
    expect(screen.getByText("B1")).toBeTruthy();
    expect(screen.getByText("Booyaka Style")).toBeTruthy();
    expect(screen.getByText("D2")).toBeTruthy();
    expect(screen.getByText("Kinda Late For A Sunday Night")).toBeTruthy();
  });

  it("renders all 8 tracks", () => {
    render(<TrackList tracks={realTracks} />);

    // Check all track positions from A1 to D2
    for (const track of realTracks) {
      expect(screen.getByText(track.position)).toBeTruthy();
      expect(screen.getByText(track.title)).toBeTruthy();
    }
  });
});
