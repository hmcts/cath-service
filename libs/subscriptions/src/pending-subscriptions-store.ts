const KEY_PREFIX = "pend:subs:";
const CASE_KEY_PREFIX = "pend:case-subs:";
const TTL_SECONDS = 30 * 24 * 60 * 60;

type CaseSubscription = {
  caseName: string;
  caseNumber: string | null;
  searchType: "CASE_NAME" | "CASE_NUMBER";
  searchValue: string;
};

function buildKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function buildCaseKey(userId: string): string {
  return `${CASE_KEY_PREFIX}${userId}`;
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function savePendingSubscriptions(redisClient: any, userId: string, locationIds: string[]): Promise<void> {
  await redisClient.set(buildKey(userId), JSON.stringify(locationIds), { EX: TTL_SECONDS });
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function getPendingSubscriptions(redisClient: any, userId: string): Promise<string[] | null> {
  const value = await redisClient.get(buildKey(userId));
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function deletePendingSubscriptions(redisClient: any, userId: string): Promise<void> {
  await redisClient.del(buildKey(userId));
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function savePendingCaseSubscriptions(redisClient: any, userId: string, subscriptions: CaseSubscription[]): Promise<void> {
  await redisClient.set(buildCaseKey(userId), JSON.stringify(subscriptions), { EX: TTL_SECONDS });
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function getPendingCaseSubscriptions(redisClient: any, userId: string): Promise<CaseSubscription[] | null> {
  const value = await redisClient.get(buildCaseKey(userId));
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed as CaseSubscription[];
  } catch {
    return null;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by version/setup
export async function deletePendingCaseSubscriptions(redisClient: any, userId: string): Promise<void> {
  await redisClient.del(buildCaseKey(userId));
}
