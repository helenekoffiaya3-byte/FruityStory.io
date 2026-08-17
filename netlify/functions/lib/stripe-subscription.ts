import Stripe from "stripe";
import { getStoredSubscription } from "./stripe-subscription-store";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export type Plan = "standard" | "premium" | "ultra_premium" | "unknown";

export async function getVerifiedSubscription(userId: string) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquante côté serveur.");

  const stored = await getStoredSubscription(userId);
  if (!stored) return null;

  const active = ["active", "trialing"].includes(stored.status);
  if (!active) return null;

  const plan: Plan =
    stored.priceId === process.env.STRIPE_ULTRA_PREMIUM_PRICE_ID ? "ultra_premium" :
    stored.priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? "premium" :
    stored.priceId === process.env.STRIPE_STANDARD_PRICE_ID ? "standard" : "unknown";

  return {
    id: stored.subscriptionId,
    status: stored.status,
    priceId: stored.priceId,
    plan,
    customerId: stored.customerId,
    currentPeriodEnd: stored.currentPeriodEnd,
  };
}
