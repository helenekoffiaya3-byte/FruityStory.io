import { getSubscriptionPlan, type SubscriptionTier } from "./subscription-plans";

export type { SubscriptionTier } from "./subscription-plans";
export type VideoProvider = "veo" | "pixverse";

export const ULTRA_PREMIUM_VIDEO_POLICY = {
  tier: "ultra_pro" as const,
  dailyQuota: 40 as const,
  credits: 19000 as const,
  providers: ["veo", "pixverse"] as VideoProvider[],
};

export function getVideoQuotaPolicy(tier: SubscriptionTier) {
  const plan = getSubscriptionPlan(tier);
  return {
    tier,
    dailyQuota: plan.dailyVideoLimit,
    credits: plan.credits,
    maxDurationMinutes: plan.maxDurationMinutes,
    maxScenes: plan.maxScenes,
    maxSceneDurationSeconds: plan.maxSceneDurationSeconds,
    providers: plan.providers,
  };
}

export function assertVideoProviderAllowed(tier: SubscriptionTier, provider: VideoProvider) {
  const policy = getVideoQuotaPolicy(tier);
  if (!policy.providers.includes(provider)) {
    throw new Error(`Le fournisseur ${provider} n'est pas disponible pour le forfait ${tier}.`);
  }
}

export function hasUnlimitedVideoCredits(_tier: SubscriptionTier) {
  return false;
}

export function hasVideoQuotaRemaining(tier: SubscriptionTier, videosCreatedToday: number) {
  return videosCreatedToday < getVideoQuotaPolicy(tier).dailyQuota;
}

export function assertVideoQuotaRemaining(tier: SubscriptionTier, videosCreatedToday: number) {
  const limit = getVideoQuotaPolicy(tier).dailyQuota;
  if (limit <= 0 || videosCreatedToday >= limit) {
    throw new Error(`Quota vidéo atteint : maximum ${limit} vidéos par jour.`);
  }
}

export function getDailyVideoQuotaKey(userId: string, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `video-quota:${userId}:${day}`;
}

export function assertAtomicDailyReservation(countAfterIncrement: number, dailyQuota = ULTRA_PREMIUM_VIDEO_POLICY.dailyQuota) {
  if (countAfterIncrement > dailyQuota) {
    throw new Error(`Quota vidéo atteint : maximum ${dailyQuota} vidéos par jour.`);
  }
}
