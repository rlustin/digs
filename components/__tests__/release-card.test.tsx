import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { ReleaseCard } from "../release/release-card";
import collectionFixture from "@/__fixtures__/collection-releases.json";

const mockRouter = (useRouter as jest.Mock)();

// Real releases from the fixture
const timReaper = collectionFixture.releases[0].basic_information;
const fracture = collectionFixture.releases[2].basic_information;

describe("ReleaseCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Tim Reaper — AMENFR001 title", () => {
    render(
      <ReleaseCard
        releaseId={timReaper.id}
        title={timReaper.title}
        artists={timReaper.artists.map((a) => ({ name: a.name, id: a.id }))}
        year={timReaper.year}
        formats={timReaper.formats}
        thumbUrl={timReaper.thumb}
      />,
    );
    expect(screen.getByText("AMENFR001")).toBeTruthy();
  });

  it("renders artist name", () => {
    render(
      <ReleaseCard
        releaseId={timReaper.id}
        title={timReaper.title}
        artists={timReaper.artists.map((a) => ({ name: a.name, id: a.id }))}
        year={timReaper.year}
        formats={timReaper.formats}
        thumbUrl={timReaper.thumb}
      />,
    );
    expect(screen.getByText("Tim Reaper")).toBeTruthy();
  });

  it("renders year", () => {
    render(
      <ReleaseCard
        releaseId={fracture.id}
        title={fracture.title}
        artists={fracture.artists.map((a) => ({ name: a.name, id: a.id }))}
        year={fracture.year}
        formats={fracture.formats}
        thumbUrl={fracture.thumb}
      />,
    );
    expect(screen.getByText("2022")).toBeTruthy();
  });

  it("renders format descriptions from real data", () => {
    render(
      <ReleaseCard
        releaseId={timReaper.id}
        title={timReaper.title}
        artists={timReaper.artists.map((a) => ({ name: a.name, id: a.id }))}
        year={timReaper.year}
        formats={timReaper.formats}
        thumbUrl={timReaper.thumb}
      />,
    );
    expect(screen.getByText('12", 33 ⅓ RPM, EP, Limited Edition')).toBeTruthy();
  });

  it("shows 'Unknown Artist' when artists is null", () => {
    render(
      <ReleaseCard
        releaseId={fracture.id}
        title={fracture.title}
        artists={null}
        year={fracture.year}
        formats={fracture.formats}
        thumbUrl={fracture.thumb}
      />,
    );
    expect(screen.getByText("Unknown Artist")).toBeTruthy();
  });

  it("navigates to release detail on press", () => {
    render(
      <ReleaseCard
        releaseId={25213822}
        title={fracture.title}
        artists={fracture.artists.map((a) => ({ name: a.name, id: a.id }))}
        year={fracture.year}
        formats={fracture.formats}
        thumbUrl={fracture.thumb}
      />,
    );
    fireEvent.press(screen.getByText("0860"));
    expect(mockRouter.push).toHaveBeenCalledWith("/release/25213822");
  });
});
