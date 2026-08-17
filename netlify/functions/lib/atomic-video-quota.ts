import { Redis } from "@upstash/redis";
import { ULTRA_PREMIUM_VIDEO_POLICY, getDailyVideoQuotaKey } from "./video-quota";

const QUOTA_TTL_SECONDS = 172800; // 48h

/** Atomically reserves one of the 20 daily Ultra Premium video slots. */
export async function reserveDailyVideoQuota(redis: Redis, userId: string) {
  const key = getDailyVideoQuotaKey(userId);
  const count = await redis.eval<number>(
    `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call("GET", key) or "0")
if current >= max then
  return -1
end
local n = redis.call("INCR", key)
if n == 1 then
  redis.call("EXPIRE", key, ttl)
end
return n
`,
    [key],
    [String(ULTRA_PREMIUM_VIDEO_POLICY.dailyQuota), String(QUOTA_TTL_SECONDS)],
  );

  if (count === -1) return null;
  return { key, count };
}

/** Releases a reserved slot when the downstream video provider rejects the job. */
export async function releaseDailyVideoQuota(redis: Redis, key: string) {
  await redis.decr(key);
}
