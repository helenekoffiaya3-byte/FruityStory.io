import type { Config } from "@netlify/functions";
import Stripe from "stripe";

const env = (key: string) => Netlify.env.get(key) ?? "";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const secret = env("STRIPE_RESTRICTED_KEY") || env("PAYMENT_SECRET_KEY");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret || !webhookSecret) return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });

  try {
    const stripe = new Stripe(secret);
    const signature = request.headers.get("stripe-signature");
    if (!signature) return Response.json({ error: "Missing Stripe signature" }, { status: 400 });

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid":
      case "invoice.payment_failed":
        console.log("Stripe event", event.type, event.id);
        break;
      default:
        console.log("Unhandled Stripe event", event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook verification failed", error);
    return Response.json({ error: "Invalid Stripe webhook" }, { status: 400 });
  }
};

export const config: Config = { path: "/api/payments/webhook" };
