import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

/** RFC 3986 percent-encode */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Generate a random nonce using native crypto */
function nonce(): string {
  return Crypto.randomUUID().replace(/-/g, "");
}

/** Current Unix timestamp as string */
function timestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

interface OAuthParams {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  callback?: string;
  verifier?: string;
}

/**
 * Sign an OAuth 1.0a request and return the Authorization header value.
 */
export function signRequest(
  method: string,
  url: string,
  params: OAuthParams,
  extraParams?: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp(),
    oauth_version: "1.0",
  };

  if (params.token) oauthParams.oauth_token = params.token;
  if (params.callback) oauthParams.oauth_callback = params.callback;
  if (params.verifier) oauthParams.oauth_verifier = params.verifier;

  // Extract query params from URL and use only the base URL for signing
  const parsed = new URL(url);
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const queryParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // Merge oauth, query, and extra params for signature base
  const allParams = { ...oauthParams, ...queryParams, ...extraParams };

  // Sort and encode
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  // Signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(paramString),
  ].join("&");

  // Signing key
  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(params.tokenSecret ?? "")}`;

  // HMAC-SHA1
  const signature = CryptoJS.HmacSHA1(baseString, signingKey).toString(
    CryptoJS.enc.Base64
  );

  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}
