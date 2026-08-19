import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured' }) };
  try {
    const { paymentIntentId, chargeId, amount, reason } = JSON.parse(event.body || '{}');
    if (!paymentIntentId && !chargeId) return { statusCode: 400, body: JSON.stringify({ error: 'paymentIntentId or chargeId is required' }) };
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId || undefined,
      charge: chargeId || undefined,
      amount: amount || undefined,
      reason: ['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason) ? reason : undefined,
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(refund) };
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Stripe refund error' }) };
  }
};
