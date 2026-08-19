import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export const handler: Handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured' }) };
  const id = event.queryStringParameters?.id;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id is required' }) };
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) };
  } catch (error) {
    return { statusCode: 404, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Session not found' }) };
  }
};
