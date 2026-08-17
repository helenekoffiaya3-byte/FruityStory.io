import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "Utilisez POST." });
  if (!process.env.STRIPE_SECRET_KEY) return json(500, { success: false, error: "STRIPE_SECRET_KEY manquante côté serveur." });

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { success: false, error: "JSON invalide." }); }
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const priceId = typeof body.priceId === "string" ? body.priceId.trim() : "";
  if (!userId || !priceId) return json(400, { success: false, error: "userId et priceId sont obligatoires." });

  const origin = process.env.PUBLIC_SITE_URL || "https://fruitstory.io";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing.html?payment=cancelled`,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });
  return json(200, { success: true, checkoutUrl: session.url, sessionId: session.id });
};
