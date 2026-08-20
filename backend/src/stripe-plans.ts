export type PlanId = 'standard' | 'premium' | 'pro' | 'ultra_pro';
export type BillingPeriod = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  currency: 'eur';
  price: number;
  annualPrice: number;
  credits: number;
  bonusCredits: number;
  videosPerDay: number | null;
  maxDurationMinutes: number | null;
  categories: string[];
  customFeatures: number;
  agentGpt: boolean;
  priceEnv: string;
  annualPriceEnv: string;
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
  ultra_pro: {
    id: 'ultra_pro', name: 'Méga Giga Ultra Premium', currency: 'eur', price: 29.99, annualPrice: 299.90,
    credits: 70000, bonusCredits: 13000, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all', 'all-subscription-benefits'], customFeatures: 6, agentGpt: true,
    priceEnv: 'STRIPE_PRICE_ULTRA_PRO', annualPriceEnv: 'STRIPE_PRICE_ULTRA_PRO_ANNUAL'
  },
};

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

export function publicPlans() {
  return Object.values(PLANS).map(({ priceEnv, annualPriceEnv, ...plan }) => plan);
}
