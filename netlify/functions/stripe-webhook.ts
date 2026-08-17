import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { saveSubscription, deleteStoredSubscription } from "./lib/stripe-subscription-store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function planFromPrice(priceId: string | null) {
  if (priceId === process.env.STRIPE_ULTRA_PREMIUM_PRICE_ID) return "ultra_premium" as const;
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium" as const;
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return "standard" as const;
  return "unknown" as const;
}

async function persistSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const priceId = sub.items.data[0]?.price.id ?? null;
  await saveSubscription({
    userId,
    subscriptionId: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    status: sub.status,
    priceId,
    plan: planFromPrice(priceId),
    currentPeriodEnd: sub.items.data[0]?.current_period_end ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: "Stripe secrets manquants." };

  const signature = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  if (!signature || !event.body) return { statusCode: 400, body: "Signature Stripe manquante." };

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return { statusCode: 400, body: "Signature invalide." };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await persistSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
            await deleteStoredSubscription(userId);
          } else {
            await persistSubscription(sub);
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
          await persistSubscription(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
          await persistSubscription(sub);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing error", error);
    return { statusCode: 500, body: "Erreur de traitement du webhook." };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
