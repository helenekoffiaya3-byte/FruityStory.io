// FruityStory.io — Stripe Price IDs
// Price IDs are public identifiers. NEVER place STRIPE_SECRET_KEY in frontend code.

export const STRIPE_PRICES = {
  standard: {
    monthly: 'price_1U62WvCddMFAR9EQcMw4vpGU',
    annual: 'price_1U62X0CddMFAR9EQxMraf4R6'
  },
  premium: {
    monthly: 'price_1U62X5CddMFAR9EQUSG7neMT',
    annual: 'price_1U62XBCddMFAR9EQWic9vgPm'
  },
  pro: {
    monthly: 'price_1U62XHCddMFAR9EQkCpJpLRu',
    annual: 'price_1U62XMCddMFAR9EQhWM6vtMY'
  },
  ultra_pro: {
    monthly: 'price_1U62XSCddMFAR9EQE1bEmZUl',
    annual: 'price_1U62XgCddMFAR9EQaCyil9yW'
  }
};

export function getStripePriceId(plan, billing) {
  const price = STRIPE_PRICES[plan]?.[billing];
  if (!price) throw new Error('Plan ou période de facturation invalide.');
  return price;
}
