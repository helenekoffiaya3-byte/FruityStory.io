import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export const handler: Handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured' }) };
  try {
    const limit = Math.min(Number(event.queryStringParameters?.limit || 20), 100);
    const query = event.queryStringParameters?.query;
    const result = query
      ? await stripe.checkout.sessions.search({ query, limit })
      : await stripe.checkout.sessions.list({ limit, customer: event.queryStringParameters?.customer || undefined });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Stripe error' }) };
  }
};
