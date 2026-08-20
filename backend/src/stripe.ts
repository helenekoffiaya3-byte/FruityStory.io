import Stripe from 'stripe';
import { db } from './db';
import { getPlan, type BillingPeriod, type PlanId } from './stripe-plans';
import { isProfessionalFreeAccount } from '../../netlify/functions/_lib/professional-free';

let client: Stripe | undefined;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_RESTRICTED_KEY;
  if (!key) throw Object.assign(new Error('STRIPE_SECRET_KEY is not configured'), { status: 503 });
  client ??= new Stripe(key);
  return client;
}

function priceIdFor(planId: PlanId, billingPeriod: BillingPeriod) {
  const plan = getPlan(planId);
  if (!plan) throw Object.assign(new Error('Unknown subscription plan'), { status: 400 });
  const envName = billingPeriod === 'annual' ? plan.annualPriceEnv : plan.priceEnv;
  const priceId = process.env[envName];
  if (!priceId) throw Object.assign(new Error(`${envName} is not configured`), { status: 503 });
  return { plan, priceId };
}

export async function createSubscriptionCheckout(userId: string, email: string | null | undefined, planId: PlanId, billingPeriod: BillingPeriod = 'monthly') {
  if (isProfessionalFreeAccount(email)) throw Object.assign(new Error('This professional account has permanent free access and cannot be charged by Stripe'), { status: 403 });
  const { plan, priceId } = priceIdFor(planId, billingPeriod);
  const s = stripe();
  const price = await s.prices.retrieve(priceId);
  const expectedAmount = Math.round((billingPeriod === 'annual' ? plan.annualPrice : plan.price) * 100);
  const expectedInterval = billingPeriod === 'annual' ? 'year' : 'month';
  if (price.currency !== plan.currency || price.unit_amount !== expectedAmount || price.type !== 'recurring' || price.recurring?.interval !== expectedInterval) {
    throw Object.assign(new Error(`Stripe price does not match ${plan.name} ${billingPeriod}`), { status: 500 });
  }
  const existing = await db().query('SELECT stripe_customer_id FROM subscriptions WHERE user_id=$1 AND status IN (\'active\',\'trialing\',\'past_due\') ORDER BY updated_at DESC LIMIT 1', [userId]);
  let customerId = existing.rows[0]?.stripe_customer_id as string | undefined;
  if (!customerId) { const customer = await s.customers.create({ email: email || undefined, metadata: { userId } }); customerId = customer.id; }
  const base = process.env.STRIPE_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://fruitystory-io.netlify.app';
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${base}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${base}/dashboard?subscription=cancelled`;
  const session = await s.checkout.sessions.create({ mode: 'subscription', customer: customerId, line_items: [{ price: priceId, quantity: 1 }], allow_promotion_codes: true, client_reference_id: userId, metadata: { userId, planId, billingPeriod }, subscription_data: { metadata: { userId, planId, billingPeriod } }, success_url: successUrl, cancel_url: cancelUrl });
  return { id: session.id, url: session.url, plan, billingPeriod };
}

async function grantCredits(userId: string, amount: number, reference: string) {
  const client = await db().connect();
  try { await client.query('BEGIN'); const existing = await client.query('SELECT 1 FROM credit_ledger WHERE reference=$1 LIMIT 1',[reference]); if (!existing.rowCount) await client.query('INSERT INTO credit_ledger(user_id, amount, type, reference) VALUES($1,$2,$3,$4)',[userId,amount,'purchase',reference]); await client.query('COMMIT'); }
  catch(e){ await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

export async function handleStripeWebhook(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET is not configured'), { status: 503 });
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription' || !session.subscription) return event.type;
    const userId = session.metadata?.userId || session.client_reference_id;
    const planId = session.metadata?.planId as PlanId | undefined;
    if (!userId || !planId || !getPlan(planId)) throw new Error('Checkout session is missing valid userId/planId metadata');
    const subscription: any = await stripe().subscriptions.retrieve(String(session.subscription));
    await db().query(`INSERT INTO subscriptions (user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,plan_id,status,current_period_end,cancel_at_period_end) VALUES($1,$2,$3,$4,$5,$6,to_timestamp($7),$8) ON CONFLICT (stripe_subscription_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status=EXCLUDED.status,current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=now()`, [userId,String(session.customer),subscription.id,String(subscription.items.data[0]?.price.id||''),planId,subscription.status,subscription.current_period_end,subscription.cancel_at_period_end]);
    await grantCredits(userId,getPlan(planId)!.credits + getPlan(planId)!.bonusCredits,`stripe:${subscription.id}:initial`);
  }
  if (event.type === 'invoice.paid') {
    const invoice: any = event.data.object; const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (subscriptionId) { const row=await db().query('SELECT user_id,plan_id FROM subscriptions WHERE stripe_subscription_id=$1 LIMIT 1',[subscriptionId]); if(row.rows[0]){const plan=getPlan(row.rows[0].plan_id);if(plan) await grantCredits(row.rows[0].user_id,plan.credits,`stripe:${subscriptionId}:invoice:${invoice.id}`);}}
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription: any = event.data.object; const row=await db().query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id=$1 LIMIT 1',[subscription.id]); const planId=(subscription.metadata?.planId||undefined) as PlanId|undefined;
    await db().query(`UPDATE subscriptions SET status=$1,current_period_end=to_timestamp($2),cancel_at_period_end=$3,plan_id=COALESCE($4,plan_id),updated_at=now() WHERE stripe_subscription_id=$5`,[subscription.status,subscription.current_period_end,subscription.cancel_at_period_end,planId||null,subscription.id]);
    if(event.type==='customer.subscription.deleted'&&row.rows[0]) await db().query('UPDATE subscriptions SET status=\'canceled\',updated_at=now() WHERE stripe_subscription_id=$1',[subscription.id]);
  }
  return event.type;
}
