import foldersFixture from "@/__fixtures__/folders.json";
import collectionFixture from "@/__fixtures__/collection-releases.json";
import releaseDetailFixture from "@/__fixtures__/release-detail.json";
import { fetchFolders, fetchReleasesInFolder, fetchReleaseDetail } from "../endpoints";

jest.mock("../client", () => ({
  discogsRequest: jest.fn(),
}));

import { discogsRequest } from "../client";

const mockDiscogsRequest = discogsRequest as jest.MockedFunction<typeof discogsRequest>;

describe("endpoints", () => {
  beforeEach(() => {
    mockDiscogsRequest.mockClear();
  });

  describe("fetchFolders", () => {
    it("calls the correct path and returns real folder data", async () => {
      mockDiscogsRequest.mockResolvedValue(foldersFixture);

      const result = await fetchFolders("rlustin");

      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/rlustin/collection/folders"
      );
      expect(result.folders).toHaveLength(30);
      expect(result.folders[0]).toEqual(
        expect.objectContaining({ id: 0, name: "All", count: 429 })
      );
    });
  });

  describe("fetchReleasesInFolder", () => {
    it("builds correct query string with defaults", async () => {
      mockDiscogsRequest.mockResolvedValue(collectionFixture);

      const result = await fetchReleasesInFolder("rlustin", 9182214);

      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/rlustin/collection/folders/9182214/releases?per_page=100&page=1"
      );
      expect(result.releases).toHaveLength(3);
      expect(result.releases[0].basic_information.title).toBe("AMENFR001");
    });

    it("builds correct query string with custom page and perPage", () => {
      mockDiscogsRequest.mockResolvedValue(collectionFixture);

      fetchReleasesInFolder("rlustin", 9182214, 2, 50);

      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/rlustin/collection/folders/9182214/releases?per_page=50&page=2"
      );
    });
  });

  describe("fetchReleaseDetail", () => {
    it("calls the correct path and returns real release detail", async () => {
      mockDiscogsRequest.mockResolvedValue(releaseDetailFixture);

      const result = await fetchReleaseDetail(25213822);

      expect(mockDiscogsRequest).toHaveBeenCalledWith("/releases/25213822");
      expect(result.title).toBe("0860");
      expect(result.tracklist).toHaveLength(8);
      expect(result.tracklist[0].title).toBe("0860");
      expect(result.community.rating.average).toBe(4.83);
      expect(result.community.have).toBe(416);
    });
  });
});
