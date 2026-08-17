import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export type Plan = "standard" | "premium" | "ultra_premium" | "unknown";

export async function getVerifiedSubscription(userId: string) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquante côté serveur.");
  const subscriptions = await stripe.subscriptions.list({ status: "all", limit: 100 });
  const active = subscriptions.data.find((s) => s.metadata?.userId === userId && ["active", "trialing"].includes(s.status));
  if (!active) return null;
  const priceId = active.items.data[0]?.price.id || null;
  const plan: Plan = priceId === process.env.STRIPE_ULTRA_PREMIUM_PRICE_ID ? "ultra_premium" : priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? "premium" : priceId === process.env.STRIPE_STANDARD_PRICE_ID ? "standard" : "unknown";
  return { id: active.id, status: active.status, priceId, plan };
}
