const KEY_PREFIX = "pend:subs:";
const TTL_SECONDS = 30 * 24 * 60 * 60;

function buildKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function savePendingSubscriptions(redisClient: any, userId: string, locationIds: string[]): Promise<void> {
  await redisClient.set(buildKey(userId), JSON.stringify(locationIds), { EX: TTL_SECONDS });
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function getPendingSubscriptions(redisClient: any, userId: string): Promise<string[] | null> {
  const value = await redisClient.get(buildKey(userId));
  if (!value) return null;
  return JSON.parse(value) as string[];
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function deletePendingSubscriptions(redisClient: any, userId: string): Promise<void> {
  await redisClient.del(buildKey(userId));
}
