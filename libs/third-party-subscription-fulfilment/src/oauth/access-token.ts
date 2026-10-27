import { getRedisClient } from "@hmcts/redis";
import { getTokenCredentials, type TokenCredentials } from "./oauth-config.js";

// Legacy PIP cache name, with a one-day expiry refreshed on every read (AccessedExpiryPolicy(ONE_DAY))
const CACHE_KEY_PREFIX = "third-party_token-cache:";
const CACHE_EXPIRY_SECONDS = 86_400;
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

export async function getAccessToken(userId: string, isHealthCheck = false): Promise<string | null> {
  const cachedToken = await getCachedToken(userId);
  if (cachedToken) {
    return cachedToken;
  }

  return requestAccessToken(userId, isHealthCheck);
}

async function getCachedToken(userId: string): Promise<string | null> {
  const redis = await getRedisClient();
  const value = await redis.getEx(`${CACHE_KEY_PREFIX}${userId}`, { type: "EX", value: CACHE_EXPIRY_SECONDS });
  const cached = parseCachedToken(value);

  return cached && Date.now() < cached.expiry ? cached.accessToken : null;
}

function parseCachedToken(value: string | null): CachedToken | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CachedToken>;
    return typeof parsed.accessToken === "string" && typeof parsed.expiry === "number" ? { accessToken: parsed.accessToken, expiry: parsed.expiry } : null;
  } catch {
    return null;
  }
}

async function requestAccessToken(userId: string, isHealthCheck: boolean): Promise<string | null> {
  let token: { accessToken: string; expiresIn: number };
  try {
    const credentials = await getTokenCredentials(userId);
    if (!credentials) {
      throw new Error("Incomplete OAuth token configuration");
    }
    token = await fetchToken(credentials);
  } catch (error) {
    console.error("[ThirdPartySubscriptionFulfilment] Failed to obtain OAuth access token:", {
      userId,
      reason: error instanceof Error ? error.message : String(error)
    });
    if (isHealthCheck) {
      throw new Error(`Failed to obtain OAuth access token for third-party user ${userId}`);
    }
    return null;
  }

  await cacheToken(userId, token.accessToken, token.expiresIn);
  return token.accessToken;
}

async function fetchToken(credentials: TokenCredentials): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch(credentials.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: credentials.scope
    })
  });

  if (!response.ok) {
    throw new Error(`Token endpoint returned status ${response.status}`);
  }

  const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== "string" || body.access_token === "") {
    throw new Error("Token response did not contain an access token");
  }

  return { accessToken: body.access_token, expiresIn: Number(body.expires_in) || 0 };
}

async function cacheToken(userId: string, accessToken: string, expiresIn: number): Promise<void> {
  const expiry = expiresIn > TOKEN_EXPIRY_BUFFER_SECONDS ? Date.now() + (expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000 : 0;
  const redis = await getRedisClient();
  await redis.set(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify({ accessToken, expiry } satisfies CachedToken), {
    expiration: { type: "EX", value: CACHE_EXPIRY_SECONDS }
  });
}

interface CachedToken {
  accessToken: string;
  expiry: number;
}
