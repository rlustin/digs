import { Image } from "expo-image";
import { getAllImageUrls, prefetchImages, runImageCacheSync } from "../image-cache";
import { db } from "@/db/client";

jest.mock("expo-image", () => ({
  Image: {
    prefetch: jest.fn().mockResolvedValue(true),
    clearDiskCache: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("@/db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    all: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("@/db/schema", () => ({
  releases: { thumbUrl: "thumb_url", coverUrl: "cover_url" },
}));

const mockDb = db as any;
const mockPrefetch = Image.prefetch as jest.MockedFunction<typeof Image.prefetch>;

describe("getAllImageUrls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty arrays when no releases exist", () => {
    mockDb.all.mockReturnValue([]);

    const { thumbUrls, coverUrls } = getAllImageUrls();

    expect(thumbUrls).toEqual([]);
    expect(coverUrls).toEqual([]);
  });

  it("partitions thumb and cover URLs from rows", () => {
    mockDb.all.mockReturnValue([
      { thumbUrl: "https://img.discogs.com/thumb1.jpg", coverUrl: "https://img.discogs.com/cover1.jpg" },
      { thumbUrl: "https://img.discogs.com/thumb2.jpg", coverUrl: null },
      { thumbUrl: null, coverUrl: "https://img.discogs.com/cover2.jpg" },
    ]);

    const { thumbUrls, coverUrls } = getAllImageUrls();

    expect(thumbUrls).toEqual([
      "https://img.discogs.com/thumb1.jpg",
      "https://img.discogs.com/thumb2.jpg",
    ]);
    expect(coverUrls).toEqual([
      "https://img.discogs.com/cover1.jpg",
      "https://img.discogs.com/cover2.jpg",
    ]);
  });

  it("deduplicates identical URLs across releases", () => {
    mockDb.all.mockReturnValue([
      { thumbUrl: "https://img.discogs.com/shared.jpg", coverUrl: "https://img.discogs.com/cover.jpg" },
      { thumbUrl: "https://img.discogs.com/shared.jpg", coverUrl: "https://img.discogs.com/cover.jpg" },
      { thumbUrl: "https://img.discogs.com/unique.jpg", coverUrl: null },
    ]);

    const { thumbUrls, coverUrls } = getAllImageUrls();

    expect(thumbUrls).toEqual([
      "https://img.discogs.com/shared.jpg",
      "https://img.discogs.com/unique.jpg",
    ]);
    expect(coverUrls).toEqual(["https://img.discogs.com/cover.jpg"]);
  });
});

describe("prefetchImages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls Image.prefetch in batches of 50", async () => {
    const urls = Array.from({ length: 120 }, (_, i) => `https://img.discogs.com/${i}.jpg`);

    await prefetchImages(urls);

    expect(mockPrefetch).toHaveBeenCalledTimes(3);
    expect(mockPrefetch).toHaveBeenNthCalledWith(1, urls.slice(0, 50), { cachePolicy: "disk" });
    expect(mockPrefetch).toHaveBeenNthCalledWith(2, urls.slice(50, 100), { cachePolicy: "disk" });
    expect(mockPrefetch).toHaveBeenNthCalledWith(3, urls.slice(100, 120), { cachePolicy: "disk" });
  });

  it("reports progress after each batch", async () => {
    const urls = Array.from({ length: 120 }, (_, i) => `https://img.discogs.com/${i}.jpg`);
    const setProgress = jest.fn();

    await prefetchImages(urls, undefined, { setProgress });

    expect(setProgress).toHaveBeenCalledTimes(3);
    expect(setProgress).toHaveBeenNthCalledWith(1, 50, 120);
    expect(setProgress).toHaveBeenNthCalledWith(2, 100, 120);
    expect(setProgress).toHaveBeenNthCalledWith(3, 120, 120);
  });

  it("stops when abort signal is triggered between batches", async () => {
    const urls = Array.from({ length: 120 }, (_, i) => `https://img.discogs.com/${i}.jpg`);
    const controller = new AbortController();

    mockPrefetch.mockImplementation(async () => {
      controller.abort();
      return true;
    });

    await prefetchImages(urls, controller.signal);

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });

  it("continues on batch failure", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const urls = Array.from({ length: 100 }, (_, i) => `https://img.discogs.com/${i}.jpg`);

    mockPrefetch
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(true);

    await prefetchImages(urls);

    expect(mockPrefetch).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith("Image prefetch batch failed:", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("handles empty URL array", async () => {
    await prefetchImages([]);

    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});

describe("runImageCacheSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefetches thumbnails first, then covers", async () => {
    mockDb.all.mockReturnValue([
      { thumbUrl: "https://img.discogs.com/thumb1.jpg", coverUrl: "https://img.discogs.com/cover1.jpg" },
      { thumbUrl: "https://img.discogs.com/thumb2.jpg", coverUrl: null },
    ]);

    const callOrder: string[] = [];
    mockPrefetch.mockImplementation(async (urls: any) => {
      const first = urls[0] as string;
      callOrder.push(first.includes("thumb") ? "thumbs" : "covers");
      return true;
    });

    await runImageCacheSync();

    expect(callOrder).toEqual(["thumbs", "covers"]);
  });

  it("skips when no URLs found in database", async () => {
    mockDb.all.mockReturnValue([]);

    await runImageCacheSync();

    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it("respects abort signal between thumbnail and cover phases", async () => {
    mockDb.all.mockReturnValue([
      { thumbUrl: "https://img.discogs.com/thumb1.jpg", coverUrl: "https://img.discogs.com/cover1.jpg" },
    ]);

    const controller = new AbortController();
    mockPrefetch.mockImplementation(async () => {
      controller.abort();
      return true;
    });

    await runImageCacheSync(controller.signal);

    // Only thumbnails prefetched, covers skipped due to abort
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });

  it("reports progress spanning both thumbnail and cover phases", async () => {
    mockDb.all.mockReturnValue([
      { thumbUrl: "https://img.discogs.com/thumb1.jpg", coverUrl: "https://img.discogs.com/cover1.jpg" },
      { thumbUrl: "https://img.discogs.com/thumb2.jpg", coverUrl: "https://img.discogs.com/cover2.jpg" },
    ]);
    const setProgress = jest.fn();

    await runImageCacheSync(undefined, { setProgress });

    // Total = 2 thumbs + 2 covers = 4
    // After thumbs batch: (2, 4)
    // After covers batch: (4, 4)
    expect(setProgress).toHaveBeenCalledWith(2, 4);
    expect(setProgress).toHaveBeenCalledWith(4, 4);
  });
});
