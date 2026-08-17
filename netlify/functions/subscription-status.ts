import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function json(statusCode: number, body: unknown) { return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" }, body: JSON.stringify(body) }; }

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "GET") return json(405, { success: false, error: "Utilisez GET." });
  if (!process.env.STRIPE_SECRET_KEY) return json(500, { success: false, error: "STRIPE_SECRET_KEY manquante." });

  const userId = (event.queryStringParameters?.userId || "").trim();
  if (!userId) return json(401, { success: false, error: "Utilisateur non authentifié." });

  // Cette première version utilise Stripe comme source de vérité et cherche les abonnements
  // portant le metadata userId. En production, userId doit provenir d'une session/JWT vérifiée.
  const subscriptions = await stripe.subscriptions.list({ status: "all", limit: 100 });
  const active = subscriptions.data.find((s) => s.metadata?.userId === userId && ["active", "trialing", "past_due"].includes(s.status));
  if (!active) return json(200, { success: true, subscribed: false, plan: null });

  const priceId = active.items.data[0]?.price.id || null;
  const plan = priceId === process.env.STRIPE_ULTRA_PREMIUM_PRICE_ID ? "ultra_premium" : priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? "premium" : priceId === process.env.STRIPE_STANDARD_PRICE_ID ? "standard" : "unknown";
  return json(200, { success: true, subscribed: true, plan, status: active.status, subscriptionId: active.id, priceId });
};
