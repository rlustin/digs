import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

import { login, restoreSession, logout } from "../oauth";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/utils/oauth-signer", () => ({
  signRequest: jest.fn().mockReturnValue('OAuth oauth_consumer_key="key"'),
}));

const mockSetClientCredentials = jest.fn();
const mockClearClientCredentials = jest.fn();
jest.mock("../client", () => ({
  setClientCredentials: (...args: unknown[]) => mockSetClientCredentials(...args),
  clearClientCredentials: (...args: unknown[]) => mockClearClientCredentials(...args),
}));

jest.mock("@/constants/discogs", () => ({
  DISCOGS_CONSUMER_KEY: "test-key",
  DISCOGS_CONSUMER_SECRET: "test-secret",
  DISCOGS_CALLBACK_URL: "digs://oauth/callback",
  DISCOGS_REQUEST_TOKEN_URL: "https://api.discogs.com/oauth/request_token",
  DISCOGS_AUTHORIZE_URL: "https://www.discogs.com/oauth/authorize",
  DISCOGS_ACCESS_TOKEN_URL: "https://api.discogs.com/oauth/access_token",
  DISCOGS_IDENTITY_URL: "https://api.discogs.com/oauth/identity",
  DISCOGS_USER_AGENT: "Digs/1.0.0",
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockWebBrowser = jest.mocked(WebBrowser);
const mockSecureStore = jest.mocked(SecureStore);

function textResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

/** Set up mocks for a complete successful login flow. */
function setupSuccessfulLoginFlow() {
  // Step 1: request token
  mockFetch.mockResolvedValueOnce(
    textResponse("oauth_token=req_token&oauth_token_secret=req_secret")
  );
  // Step 2: browser auth
  mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
    type: "success",
    url: "digs://oauth/callback?oauth_verifier=my_verifier",
  });
  // Step 3: access token
  mockFetch.mockResolvedValueOnce(
    textResponse("oauth_token=access_tok&oauth_token_secret=access_sec")
  );
  // Step 4: identity
  mockFetch.mockResolvedValueOnce(
    jsonResponse({ username: "dj_test" })
  );
}

describe("login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("completes the full three-legged flow", async () => {
    setupSuccessfulLoginFlow();

    const result = await login();

    expect(result).toEqual({ username: "dj_test" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockWebBrowser.openAuthSessionAsync).toHaveBeenCalledTimes(1);
  });

  it("persists token, tokenSecret, username to SecureStore", async () => {
    setupSuccessfulLoginFlow();

    await login();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "discogs_token",
      "access_tok"
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "discogs_token_secret",
      "access_sec"
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "discogs_username",
      "dj_test"
    );
  });

  it("calls setClientCredentials with the right values", async () => {
    setupSuccessfulLoginFlow();

    await login();

    expect(mockSetClientCredentials).toHaveBeenCalledWith({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      token: "access_tok",
      tokenSecret: "access_sec",
    });
  });

  it("throws when request token fails", async () => {
    mockFetch.mockResolvedValueOnce(textResponse("", 403));

    await expect(login()).rejects.toThrow("Request token failed: 403");
  });

  it("throws when browser auth is cancelled", async () => {
    mockFetch.mockResolvedValueOnce(
      textResponse("oauth_token=req_token&oauth_token_secret=req_secret")
    );
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
      type: "cancel",
    } as WebBrowser.WebBrowserResult);

    await expect(login()).rejects.toThrow("Authorization cancelled or failed");
  });

  it("throws when callback has no verifier", async () => {
    mockFetch.mockResolvedValueOnce(
      textResponse("oauth_token=req_token&oauth_token_secret=req_secret")
    );
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
      type: "success",
      url: "digs://oauth/callback",
    });

    await expect(login()).rejects.toThrow("No verifier in callback");
  });

  it("throws when access token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce(
      textResponse("oauth_token=req_token&oauth_token_secret=req_secret")
    );
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
      type: "success",
      url: "digs://oauth/callback?oauth_verifier=v",
    });
    mockFetch.mockResolvedValueOnce(textResponse("", 401));

    await expect(login()).rejects.toThrow("Access token failed: 401");
  });

  it("throws when identity fetch fails", async () => {
    mockFetch.mockResolvedValueOnce(
      textResponse("oauth_token=req_token&oauth_token_secret=req_secret")
    );
    mockWebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
      type: "success",
      url: "digs://oauth/callback?oauth_verifier=v",
    });
    mockFetch.mockResolvedValueOnce(
      textResponse("oauth_token=at&oauth_token_secret=as")
    );
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(login()).rejects.toThrow("Identity fetch failed: 500");
  });
});

describe("restoreSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns username when all three keys exist and identity validates", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("tok");
      if (key === "discogs_token_secret") return Promise.resolve("sec");
      if (key === "discogs_username") return Promise.resolve("dj_test");
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValueOnce(jsonResponse({ username: "dj_test" }));

    const result = await restoreSession();

    expect(result).toBe("dj_test");
  });

  it("returns null when any SecureStore key is missing", async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const result = await restoreSession();

    expect(result).toBeNull();
  });

  it("calls setClientCredentials when credentials exist", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("tok");
      if (key === "discogs_token_secret") return Promise.resolve("sec");
      if (key === "discogs_username") return Promise.resolve("dj_test");
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValueOnce(jsonResponse({ username: "dj_test" }));

    await restoreSession();

    expect(mockSetClientCredentials).toHaveBeenCalledWith({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      token: "tok",
      tokenSecret: "sec",
    });
  });

  it("returns null and calls logout on 401 identity response", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("tok");
      if (key === "discogs_token_secret") return Promise.resolve("sec");
      if (key === "discogs_username") return Promise.resolve("dj_test");
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));

    const result = await restoreSession();

    expect(result).toBeNull();
    expect(mockClearClientCredentials).toHaveBeenCalled();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_token");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_token_secret");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_username");
  });

  it("keeps session alive on network error (offline support)", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("tok");
      if (key === "discogs_token_secret") return Promise.resolve("sec");
      if (key === "discogs_username") return Promise.resolve("dj_test");
      return Promise.resolve(null);
    });
    mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

    const result = await restoreSession();

    expect(result).toBe("dj_test");
  });

  it("keeps session alive on 5xx error (non-401)", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === "discogs_token") return Promise.resolve("tok");
      if (key === "discogs_token_secret") return Promise.resolve("sec");
      if (key === "discogs_username") return Promise.resolve("dj_test");
      return Promise.resolve(null);
    });
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 503));

    const result = await restoreSession();

    expect(result).toBe("dj_test");
  });
});

describe("logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes all three SecureStore keys", async () => {
    await logout();

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_token");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_token_secret");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("discogs_username");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});
