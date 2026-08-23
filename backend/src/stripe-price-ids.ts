import type { BillingPeriod, PlanId } from './stripe-plans';

/**
 * Stripe Price IDs are supplied through Netlify environment variables.
 * Concrete Price IDs are never exposed to the browser.
 */
export const STRIPE_PRICE_ENV_KEYS: Record<PlanId, Partial<Record<BillingPeriod, string>>> = {
  standard: { monthly: 'STRIPE_PRICE_STANDARD', annual: 'STRIPE_PRICE_STANDARD_ANNUAL' },
  premium: { monthly: 'STRIPE_PRICE_PREMIUM', annual: 'STRIPE_PRICE_PREMIUM_ANNUAL' },
  pro: { monthly: 'STRIPE_PRICE_PRO', annual: 'STRIPE_PRICE_PRO_ANNUAL' },
  ultra_king: { monthly: 'STRIPE_PRICE_ULTRA_KING' },
  ultra_premium_kingdom: { monthly: 'STRIPE_PRICE_ULTRA_PREMIUM_KINGDOM' },
};
