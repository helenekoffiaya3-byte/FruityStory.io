export type SubscriptionTier = "free" | "standard" | "premium" | "pro" | "ultra_pro";

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  priceEUR: number;
  credits: number;
  dailyVideoLimit: number;
  maxDurationMinutes: number;
  maxScenes: number;
  maxSceneDurationSeconds?: number;
  discountPercent: number;
  providers: Array<"veo" | "pixverse">;
  features: string[];
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: "free",
    name: "Free",
    priceEUR: 0,
    credits: 0,
    dailyVideoLimit: 0,
    maxDurationMinutes: 0,
    maxScenes: 0,
    discountPercent: 0,
    providers: [],
    features: [],
  },
  standard: {
    tier: "standard",
    name: "Standard",
    priceEUR: 7.99,
    credits: 4000,
    dailyVideoLimit: 10,
    maxDurationMinutes: 7,
    maxScenes: 10,
    discountPercent: 20,
    providers: ["veo"],
    features: ["10 scènes assemblées", "Veo 3.1"],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    priceEUR: 15.99,
    credits: 7000,
    dailyVideoLimit: 15,
    maxDurationMinutes: 14,
    maxScenes: 18,
    maxSceneDurationSeconds: 40,
    discountPercent: 7,
    providers: ["veo", "pixverse"],
    features: ["18 scènes de 40 secondes", "assemblage vidéo"],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceEUR: 20.99,
    credits: 10000,
    dailyVideoLimit: 20,
    maxDurationMinutes: 19,
    maxScenes: 90,
    discountPercent: 0,
    providers: ["veo", "pixverse"],
    features: ["assemblage jusqu'à 90 scènes par IA"],
  },
  ultra_pro: {
    tier: "ultra_pro",
    name: "Ultra Pro ⭐💫",
    priceEUR: 90.99,
    credits: 19000,
    dailyVideoLimit: 40,
    maxDurationMinutes: 22,
    maxScenes: 120,
    maxSceneDurationSeconds: 60,
    discountPercent: 0,
    providers: ["veo", "pixverse"],
    features: [
      "fonctionnalités personnalisées",
      "1 fonctionnalité personnalisée par jour",
      "téléréalité",
      "dramas",
      "comédies",
      "Agent GPT pour scripts et scènes",
      "120 scènes jusqu'à 60 secondes",
    ],
  },
};

export function getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier] ?? SUBSCRIPTION_PLANS.free;
}
