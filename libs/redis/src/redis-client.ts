import { DefaultAzureCredential } from "@azure/identity";
import { EntraIdCredentialsProviderFactory, type EntraidCredentialsProvider, REDIS_SCOPE_DEFAULT } from "@redis/entraid";
import config from "config";
import { createClient, type RedisClientType } from "redis";

// Keeps idle connections open: Azure closes them after about 10 minutes, which
// node-redis logs as SocketClosedUnexpectedlyError (#1033).
const REDIS_PING_INTERVAL_MS = 300_000;
// Refresh the Entra ID token at 80% of its lifetime, well before it expires.
const TOKEN_EXPIRATION_REFRESH_RATIO = 0.8;

let redisClient: RedisClientType | null = null;
let entraIdProvider: EntraidCredentialsProvider | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  redisClient = createRedisClient(config.get<string>("redis.url"), config.get<boolean>("redis.managedIdentity"));

  await redisClient.connect();
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  // quit() waits for a reply, so on a dropped connection it would never settle.
  if (redisClient.isReady) {
    await redisClient.quit();
  } else {
    redisClient.destroy();
  }
  redisClient = null;
}

// With managedIdentity the client authenticates as the pod's managed identity
// (MANAGED_IDENTITY_CLIENT_ID) instead of with the key in the URL, so any
// username or password in the URL is dropped. Entra ID needs TLS.
export function createRedisClient(url: string, managedIdentity: boolean): RedisClientType {
  const client = managedIdentity
    ? createClient({ url: withoutCredentials(url), pingInterval: REDIS_PING_INTERVAL_MS, credentialsProvider: getEntraIdProvider() })
    : createClient({ url, pingInterval: REDIS_PING_INTERVAL_MS });

  client.on("error", (err) => console.error("Redis Client Error", err));
  return client as RedisClientType;
}

function withoutCredentials(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "rediss:") {
    throw new Error(`REDIS_MI is true but the Redis URL uses ${parsed.protocol}; managed identity needs rediss:`);
  }
  parsed.username = "";
  parsed.password = "";
  return parsed.toString();
}

// One provider per process, shared by every client, so each refreshes from the
// same token rather than requesting its own.
function getEntraIdProvider(): EntraidCredentialsProvider {
  if (!entraIdProvider) {
    entraIdProvider = EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({
      credential: new DefaultAzureCredential({ managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID }),
      scopes: REDIS_SCOPE_DEFAULT,
      tokenManagerConfig: { expirationRefreshRatio: TOKEN_EXPIRATION_REFRESH_RATIO },
      onReAuthenticationError: (error) => console.error("Redis Entra ID re-authentication failed", error.message)
    });
  }
  return entraIdProvider;
}
