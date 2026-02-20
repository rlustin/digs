// Register your Discogs app at https://www.discogs.com/settings/developers
// and fill in these values (or set them via environment variables).
export const DISCOGS_CONSUMER_KEY = process.env.EXPO_PUBLIC_DISCOGS_KEY ?? "";
export const DISCOGS_CONSUMER_SECRET =
  process.env.EXPO_PUBLIC_DISCOGS_SECRET ?? "";

export const DISCOGS_BASE_URL = "https://api.discogs.com";
export const DISCOGS_USER_AGENT = "Digs/1.0.0";
export const DISCOGS_CALLBACK_URL = "digs://oauth/callback";

export const DISCOGS_REQUEST_TOKEN_URL = `${DISCOGS_BASE_URL}/oauth/request_token`;
export const DISCOGS_AUTHORIZE_URL = "https://www.discogs.com/oauth/authorize";
export const DISCOGS_ACCESS_TOKEN_URL = `${DISCOGS_BASE_URL}/oauth/access_token`;
export const DISCOGS_IDENTITY_URL = `${DISCOGS_BASE_URL}/oauth/identity`;
