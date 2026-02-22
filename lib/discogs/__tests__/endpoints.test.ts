import { fetchFolders, fetchReleasesInFolder, fetchReleaseDetail } from "../endpoints";

jest.mock("../client", () => ({
  discogsRequest: jest.fn().mockResolvedValue({}),
}));

import { discogsRequest } from "../client";

const mockDiscogsRequest = discogsRequest as jest.MockedFunction<typeof discogsRequest>;

describe("endpoints", () => {
  beforeEach(() => {
    mockDiscogsRequest.mockClear();
  });

  describe("fetchFolders", () => {
    it("calls the correct path", () => {
      fetchFolders("testuser");
      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/testuser/collection/folders"
      );
    });
  });

  describe("fetchReleasesInFolder", () => {
    it("builds correct query string with defaults", () => {
      fetchReleasesInFolder("testuser", 1);
      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/testuser/collection/folders/1/releases?per_page=100&page=1"
      );
    });

    it("builds correct query string with custom page and perPage", () => {
      fetchReleasesInFolder("testuser", 3, 2, 50);
      expect(mockDiscogsRequest).toHaveBeenCalledWith(
        "/users/testuser/collection/folders/3/releases?per_page=50&page=2"
      );
    });
  });

  describe("fetchReleaseDetail", () => {
    it("calls the correct path", () => {
      fetchReleaseDetail(12345);
      expect(mockDiscogsRequest).toHaveBeenCalledWith("/releases/12345");
    });
  });
});
