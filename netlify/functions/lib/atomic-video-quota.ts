import { Redis } from "@upstash/redis";
import { ULTRA_PREMIUM_VIDEO_POLICY, getDailyVideoQuotaKey } from "./video-quota";

const QUOTA_TTL_SECONDS = 172800; // 48h

export type ReservedVideoQuota = {
  key: string;
  count: number;
};

/** Atomically reserves one of the 20 daily Ultra Premium video slots. */
export async function reserveDailyVideoQuota(
  redis: Redis,
  userId: string,
): Promise<ReservedVideoQuota | null> {
  if (!userId.trim()) throw new Error("userId obligatoire");

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

/**
 * Releases a reserved slot only after a downstream generation failure.
 * The Lua script prevents the counter from going below zero.
 */
export async function releaseDailyVideoQuota(redis: Redis, key: string) {
  await redis.eval<number>(
    `
local key = KEYS[1]
local current = tonumber(redis.call("GET", key) or "0")
if current <= 0 then
  return 0
end
return redis.call("DECR", key)
`,
    [key],
    [],
  );
}

/**
 * Reserves a slot, runs the real video-provider operation, and automatically
 * returns the slot if the provider throws/rejects before accepting the job.
 */
export async function withDailyVideoQuota<T>(
  redis: Redis,
  userId: string,
  startGeneration: (reservation: ReservedVideoQuota) => Promise<T>,
): Promise<{ reservation: ReservedVideoQuota; result: T }> {
  const reservation = await reserveDailyVideoQuota(redis, userId);

  if (!reservation) {
    throw new Error("Quota vidéo Ultra Premium atteinte : maximum 20 vidéos par jour.");
  }

  try {
    const result = await startGeneration(reservation);
    return { reservation, result };
  } catch (error) {
    await releaseDailyVideoQuota(redis, reservation.key);
    throw error;
  }
}
