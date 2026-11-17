import { getRedisClient } from "./redis-client.js";

// Runs atomically inside Redis so concurrent pods share a single bucket. A new bucket starts full and
// refills continuously (greedy) at capacity / period. Redis TIME is used so pod clock skew is irrelevant.
// The key expires after one period because an idle bucket would be full again by then.
const TRY_CONSUME_SCRIPT = `
local capacity = tonumber(ARGV[1])
local period = tonumber(ARGV[2])
local time = redis.call('TIME')
local now = time[1] * 1000 + math.floor(time[2] / 1000)

local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local timestamp = tonumber(bucket[2])

if tokens == nil or timestamp == nil then
  tokens = capacity
else
  local elapsed = math.max(0, now - timestamp)
  tokens = math.min(capacity, tokens + elapsed * capacity / period)
end

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tostring(tokens), 'timestamp', tostring(now))
redis.call('PEXPIRE', KEYS[1], period)
return allowed
`;

export interface TokenBucketOptions {
  capacity: number;
  refillPeriodMs: number;
}

export async function tryConsumeToken(key: string, options: TokenBucketOptions): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.eval(TRY_CONSUME_SCRIPT, {
    keys: [key],
    arguments: [String(options.capacity), String(options.refillPeriodMs)]
  });
  return result === 1;
}
