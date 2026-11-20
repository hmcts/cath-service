import config from "config";
import { createClient, type RedisClientType } from "redis";

// Azure Cache for Redis closes connections idle for 10 minutes; ping well inside that (#1033).
const REDIS_PING_INTERVAL_MS = 300_000;

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  redisClient = createClient({ url: config.get("redis.url"), pingInterval: REDIS_PING_INTERVAL_MS });
  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  await redisClient.connect();
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
