import * as SecureStore from "expo-secure-store";
import {
  DISCOGS_BASE_URL,
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
  DISCOGS_USER_AGENT,
} from "@/constants/discogs";
import { signRequest } from "@/lib/utils/oauth-signer";
import { RateLimiter } from "@/lib/utils/rate-limiter";

const rateLimiter = new RateLimiter();

interface ClientCredentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

let credentials: ClientCredentials | null = null;

export function setClientCredentials(creds: ClientCredentials) {
  credentials = creds;
}

export function clearClientCredentials() {
  credentials = null;
}

/**
 * Restore credentials from SecureStore if not already in memory.
 * Returns true if credentials are available after the attempt.
 */
async function ensureCredentials(): Promise<boolean> {
  if (credentials) return true;

  const token = await SecureStore.getItemAsync("discogs_token");
  const tokenSecret = await SecureStore.getItemAsync("discogs_token_secret");
  if (!token || !tokenSecret) return false;

  credentials = {
    consumerKey: DISCOGS_CONSUMER_KEY,
    consumerSecret: DISCOGS_CONSUMER_SECRET,
    token,
    tokenSecret,
  };
  return true;
}

/**
 * Make an authenticated, rate-limited request to the Discogs API.
 */
export async function discogsRequest<T>(
  path: string,
  method: string = "GET",
  retries: number = 3,
  signal?: AbortSignal
): Promise<T> {
  if (!(await ensureCredentials())) {
    throw new Error("Discogs client not authenticated");
  }

  await rateLimiter.acquire();

  const url = path.startsWith("http") ? path : `${DISCOGS_BASE_URL}${path}`;

  const authHeader = signRequest(method, url, {
    consumerKey: credentials!.consumerKey,
    consumerSecret: credentials!.consumerSecret,
    token: credentials!.token,
    tokenSecret: credentials!.tokenSecret,
  });

  const response = await fetch(url, {
    method,
    signal,
    headers: {
      Authorization: authHeader,
      "User-Agent": DISCOGS_USER_AGENT,
      Accept: "application/vnd.discogs.v2.discogs+json",
    },
  });

  // Update rate limiter from response headers
  const remaining = response.headers.get("X-Discogs-Ratelimit-Remaining");
  if (remaining) {
    rateLimiter.updateFromHeader(parseInt(remaining, 10));
  }

  // Handle rate limiting with retry
  if (response.status === 429 && retries > 0) {
    const retryAfter = parseInt(
      response.headers.get("Retry-After") ?? "2",
      10
    );
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return discogsRequest<T>(path, method, retries - 1, signal);
  }

  if (response.status === 401) {
    clearClientCredentials();
    throw new Error("authentication_expired");
  }

  if (!response.ok) {
    throw new Error(
      `Discogs API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
