import { Redis } from "@upstash/redis";
import { getDailyVideoQuotaKey } from "./video-quota";

const QUOTA_TTL_SECONDS = 172800; // 48h
export const MAX_PER_DAY = 40;

export type ReservedVideoQuota = {
  key: string;
  count: number;
  resetDate: string;
  dailyLimit: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Atomically reserves one daily video slot for the user's active plan. */
export async function reserveDailyVideoQuota(
  redis: Redis,
  userId: string,
  dailyLimit: number = MAX_PER_DAY,
): Promise<ReservedVideoQuota | null> {
  if (!userId.trim()) throw new Error("userId obligatoire");
  if (!Number.isInteger(dailyLimit) || dailyLimit < 0) throw new Error("dailyLimit invalide");
  if (dailyLimit === 0) return null;

  const resetDate = todayISO();
  const key = getDailyVideoQuotaKey(userId, new Date(`${resetDate}T00:00:00.000Z`));

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
    [String(dailyLimit), String(QUOTA_TTL_SECONDS)],
  );

  if (count === -1) return null;
  return { key, count, resetDate, dailyLimit };
}

export async function releaseDailyVideoQuota(redis: Redis, key: string): Promise<void> {
  await redis.eval<number>(
    `
local key = KEYS[1]
local current = tonumber(redis.call("GET", key) or "0")
if current <= 0 then
  return 0
end
local next = redis.call("DECR", key)
if next <= 0 then
  redis.call("DEL", key)
end
return next
`,
    [key],
    [],
  );
}

export async function withDailyVideoQuota<T>(
  redis: Redis,
  userId: string,
  startGeneration: (reservation: ReservedVideoQuota) => Promise<T>,
  dailyLimit: number = MAX_PER_DAY,
): Promise<{ reservation: ReservedVideoQuota; result: T }> {
  const reservation = await reserveDailyVideoQuota(redis, userId, dailyLimit);
  if (!reservation) throw new Error(`Quota vidéo atteinte : maximum ${dailyLimit} vidéos par jour.`);

  try {
    const result = await startGeneration(reservation);
    return { reservation, result };
  } catch (error) {
    await releaseDailyVideoQuota(redis, reservation.key);
    throw error;
  }
}
