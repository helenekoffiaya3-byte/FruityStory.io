export type SubscriptionTier = "free" | "premium" | "supreme" | "ultra_premium";
export type VideoProvider = "veo" | "pixverse";

export const ULTRA_PREMIUM_VIDEO_POLICY = {
  tier: "ultra_premium" as const,
  quota: 20 as const,
  credits: "unlimited" as const,
  providers: ["veo", "pixverse"] as VideoProvider[],
};

export function getVideoQuotaPolicy(tier: SubscriptionTier) {
  if (tier === "ultra_premium") return ULTRA_PREMIUM_VIDEO_POLICY;

  return {
    tier,
    quota: "subscription_managed" as const,
    credits: "subscription_managed" as const,
    providers: [] as VideoProvider[],
  };
}

export function assertVideoProviderAllowed(
  tier: SubscriptionTier,
  provider: VideoProvider,
) {
  if (tier !== "ultra_premium") {
    throw new Error("Video generation with Veo/PixVerse requires Ultra Premium");
  }

  if (!ULTRA_PREMIUM_VIDEO_POLICY.providers.includes(provider)) {
    throw new Error("Video provider is not available for Ultra Premium");
  }
}

export function hasUnlimitedVideoCredits(tier: SubscriptionTier) {
  return tier === "ultra_premium";
}

export function hasVideoQuotaRemaining(tier: SubscriptionTier, videosCreated: number) {
  if (tier !== "ultra_premium") return false;
  return videosCreated < ULTRA_PREMIUM_VIDEO_POLICY.quota;
}

export function assertVideoQuotaRemaining(tier: SubscriptionTier, videosCreated: number) {
  if (!hasVideoQuotaRemaining(tier, videosCreated)) {
    throw new Error("Quota vidéo Ultra Premium atteinte : maximum 20 vidéos.");
  }
}
