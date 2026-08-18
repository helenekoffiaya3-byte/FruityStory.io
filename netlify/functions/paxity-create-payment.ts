import type { Config, Context } from "@netlify/functions";
import { db } from "../../backend/src/db";
import { bearer } from "../../backend/src/auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; };

function plans() {
  const raw = required("PAXITY_PLANS_JSON");
  const value = JSON.parse(raw) as Record<string, { amountXof: number; credits: number; durationDays: number }>;
  return value;
}

async function ensureTables() {
  await db().query(`CREATE TABLE IF NOT EXISTS fruitystory_payments (transaction_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL, amount NUMERIC NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, provider_response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db().query(`CREATE TABLE IF NOT EXISTS fruitystory_subscriptions (id BIGSERIAL PRIMARY KEY, transaction_id TEXT UNIQUE NOT NULL REFERENCES fruitystory_payments(transaction_id), user_id TEXT NOT NULL, plan_id TEXT NOT NULL, credits INTEGER NOT NULL, starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    await ensureTables();
    const event = { headers: Object.fromEntries(req.headers.entries()) } as any;
    const user = bearer(event);
    if (!user) return json({ error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({})) as { planId?: string; phoneNumber?: string; prefixPhone?: string; codeOtp?: string };
    const planId = String(body.planId || "").trim();
    const phoneNumber = String(body.phoneNumber || "").replace(/\s+/g, "");
    const prefixPhone = String(body.prefixPhone || "225");
    if (!planId || !phoneNumber) return json({ error: "planId and phoneNumber are required" }, 400);
    if (!/^225$/.test(prefixPhone) || !/^0\d{9}$/.test(phoneNumber)) return json({ error: "Invalid Côte d'Ivoire phone number" }, 400);

    const plan = plans()[planId];
    if (!plan || !Number.isFinite(plan.amountXof) || plan.amountXof <= 0) return json({ error: "Unknown subscription plan" }, 400);

    const createUrl = required("PAXITY_CREATE_PAYMENT_URL");
    const token = process.env.PAXITY_API_TOKEN;
    const ipn = process.env.PAXITY_IPN_URL || `${new URL(req.url).origin}/api/payments/paxity/webhook`;
    const payload = {
      amount: plan.amountXof,
      country: "CI",
      currency: "XOF",
      phoneNumber,
      prefixPhone: "225",
      paymentMethod: process.env.PAXITY_PAYMENT_METHOD || "OMCI",
      ...(body.codeOtp ? { codeOtp: String(body.codeOtp) } : {}),
      description: `FruityStory.io abonnement ${planId}`,
      idClient: user.id,
      ipn,
    };

    const response = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.code >= 400) return json({ error: "Paxity payment creation failed", providerCode: data?.code ?? response.status }, 502);

    const transactionId = String(data?.data?.transactionId || "");
    if (!transactionId) return json({ error: "Paxity did not return a transactionId" }, 502);

    await db().query(`INSERT INTO fruitystory_payments (transaction_id,user_id,plan_id,amount,currency,status,provider_response) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (transaction_id) DO UPDATE SET provider_response=$7,updated_at=now()`, [transactionId, user.id, planId, plan.amountXof, "XOF", String(data?.data?.status || "PENDING"), JSON.stringify(data)]);

    return json({ success: true, status: data?.data?.status || "PENDING", transactionId, link: data?.data?.link || null }, 201);
  } catch (error) {
    console.error("Paxity create payment error", error);
    return json({ error: error instanceof Error ? error.message : "Payment creation failed" }, 500);
  }
};

export const config: Config = { path: "/api/payments/paxity/create", method: "POST" };
