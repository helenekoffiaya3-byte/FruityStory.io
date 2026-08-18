export type PlanId = 'standard' | 'premium' | 'pro' | 'ultra_pro';

export interface PlanConfig {
  id: PlanId;
  name: string;
  currency: 'eur' | 'usd';
  price: number;
  credits: number;
  bonusCredits: number;
  videosPerDay: number | null;
  maxDurationMinutes: number | null;
  categories: string[];
  customFeatures: number;
  agentGpt: boolean;
  priceEnv: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  standard: {
    id: 'standard', name: 'Standard', currency: 'eur', price: 14.99,
    credits: 7000, bonusCredits: 1000, videosPerDay: null, maxDurationMinutes: 5,
    categories: ['standard'], customFeatures: 0, agentGpt: false, priceEnv: 'STRIPE_PRICE_STANDARD'
  },
  premium: {
    id: 'premium', name: 'Premium', currency: 'eur', price: 25.99,
    credits: 15000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: 9,
    categories: ['standard', 'comedies'], customFeatures: 0, agentGpt: false, priceEnv: 'STRIPE_PRICE_PREMIUM'
  },
  pro: {
    id: 'pro', name: 'Pro', currency: 'usd', price: 30,
    credits: 30000, bonusCredits: 0, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all'], customFeatures: 0, agentGpt: false, priceEnv: 'STRIPE_PRICE_PRO'
  },
  ultra_pro: {
    id: 'ultra_pro', name: 'Méga Giga Ultra Premium', currency: 'usd', price: 370,
    credits: 70000, bonusCredits: 13000, videosPerDay: null, maxDurationMinutes: null,
    categories: ['all', 'all-subscription-benefits'], customFeatures: 6, agentGpt: true, priceEnv: 'STRIPE_PRICE_ULTRA_PRO'
  },
};

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

export function publicPlans() {
  return Object.values(PLANS).map(({ priceEnv, ...plan }) => plan);
}
