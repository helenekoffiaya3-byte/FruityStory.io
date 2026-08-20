import type { BillingPeriod, PlanId } from './stripe-plans';

/**
 * Stripe Price IDs are supplied only through Netlify environment variables.
 * No concrete Stripe price value is committed to GitHub.
 */
export const STRIPE_PRICE_ENV_KEYS: Record<PlanId, Record<BillingPeriod, string>> = {
  standard: { monthly: 'STRIPE_PRICE_STANDARD', annual: 'STRIPE_PRICE_STANDARD_ANNUAL' },
  premium: { monthly: 'STRIPE_PRICE_PREMIUM', annual: 'STRIPE_PRICE_PREMIUM_ANNUAL' },
  pro: { monthly: 'STRIPE_PRICE_PRO', annual: 'STRIPE_PRICE_PRO_ANNUAL' },
  ultra_pro: { monthly: 'STRIPE_PRICE_ULTRA_PRO', annual: 'STRIPE_PRICE_ULTRA_PRO_ANNUAL' },
};
