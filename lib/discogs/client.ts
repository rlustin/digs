import {
  DISCOGS_BASE_URL,
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
 * Make an authenticated, rate-limited request to the Discogs API.
 */
export async function discogsRequest<T>(
  path: string,
  method: string = "GET",
  retries: number = 3,
  signal?: AbortSignal
): Promise<T> {
  if (!credentials) {
    throw new Error("Discogs client not authenticated");
  }

  await rateLimiter.acquire();

  const url = path.startsWith("http") ? path : `${DISCOGS_BASE_URL}${path}`;

  const authHeader = signRequest(method, url, {
    consumerKey: credentials.consumerKey,
    consumerSecret: credentials.consumerSecret,
    token: credentials.token,
    tokenSecret: credentials.tokenSecret,
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

  if (!response.ok) {
    throw new Error(
      `Discogs API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
