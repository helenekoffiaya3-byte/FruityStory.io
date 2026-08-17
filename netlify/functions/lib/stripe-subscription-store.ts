import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export type StoredSubscription = {
  userId: string;
  subscriptionId: string;
  customerId: string | null;
  status: string;
  priceId: string | null;
  plan: "standard" | "premium" | "ultra_premium" | "unknown";
  currentPeriodEnd: number | null;
  updatedAt: string;
};

export async function saveSubscription(subscription: StoredSubscription) {
  await redis.set(`stripe-subscription:${subscription.userId}`, subscription);
  if (subscription.subscriptionId) {
    await redis.set(`stripe-subscription-id:${subscription.subscriptionId}`, subscription.userId);
  }
}

export async function getStoredSubscription(userId: string) {
  return await redis.get<StoredSubscription>(`stripe-subscription:${userId}`);
}

export async function deleteStoredSubscription(userId: string) {
  await redis.del(`stripe-subscription:${userId}`);
}
