import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import {
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
  DISCOGS_CALLBACK_URL,
  DISCOGS_REQUEST_TOKEN_URL,
  DISCOGS_AUTHORIZE_URL,
  DISCOGS_ACCESS_TOKEN_URL,
  DISCOGS_IDENTITY_URL,
  DISCOGS_USER_AGENT,
} from "@/constants/discogs";
import { signRequest } from "@/lib/utils/oauth-signer";
import { setClientCredentials, clearClientCredentials } from "./client";

// SecureStore keys
const KEY_TOKEN = "discogs_token";
const KEY_TOKEN_SECRET = "discogs_token_secret";
const KEY_USERNAME = "discogs_username";

/** Parse URL-encoded response body into a record. */
function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [k, v] = pair.split("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return params;
}

/**
 * Full OAuth 1.0a three-legged flow:
 * 1. Get request token
 * 2. Open Discogs authorize URL in browser
 * 3. Exchange verifier for access token
 * 4. Fetch identity (username)
 * 5. Persist credentials in SecureStore
 */
export async function login(): Promise<{ username: string }> {
  // Step 1: Request token
  const requestAuth = signRequest("POST", DISCOGS_REQUEST_TOKEN_URL, {
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    callback: DISCOGS_CALLBACK_URL,
  });

  const requestTokenRes = await fetch(DISCOGS_REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: requestAuth,
      "User-Agent": DISCOGS_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!requestTokenRes.ok) {
    throw new Error(`Request token failed: ${requestTokenRes.status}`);
  }

  const requestBody = await requestTokenRes.text();
  const { oauth_token, oauth_token_secret } = parseFormBody(requestBody);

  // Step 2: Open browser for authorization
  const authUrl = `${DISCOGS_AUTHORIZE_URL}?oauth_token=${oauth_token}`;
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    DISCOGS_CALLBACK_URL
  );

  if (result.type !== "success" || !result.url) {
    throw new Error("Authorization cancelled or failed");
  }

  // Parse verifier from callback URL
  const callbackUrl = new URL(result.url);
  const verifier = callbackUrl.searchParams.get("oauth_verifier");
  if (!verifier) {
    throw new Error("No verifier in callback");
  }

  // Step 3: Exchange for access token
  const accessAuth = signRequest("POST", DISCOGS_ACCESS_TOKEN_URL, {
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    token: oauth_token,
    tokenSecret: oauth_token_secret,
    verifier,
  });

  const accessTokenRes = await fetch(DISCOGS_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: accessAuth,
      "User-Agent": DISCOGS_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!accessTokenRes.ok) {
    throw new Error(`Access token failed: ${accessTokenRes.status}`);
  }

  const accessBody = await accessTokenRes.text();
  const accessParams = parseFormBody(accessBody);
  const token = accessParams.oauth_token;
  const tokenSecret = accessParams.oauth_token_secret;

  // Configure the API client
  setClientCredentials({
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    token,
    tokenSecret,
  });

  // Step 4: Get identity
  const identityAuth = signRequest("GET", DISCOGS_IDENTITY_URL, {
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    token,
    tokenSecret,
  });

  const identityRes = await fetch(DISCOGS_IDENTITY_URL, {
    headers: {
      Authorization: identityAuth,
      "User-Agent": DISCOGS_USER_AGENT,
    },
  });

  if (!identityRes.ok) {
    throw new Error(`Identity fetch failed: ${identityRes.status}`);
  }

  const identity = (await identityRes.json()) as { username: string };

  // Step 5: Persist
  await SecureStore.setItemAsync(KEY_TOKEN, token);
  await SecureStore.setItemAsync(KEY_TOKEN_SECRET, tokenSecret);
  await SecureStore.setItemAsync(KEY_USERNAME, identity.username);

  return { username: identity.username };
}

/**
 * Restore saved credentials from SecureStore.
 * Returns the username if credentials exist, null otherwise.
 */
export async function restoreSession(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(KEY_TOKEN);
  const tokenSecret = await SecureStore.getItemAsync(KEY_TOKEN_SECRET);
  const username = await SecureStore.getItemAsync(KEY_USERNAME);

  if (!token || !tokenSecret || !username) return null;

  setClientCredentials({
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    token,
    tokenSecret,
  });

  // Validate the session is still valid
  try {
    const identityAuth = signRequest("GET", DISCOGS_IDENTITY_URL, {
      consumerKey: DISCOGS_CONSUMER_KEY,
      consumerSecret: DISCOGS_CONSUMER_SECRET,
      token,
      tokenSecret,
    });
    const res = await fetch(DISCOGS_IDENTITY_URL, {
      headers: {
        Authorization: identityAuth,
        "User-Agent": DISCOGS_USER_AGENT,
      },
    });
    if (!res.ok) throw new Error("invalid");
  } catch {
    clearClientCredentials();
    await logout();
    return null;
  }

  return username;
}

/**
 * Clear all stored credentials and log out.
 */
export async function logout() {
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_TOKEN_SECRET);
  await SecureStore.deleteItemAsync(KEY_USERNAME);
}
