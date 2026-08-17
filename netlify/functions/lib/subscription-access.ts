import type { Redis } from "@upstash/redis";
import { getSubscriptionPlan, type SubscriptionTier } from "./subscription-plans";

const KEY_PREFIX = "subscription:";

/** Server-side subscription state. The client must never choose its own tier. */
export async function getUserSubscriptionTier(
  redis: Redis,
  userId: string,
): Promise<SubscriptionTier> {
  const value = await redis.get<string | { tier?: string }>(`${KEY_PREFIX}${userId}`);
  const tier = typeof value === "string" ? value : value?.tier;
  if (tier && tier in { free: true, standard: true, premium: true, pro: true, ultra_pro: true }) {
    return tier as SubscriptionTier;
  }
  return "free";
}

export function getSubscriptionPlanForTier(tier: SubscriptionTier) {
  return getSubscriptionPlan(tier);
}
