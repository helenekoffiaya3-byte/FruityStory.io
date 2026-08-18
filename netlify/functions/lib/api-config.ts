export const API_CONFIG = {
  provider: "FruityStory",
  integration: "Aidram",
  plans: {
    standard: { priceUsd: 50, credits: 20000, billing: "annual" },
    pro: { priceUsd: 70, credits: 70000, billing: "annual" },
    premium: { priceUsd: 100, credits: 40000, billing: "annual" },
    ultraMegaGigaPremium: { priceUsd: 200, credits: 150000, billing: "annual" },
    megaGigaUltraPremiumPro: { priceUsd: 400, credits: 300000, billing: "annual" },
  },
} as const;

export type FruityStoryPlan = keyof typeof API_CONFIG.plans;
