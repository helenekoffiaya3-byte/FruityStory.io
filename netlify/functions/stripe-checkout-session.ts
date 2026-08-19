import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getStripePriceId } from '../../config/stripe-prices.js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Stripe is not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { plan, billing, customerEmail, userId } = body;

    if (!plan || !['standard', 'premium', 'pro', 'ultra_pro'].includes(plan)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
    }

    if (!billing || !['monthly', 'annual'].includes(billing)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid billing period' }) };
    }

    const priceId = getStripePriceId(plan, billing);
    const baseUrl = process.env.PUBLIC_SITE_URL || process.env.STRIPE_SITE_URL || 'https://fruitystory-io.netlify.app';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      success_url: `${baseUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscriptions.html?payment=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId: userId || '',
        plan,
        billing,
        priceId,
        provider: 'stripe'
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          plan,
          billing,
          priceId,
          provider: 'stripe'
        }
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (error) {
    console.error('Stripe Checkout error:', error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Stripe error' })
    };
  }
};
