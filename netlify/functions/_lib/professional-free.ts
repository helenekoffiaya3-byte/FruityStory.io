export const PROFESSIONAL_FREE_EMAIL = 'FruityStorypro@gmail.com';

export function isProfessionalFreeAccount(email?: string | null): boolean {
  return String(email || '').trim().toLowerCase() === PROFESSIONAL_FREE_EMAIL.toLowerCase();
}

/** Permanent server-side entitlement: this account must never be charged by Stripe. */
export const PROFESSIONAL_FREE_ENTITLEMENTS = {
  plan: 'professional-free',
  billing: 'free',
  stripeChargeable: false,
  allPersonalities: true,
  premiumFeatures: true,
  developmentAndTesting: true,
  advertisingTools: true,
  publishingPreparation: true,
} as const;
