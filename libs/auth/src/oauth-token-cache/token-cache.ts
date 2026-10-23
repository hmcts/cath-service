import { getRedisClient } from "@hmcts/redis";

const CACHE_KEY_PREFIX = "oauth:token:";
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

export async function getCachedAccessToken(name: string, fetchToken: () => Promise<OAuthToken>): Promise<string> {
  const key = `${CACHE_KEY_PREFIX}${name}`;

  const cachedToken = await getCachedToken(key);
  if (cachedToken) {
    return cachedToken;
  }

  const token = await fetchToken();
  await cacheToken(key, token);
  return token.accessToken;
}

async function getCachedToken(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  const value = await redis.get(key);
  if (!value) {
    return null;
  }

  const cached = JSON.parse(value) as CachedToken;
  return Date.now() < cached.expiry ? cached.accessToken : null;
}

async function cacheToken(key: string, token: OAuthToken): Promise<void> {
  const ttlSeconds = token.expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS;
  // pip-publication-services stores an already-expired entry here; Redis rejects EX <= 0, so skipping the write gives the same result
  if (ttlSeconds <= 0) {
    return;
  }

  const redis = await getRedisClient();
  const cached: CachedToken = {
    accessToken: token.accessToken,
    expiry: Date.now() + ttlSeconds * 1000
  };
  await redis.setEx(key, ttlSeconds, JSON.stringify(cached));
}

export interface OAuthToken {
  accessToken: string;
  expiresIn: number;
}

interface CachedToken {
  accessToken: string;
  expiry: number;
}
