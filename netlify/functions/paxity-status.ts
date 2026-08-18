import type { Config, Context } from "@netlify/functions";
import { db } from "../../backend/src/db";
import { bearer } from "../../backend/src/auth";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method Not Allowed" }, 405);
  try {
    const event = { headers: Object.fromEntries(req.headers.entries()) } as any;
    const user = bearer(event);
    if (!user) return json({ error: "Authentication required" }, 401);
    const transactionId = new URL(req.url).searchParams.get("transactionId") || "";
    if (!transactionId) return json({ error: "transactionId is required" }, 400);
    const payment = await db().query(`SELECT transaction_id,plan_id,amount,currency,status,created_at,updated_at FROM fruitystory_payments WHERE transaction_id=$1 AND user_id=$2`, [transactionId, user.id]);
    if (!payment.rows[0]) return json({ error: "Transaction not found" }, 404);
    const subscription = await db().query(`SELECT plan_id,credits,starts_at,ends_at,status FROM fruitystory_subscriptions WHERE transaction_id=$1`, [transactionId]);
    return json({ payment: payment.rows[0], subscription: subscription.rows[0] || null });
  } catch (error) {
    console.error("Paxity status error", error);
    return json({ error: "Unable to read payment status" }, 500);
  }
};

export const config: Config = { path: "/api/payments/paxity/status", method: "GET" };
