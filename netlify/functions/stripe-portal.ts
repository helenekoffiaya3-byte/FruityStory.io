import type { Config } from "@netlify/functions";
import Stripe from "stripe";

const env = (key: string) => Netlify.env.get(key) ?? "";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const key = env("STRIPE_RESTRICTED_KEY") || env("PAYMENT_SECRET_KEY");
    if (!key) return Response.json({ error: "Stripe server key is not configured" }, { status: 503 });

    const userId = request.headers.get("x-user-id") || "";
    if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const customerId = String(body.customerId || "");
    if (!customerId) return Response.json({ error: "Stripe customerId is required" }, { status: 400 });

    const stripe = new Stripe(key);
    const returnUrl = env("STRIPE_PORTAL_RETURN_URL") || new URL(request.url).origin + "/dashboard";
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return Response.json({ ok: true, portalUrl: session.url });
  } catch (error) {
    console.error("Stripe portal error", error);
    return Response.json({ error: "Unable to create Stripe Billing Portal session" }, { status: 500 });
  }
};

export const config: Config = { path: "/api/payments/portal" };
