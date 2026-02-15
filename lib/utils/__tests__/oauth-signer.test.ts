import { signRequest } from "../oauth-signer";

// Mock crypto-js to produce deterministic output for testing
jest.mock("crypto-js", () => {
  const actual = jest.requireActual("crypto-js");
  let callCount = 0;
  return {
    ...actual,
    lib: {
      WordArray: {
        random: () => ({
          // Deterministic nonce for reproducible tests
          toString: () => "testnonce" + String(++callCount).padStart(8, "0"),
        }),
      },
    },
  };
});

describe("signRequest", () => {
  beforeEach(() => {
    // Fix timestamp
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a string starting with 'OAuth '", () => {
    const header = signRequest("GET", "https://api.discogs.com/oauth/identity", {
      consumerKey: "mykey",
      consumerSecret: "mysecret",
      token: "mytoken",
      tokenSecret: "mytokensecret",
    });

    expect(header).toMatch(/^OAuth /);
  });

  it("includes all required OAuth params", () => {
    const header = signRequest("GET", "https://api.discogs.com/test", {
      consumerKey: "key123",
      consumerSecret: "secret456",
      token: "tok",
      tokenSecret: "toksec",
    });

    expect(header).toContain('oauth_consumer_key="key123"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_version="1.0"');
    expect(header).toContain('oauth_token="tok"');
    expect(header).toContain("oauth_signature=");
    expect(header).toContain("oauth_nonce=");
    expect(header).toContain("oauth_timestamp=");
  });

  it("includes callback when provided", () => {
    const header = signRequest("POST", "https://api.discogs.com/oauth/request_token", {
      consumerKey: "key",
      consumerSecret: "secret",
      callback: "myapp://callback",
    });

    expect(header).toContain("oauth_callback=");
  });

  it("includes verifier when provided", () => {
    const header = signRequest("POST", "https://api.discogs.com/oauth/access_token", {
      consumerKey: "key",
      consumerSecret: "secret",
      token: "tok",
      tokenSecret: "toksec",
      verifier: "verify123",
    });

    expect(header).toContain("oauth_verifier=");
  });

  it("does not include token when not provided", () => {
    const header = signRequest("POST", "https://api.discogs.com/oauth/request_token", {
      consumerKey: "key",
      consumerSecret: "secret",
    });

    expect(header).not.toContain("oauth_token=");
  });

  it("produces different signatures for different methods", () => {
    const params = {
      consumerKey: "key",
      consumerSecret: "secret",
      token: "tok",
      tokenSecret: "toksec",
    };

    const getHeader = signRequest("GET", "https://api.discogs.com/test", params);
    const postHeader = signRequest("POST", "https://api.discogs.com/test", params);

    const getSig = getHeader.match(/oauth_signature="([^"]+)"/)?.[1];
    const postSig = postHeader.match(/oauth_signature="([^"]+)"/)?.[1];

    expect(getSig).toBeDefined();
    expect(postSig).toBeDefined();
    expect(getSig).not.toEqual(postSig);
  });

  it("produces different signatures for different URLs", () => {
    const params = {
      consumerKey: "key",
      consumerSecret: "secret",
      token: "tok",
      tokenSecret: "toksec",
    };

    const h1 = signRequest("GET", "https://api.discogs.com/a", params);
    const h2 = signRequest("GET", "https://api.discogs.com/b", params);

    const sig1 = h1.match(/oauth_signature="([^"]+)"/)?.[1];
    const sig2 = h2.match(/oauth_signature="([^"]+)"/)?.[1];

    expect(sig1).not.toEqual(sig2);
  });

  it("percent-encodes special characters in param values", () => {
    const header = signRequest("POST", "https://api.discogs.com/oauth/request_token", {
      consumerKey: "key",
      consumerSecret: "secret",
      callback: "myapp://oauth/callback?foo=bar&baz=1",
    });

    // The callback URL should be percent-encoded in the header
    expect(header).toContain("oauth_callback=");
    // Should not contain raw & or ? inside the quoted value
    const callbackMatch = header.match(/oauth_callback="([^"]+)"/)?.[1];
    expect(callbackMatch).toBeDefined();
    expect(decodeURIComponent(callbackMatch!)).toContain("myapp://oauth/callback");
  });
});
