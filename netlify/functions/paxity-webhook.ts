import type { Config, Context } from "@netlify/functions";
import { db } from "../../backend/src/db";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const successStatuses = new Set(["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED"]);

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    const secret = process.env.PAXITY_WEBHOOK_SECRET;
    if (!secret || req.headers.get("x-paxity-webhook-secret") !== secret) return json({ error: "Unauthorized webhook" }, 401);

    const payload = await req.json().catch(() => ({})) as any;
    const data = payload?.data || payload;
    const transactionId = String(data?.transactionId || data?.transaction_id || "");
    const status = String(data?.status || payload?.status || "").toUpperCase();
    if (!transactionId) return json({ error: "transactionId is required" }, 400);

    await db().query(`CREATE TABLE IF NOT EXISTS fruitystory_payments (transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL, amount NUMERIC NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, provider_response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await db().query(`CREATE TABLE IF NOT EXISTS fruitystory_subscriptions (id BIGSERIAL PRIMARY KEY, transaction_id TEXT UNIQUE NOT NULL REFERENCES fruitystory_payments(transaction_id), user_id TEXT NOT NULL, plan_id TEXT NOT NULL, credits INTEGER NOT NULL, starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

    const payment = await db().query(`UPDATE fruitystory_payments SET status=$1, provider_response=$2, updated_at=now() WHERE transaction_id=$3 RETURNING user_id,plan_id,amount`, [status || "UNKNOWN", JSON.stringify(payload), transactionId]);
    if (!payment.rows[0]) return json({ error: "Unknown transaction" }, 404);

    if (successStatuses.has(status)) {
      const rawPlans = process.env.PAXITY_PLANS_JSON;
      if (!rawPlans) return json({ error: "PAXITY_PLANS_JSON is not configured" }, 500);
      const plans = JSON.parse(rawPlans) as Record<string, { amountXof: number; credits: number; durationDays: number }>;
      const plan = plans[payment.rows[0].planid || payment.rows[0].plan_id];
      if (!plan) return json({ error: "Subscription plan not configured" }, 500);
      const durationDays = Math.max(1, Number(plan.durationDays));
      const credits = Math.max(0, Math.floor(Number(plan.credits)));
      await db().query(`INSERT INTO fruitystory_subscriptions (transaction_id,user_id,plan_id,credits,starts_at,ends_at,status) VALUES ($1,$2,$3,$4,now(),now()+make_interval(days=>$5),'active') ON CONFLICT (transaction_id) DO NOTHING`, [transactionId, payment.rows[0].user_id, payment.rows[0].plan_id, credits, durationDays]);
    }

    return json({ received: true, transactionId, status });
  } catch (error) {
    console.error("Paxity webhook error", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
};

export const config: Config = { path: "/api/payments/paxity/webhook", method: "POST" };
