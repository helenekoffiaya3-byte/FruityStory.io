// FruityStory.io — Stripe Price configuration
// Concrete Stripe Price IDs are stored only in Netlify environment variables.
// This module contains no Stripe secret or concrete price value.

export const STRIPE_PRICE_ENV_KEYS = {
  standard: {
    monthly: 'STRIPE_PRICE_STANDARD',
    annual: 'STRIPE_PRICE_STANDARD_ANNUAL'
  },
  premium: {
    monthly: 'STRIPE_PRICE_PREMIUM',
    annual: 'STRIPE_PRICE_PREMIUM_ANNUAL'
  },
  pro: {
    monthly: 'STRIPE_PRICE_PRO',
    annual: 'STRIPE_PRICE_PRO_ANNUAL'
  },
  ultra_pro: {
    monthly: 'STRIPE_PRICE_ULTRA_PRO',
    annual: 'STRIPE_PRICE_ULTRA_PRO_ANNUAL'
  }
};

export function getStripePriceEnvKey(plan, billing) {
  const key = STRIPE_PRICE_ENV_KEYS[plan]?.[billing];
  if (!key) throw new Error('Plan ou période de facturation invalide.');
  return key;
}
