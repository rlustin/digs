import releaseDetailFixture from "@/__fixtures__/release-detail.json";
import type { ReleaseDetail } from "@/lib/discogs/types";
import { mapReleaseDetailToRow } from "../detail-mapper";

const fixture = releaseDetailFixture as unknown as ReleaseDetail;

describe("mapReleaseDetailToRow", () => {
  beforeEach(() => {
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-03-03T12:00:00.000Z");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps full detail with all fields present", () => {
    const row = mapReleaseDetailToRow(fixture);

    expect(row.tracklist).toHaveLength(8);
    expect(row.tracklist[0]).toEqual({
      position: "A1",
      title: "0860",
      duration: "",
    });

    expect(row.images).toHaveLength(2);
    expect(row.images![0]).toEqual({
      type: "secondary",
      uri: expect.stringContaining("discogs"),
      width: 600,
      height: 600,
    });

    expect(row.videos).toHaveLength(3);
    expect(row.videos![0]).toEqual({
      uri: "https://www.youtube.com/watch?v=jVR8cO04UQo",
      title: "0860",
      duration: 360,
    });

    expect(row.communityRating).toBe(4.83);
    expect(row.communityHave).toBe(416);
    expect(row.communityWant).toBe(249);
  });

  it("sets detailSyncedAt to current ISO timestamp", () => {
    const row = mapReleaseDetailToRow(fixture);
    expect(row.detailSyncedAt).toBe("2026-03-03T12:00:00.000Z");
  });

  it("handles missing optional fields", () => {
    const minimal: ReleaseDetail = {
      ...fixture,
      images: undefined as unknown as ReleaseDetail["images"],
      videos: undefined as unknown as ReleaseDetail["videos"],
      community: undefined as unknown as ReleaseDetail["community"],
    };

    const row = mapReleaseDetailToRow(minimal);

    expect(row.images).toBeUndefined();
    expect(row.videos).toBeUndefined();
    expect(row.communityRating).toBeNull();
    expect(row.communityHave).toBeNull();
    expect(row.communityWant).toBeNull();
    expect(row.detailSyncedAt).toBe("2026-03-03T12:00:00.000Z");
  });

  it("handles empty tracklist", () => {
    const noTracks: ReleaseDetail = {
      ...fixture,
      tracklist: [],
    };

    const row = mapReleaseDetailToRow(noTracks);
    expect(row.tracklist).toEqual([]);
  });
});
