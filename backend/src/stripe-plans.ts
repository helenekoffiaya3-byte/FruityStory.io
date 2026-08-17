export type PlanId = 'standard' | 'premium' | 'pro' | 'ultra_pro';

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceEur: number;
  credits: number;
  videosPerDay: number;
  maxDurationMinutes: number;
  priceEnv: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  standard: { id: 'standard', name: 'Standard', priceEur: 7.99, credits: 4000, videosPerDay: 10, maxDurationMinutes: 7, priceEnv: 'STRIPE_PRICE_STANDARD' },
  premium: { id: 'premium', name: 'Premium', priceEur: 15.99, credits: 7000, videosPerDay: 15, maxDurationMinutes: 14, priceEnv: 'STRIPE_PRICE_PREMIUM' },
  pro: { id: 'pro', name: 'Pro', priceEur: 20.99, credits: 10000, videosPerDay: 20, maxDurationMinutes: 19, priceEnv: 'STRIPE_PRICE_PRO' },
  ultra_pro: { id: 'ultra_pro', name: 'Ultra Pro ⭐💫', priceEur: 90.99, credits: 19000, videosPerDay: 40, maxDurationMinutes: 22, priceEnv: 'STRIPE_PRICE_ULTRA_PRO' },
};

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

export function publicPlans() {
  return Object.values(PLANS).map(({ priceEnv, ...plan }) => plan);
}
