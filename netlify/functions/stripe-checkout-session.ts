import type { Handler } from '@netlify/functions';
import { bearer } from '../../backend/src/auth';
import { getUser } from '../../backend/src/repository';
import { createSubscriptionCheckout } from '../../backend/src/stripe';
import { getPlan, type BillingPeriod, type PlanId } from '../../backend/src/stripe-plans';

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: { allow: 'POST' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    const auth = bearer(event);
    if (!auth) return { statusCode: 401, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Authentication required' }) };
    const user = await getUser(auth.id);
    if (!user) return { statusCode: 401, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'User not found' }) };
    const body = JSON.parse(event.body || '{}');
    const planId = String(body.plan || body.planId || '') as PlanId;
    const billingPeriod = (body.billing === 'annual' || body.billingPeriod === 'annual' ? 'annual' : 'monthly') as BillingPeriod;
    if (!getPlan(planId)) return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Invalid plan' }) };
    const result = await createSubscriptionCheckout(auth.id, user.email, planId, billingPeriod);
    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ id: result.id, url: result.url, plan: result.plan, billingPeriod: result.billingPeriod }) };
  } catch (error) {
    const statusCode = (error as any)?.status || 400;
    return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: error instanceof Error ? error.message : 'Stripe error' }) };
  }
};
