import * as SecureStore from "expo-secure-store";
import {
  DISCOGS_BASE_URL,
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
  DISCOGS_USER_AGENT,
} from "@/constants/discogs";
import { signRequest } from "@/lib/utils/oauth-signer";
import { RateLimiter } from "@/lib/utils/rate-limiter";
import { AuthExpiredError } from "./errors";

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

  const url = path.startsWith("http") ? path : `${DISCOGS_BASE_URL}${path}`;

  await rateLimiter.acquire();
  try {
    let retriesLeft = retries;
    while (true) {
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

      // Handle rate limiting with retry and exponential backoff.
      // Holds the rate limiter slot during wait so the drain won't send
      // more requests into an exhausted rate limit.
      if (response.status === 429 && retriesLeft > 0) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") ?? "2",
          10
        );
        const attempt = retries - retriesLeft;
        const delay = Math.max(retryAfter, 5) * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay * 1000));
        if (signal?.aborted) {
          throw new DOMException("The operation was aborted.", "AbortError");
        }
        retriesLeft--;
        continue;
      }

      if (response.status === 401) {
        clearClientCredentials();
        throw new AuthExpiredError();
      }

      if (!response.ok) {
        throw new Error(
          `Discogs API error: ${response.status} ${response.statusText}`
        );
      }

      return response.json() as Promise<T>;
    }
  } finally {
    rateLimiter.release();
  }
}
