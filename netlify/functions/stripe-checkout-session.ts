import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { priceId, mode = 'subscription', customerEmail, userId, credits = 0 } = body;
    if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: 'priceId is required' }) };
    if (mode !== 'subscription' && mode !== 'payment') return { statusCode: 400, body: JSON.stringify({ error: 'Invalid checkout mode' }) };

    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://fruitystory-io.netlify.app';
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url: `${baseUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits.html?payment=cancelled`,
      metadata: { userId: userId || '', credits: String(credits), provider: 'stripe' },
      subscription_data: mode === 'subscription' ? { metadata: { userId: userId || '', provider: 'stripe' } } : undefined,
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Stripe error' }) };
  }
};
