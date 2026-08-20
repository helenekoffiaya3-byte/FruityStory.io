import type { BillingPeriod, PlanId } from './stripe-plans';

export const STRIPE_PRICE_IDS: Record<PlanId, Record<BillingPeriod, string>> = {
  standard: { monthly: 'price_1U62WvCddMFAR9EQcMw4vpGU', annual: 'price_1U62X0CddMFAR9EQxMraf4R6' },
  premium: { monthly: 'price_1U62X5CddMFAR9EQUSG7neMT', annual: 'price_1U62XBCddMFAR9EQWic9vgPm' },
  pro: { monthly: 'price_1U62XHCddMFAR9EQkCpJpLRu', annual: 'price_1U62XMCddMFAR9EQhWM6vtMY' },
  ultra_pro: { monthly: 'price_1U62XSCddMFAR9EQE1bEmZUl', annual: 'price_1U62XgCddMFAR9EQaCyil9yW' },
};
