import Stripe from "stripe";
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const priceId = Netlify.env.get("STRIPE_PRICE_ULTRA_PRO_ANNUAL");

  if (!secretKey || !priceId) {
    return new Response(JSON.stringify({ error: "Stripe configuration is incomplete" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const stripe = new Stripe(secretKey);

  // Ultra Pro annuel: 299,90 € - 200 € = 99,90 €.
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    discounts: [{ coupon: "ULTRA_PRO_ANNUEL_-200EUR" }],
    success_url: `${new URL(req.url).origin}/dashboard?checkout=success`,
    cancel_url: `${new URL(req.url).origin}/subscriptions?checkout=cancelled`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/checkout/ultra-pro-annual",
};
