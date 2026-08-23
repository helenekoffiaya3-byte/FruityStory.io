export type PlanId = 'standard' | 'premium' | 'pro' | 'ultra_king' | 'ultra_premium_kingdom';
export type BillingPeriod = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  currency: 'eur';
  price: number;
  annualPrice: number | null;
  credits: number;
  bonusCredits: number;
  videosPerDay: number | null;
  maxDurationMinutes: number | null;
  categories: string[];
  customFeatures: number;
  agentGpt: boolean;
  priceEnv: string;
  annualPriceEnv: string | null;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  standard: {
    id: 'standard', name: 'Standard', currency: 'eur', price: 7.99, annualPrice: 79.90,
    credits: 7000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: 5,
    categories: ['standard'], customFeatures: 0, agentGpt: false,
    priceEnv: 'STRIPE_PRICE_STANDARD', annualPriceEnv: 'STRIPE_PRICE_STANDARD_ANNUAL'
  },
  premium: {
    id: 'premium', name: 'Premium', currency: 'eur', price: 15.99, annualPrice: 159.90,
    credits: 15000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: 9,
    categories: ['standard', 'comedies'], customFeatures: 0, agentGpt: false,
    priceEnv: 'STRIPE_PRICE_PREMIUM', annualPriceEnv: 'STRIPE_PRICE_PREMIUM_ANNUAL'
  },
  pro: {
    id: 'pro', name: 'Pro', currency: 'eur', price: 20.99, annualPrice: 209.90,
    credits: 30000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all'], customFeatures: 0, agentGpt: false,
    priceEnv: 'STRIPE_PRICE_PRO', annualPriceEnv: 'STRIPE_PRICE_PRO_ANNUAL'
  },
  ultra_king: {
    id: 'ultra_king', name: 'Ultra King', currency: 'eur', price: 200, annualPrice: null,
    credits: 100000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all'], customFeatures: 5, agentGpt: true,
    priceEnv: 'STRIPE_PRICE_ULTRA_KING', annualPriceEnv: null
  },
  ultra_premium_kingdom: {
    id: 'ultra_premium_kingdom', name: 'Ultra Premium Kingdom', currency: 'eur', price: 400, annualPrice: null,
    credits: 500000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all', 'kingdom'], customFeatures: 5, agentGpt: true,
    priceEnv: 'STRIPE_PRICE_ULTRA_PREMIUM_KINGDOM', annualPriceEnv: null
  },
};

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

export function publicPlans() {
  return Object.values(PLANS).map(({ priceEnv, annualPriceEnv, ...plan }) => plan);
}
