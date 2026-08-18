import type { Config } from "@netlify/functions";
import Stripe from "stripe";

const env = (key: string) => Netlify.env.get(key) ?? "";

function stripeClient() {
  const key = env("STRIPE_RESTRICTED_KEY") || env("PAYMENT_SECRET_KEY");
  if (!key) throw new Error("Stripe server key is not configured");
  return new Stripe(key);
}

const prices: Record<string, string> = {
  standard: env("STRIPE_STANDARD_PRICE_ID"),
  premium: env("STRIPE_PREMIUM_PRICE_ID"),
  pro: env("STRIPE_PRO_PRICE_ID"),
  ultra: env("STRIPE_ULTRA_PRICE_ID"),
};

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = await request.json().catch(() => ({}));
    const plan = String(body.plan ?? "").toLowerCase();
    const price = prices[plan];
    if (!price) return Response.json({ error: "Unknown plan or missing Stripe Price ID" }, { status: 400 });

    const userId = request.headers.get("x-user-id") || String(body.userId || "");
    if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });

    const stripe = stripeClient();
    const siteUrl = env("STRIPE_SITE_URL") || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: typeof body.email === "string" ? body.email : undefined,
      allow_promotion_codes: true,
      success_url: env("STRIPE_SUCCESS_URL") || `${siteUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env("STRIPE_CANCEL_URL") || `${siteUrl}/dashboard?payment=cancelled`,
      client_reference_id: userId,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return Response.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return Response.json({ error: "Unable to create Stripe Checkout session" }, { status: 500 });
  }
};

export const config: Config = { path: "/api/payments/checkout" };
