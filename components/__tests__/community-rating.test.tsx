import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CommunityRating } from "../release/community-rating";
import releaseDetailFixture from "@/__fixtures__/release-detail.json";

const { community } = releaseDetailFixture;

describe("CommunityRating", () => {
  it("renders nothing when all props are null", () => {
    const { toJSON } = render(
      <CommunityRating rating={null} have={null} want={null} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders Fracture — 0860 rating of 4.83", () => {
    render(
      <CommunityRating
        rating={community.rating.average}
        have={null}
        want={null}
      />,
    );
    expect(screen.getByText("4.8")).toBeTruthy();
  });

  it("renders have count from real data (416)", () => {
    render(
      <CommunityRating rating={null} have={community.have} want={null} />,
    );
    expect(screen.getByText(/have/)).toBeTruthy();
  });

  it("renders want count from real data (249)", () => {
    render(
      <CommunityRating rating={null} have={null} want={community.want} />,
    );
    expect(screen.getByText(/want/)).toBeTruthy();
  });

  it("renders all community fields together", () => {
    render(
      <CommunityRating
        rating={community.rating.average}
        have={community.have}
        want={community.want}
      />,
    );
    expect(screen.getByText("4.8")).toBeTruthy();
    expect(screen.getByText(/have/)).toBeTruthy();
    expect(screen.getByText(/want/)).toBeTruthy();
  });
});
