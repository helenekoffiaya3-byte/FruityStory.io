import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

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

  const subscription = ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(stripeEvent.type);
  if (subscription) {
    const sub = stripeEvent.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      console.log("Stripe subscription state", { userId, subscriptionId: sub.id, status: sub.status, priceId: sub.items.data[0]?.price.id });
      // TODO: persister l'état dans la base utilisateurs du projet.
      // Ne jamais faire confiance au frontend pour déterminer l'abonnement.
    }
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    console.log("Stripe checkout completed", { userId: session.metadata?.userId, sessionId: session.id, subscriptionId: session.subscription });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
