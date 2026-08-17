export type SubscriptionTier = "free" | "premium" | "supreme" | "ultra_premium";
export type VideoProvider = "veo" | "pixverse";

export const ULTRA_PREMIUM_VIDEO_POLICY = {
  tier: "ultra_premium" as const,
  quota: "unlimited" as const,
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

export function hasUnlimitedVideoQuota(tier: SubscriptionTier) {
  return tier === "ultra_premium";
}
