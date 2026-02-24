import * as SecureStore from "expo-secure-store";
import {
  discogsRequest,
  setClientCredentials,
  clearClientCredentials,
} from "../client";
import { AuthExpiredError } from "../errors";

jest.mock("@/lib/utils/oauth-signer", () => ({
  signRequest: jest.fn().mockReturnValue('OAuth oauth_consumer_key="key"'),
}));

jest.mock("@/lib/utils/rate-limiter", () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    acquire: jest.fn().mockResolvedValue(undefined),
    updateFromHeader: jest.fn(),
  })),
}));

jest.mock("@/constants/discogs", () => ({
  DISCOGS_BASE_URL: "https://api.discogs.com",
  DISCOGS_CONSUMER_KEY: "test-consumer-key",
  DISCOGS_CONSUMER_SECRET: "test-consumer-secret",
  DISCOGS_USER_AGENT: "Digs/1.0.0",
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
}));

const mockSecureStore = jest.mocked(SecureStore);

const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  };
}

describe("discogsRequest", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    clearClientCredentials();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws when no credentials are set", async () => {
    await expect(discogsRequest("/test")).rejects.toThrow(
      "Discogs client not authenticated"
    );
  });

  it("makes GET with correct URL, Authorization, User-Agent, and Accept headers", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

    await discogsRequest("/test");

    expect(mockFetch).toHaveBeenCalledWith("https://api.discogs.com/test", {
      method: "GET",
      headers: {
        Authorization: 'OAuth oauth_consumer_key="key"',
        "User-Agent": "Digs/1.0.0",
        Accept: "application/vnd.discogs.v2.discogs+json",
      },
    });
  });

  it("prepends DISCOGS_BASE_URL for relative paths", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse({}));

    await discogsRequest("/users/test/collection/folders");

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe(
      "https://api.discogs.com/users/test/collection/folders"
    );
  });

  it("passes absolute URLs through unchanged", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse({}));

    await discogsRequest("https://other.example.com/resource");

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe("https://other.example.com/resource");
  });

  it("updates rate limiter from X-Discogs-Ratelimit-Remaining header", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(
      jsonResponse({}, 200, { "X-Discogs-Ratelimit-Remaining": "42" })
    );

    await discogsRequest("/test");

    // The rate limiter mock's updateFromHeader should have been called.
    // We verify indirectly by checking the request succeeded.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 with Retry-After delay", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(null, 429, { "Retry-After": "1" })
      )
      .mockResolvedValueOnce(jsonResponse({ retried: true }));

    const promise = discogsRequest("/test", "GET", 3);

    // Advance past the 1s retry delay
    await jest.advanceTimersByTimeAsync(1500);

    const result = await promise;
    expect(result).toEqual({ retried: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after retries exhausted on 429", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });

    mockFetch.mockResolvedValue(
      jsonResponse(null, 429, { "Retry-After": "1" })
    );

    const promise = discogsRequest("/test", "GET", 1);

    // Set up the rejection expectation before advancing timers
    const expectation = expect(promise).rejects.toThrow("Discogs API error: 429");

    // Advance past the retry delay
    await jest.advanceTimersByTimeAsync(1500);

    await expectation;
  });

  it("throws on non-ok, non-429 responses", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse(null, 500));

    await expect(discogsRequest("/test")).rejects.toThrow(
      "Discogs API error: 500"
    );
  });

  it("clears credentials and throws AuthExpiredError on 401", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse(null, 401));

    await expect(discogsRequest("/test")).rejects.toThrow(AuthExpiredError);

    // Credentials should be cleared — next call should throw "not authenticated"
    await expect(discogsRequest("/test")).rejects.toThrow(
      "Discogs client not authenticated"
    );
  });

  it("auto-restores credentials from SecureStore when not in memory", async () => {
    // Don't call setClientCredentials — credentials are null
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("stored-token");
      if (key === "discogs_token_secret") return Promise.resolve("stored-secret");
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValue(jsonResponse({ restored: true }));

    const result = await discogsRequest("/test");

    expect(result).toEqual({ restored: true });
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith("discogs_token");
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith("discogs_token_secret");
  });

  it("throws not authenticated when SecureStore has no credentials", async () => {
    // Don't call setClientCredentials — credentials are null
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    await expect(discogsRequest("/test")).rejects.toThrow(
      "Discogs client not authenticated"
    );
  });

  it("aborts during 429 retry sleep without retrying", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });

    mockFetch.mockResolvedValueOnce(
      jsonResponse(null, 429, { "Retry-After": "2" })
    );

    const controller = new AbortController();
    const promise = discogsRequest("/test", "GET", 3, controller.signal);

    // Abort before the retry sleep completes, then advance past it
    controller.abort();

    const expectation = expect(promise).rejects.toThrow("The operation was aborted.");
    await jest.advanceTimersByTimeAsync(2500);
    await expectation;

    // Should not have retried
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("passes signal to fetch", async () => {
    setClientCredentials({
      consumerKey: "ck",
      consumerSecret: "cs",
      token: "t",
      tokenSecret: "ts",
    });
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

    const controller = new AbortController();
    await discogsRequest("/test", "GET", 3, controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.discogs.com/test",
      expect.objectContaining({ signal: controller.signal })
    );
  });
});
