import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import Stripe from "stripe";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const store = getStore({ name: "fruitystory-developer-platform", consistency: "strong" });
const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-headers": "Content-Type, Authorization, X-API-Key, X-User-Id", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS" }, body: JSON.stringify(body) });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const apiKeyFromEvent = (event: any) => { const auth = event.headers?.authorization || event.headers?.Authorization || ""; return String(event.headers?.["x-api-key"] || event.headers?.["X-API-Key"] || auth.replace(/^Bearer\s+/i, "")).trim(); };
const accountFromEvent = (event: any) => String(event.headers?.["x-user-id"] || event.headers?.["X-User-Id"] || "").trim();
const pathParts = (event: any) => (event.path || "").replace(/^.*\/developer-api\/?/, "").replace(/^\/api\/developer\/?/, "").split("/").filter(Boolean);
const readBody = (event: any) => { try { return event.body ? JSON.parse(event.body) : {}; } catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); } };
// FSK = FruityStory Key. FS Live remains accepted for backward compatibility.
const makeSecret = (type = "live") => `fsk_${type}_live_${randomBytes(32).toString("hex")}`;

interface KeyRecord { id: string; accountId: string; name: string; prefix: string; hash: string; type: string; createdAt: string; revokedAt?: string; rotatedFrom?: string; }
interface Usage { requests: number; videoJobs: number; creditsUsed: number; updatedAt: string; }
interface Wallet { credits: number; }

async function getKey(key: string): Promise<KeyRecord | null> { if (!key) return null; const direct = await store.get(`key:${hash(key)}`, { type: "json" }) as KeyRecord | null; if (direct) return direct; if (key.startsWith("fs_live_")) return await store.get(`legacy-key:${hash(key)}`, { type: "json" }) as KeyRecord | null; return null; }
async function getWallet(accountId: string): Promise<Wallet> { return ((await store.get(`wallet:${accountId}`, { type: "json" })) as Wallet | null) || { credits: 0 }; }
async function saveWallet(accountId: string, wallet: Wallet) { await store.setJSON(`wallet:${accountId}`, wallet); }
async function addUsage(keyId: string, credits: number, videoJobs = 0) { const current = ((await store.get(`usage:${keyId}`, { type: "json" })) as Usage | null) || { requests: 0, videoJobs: 0, creditsUsed: 0, updatedAt: new Date().toISOString() }; current.requests += 1; current.videoJobs += videoJobs; current.creditsUsed += credits; current.updatedAt = new Date().toISOString(); await store.setJSON(`usage:${keyId}`, current); return current; }
async function requireApiKey(event: any) { const record = await getKey(apiKeyFromEvent(event)); if (!record || record.revokedAt) throw Object.assign(new Error("Invalid or revoked FruityStory API key"), { status: 401 }); return record; }
async function stripeClient() { const secret = process.env.STRIPE_RESTRICTED_KEY || process.env.PAYMENT_SECRET_KEY; if (!secret) throw Object.assign(new Error("Stripe server key is not configured in Netlify"), { status: 503 }); return new Stripe(secret); }
function configuredPriceCredits(priceId: string) { try { const map = JSON.parse(process.env.STRIPE_PRICE_CREDITS_JSON || "{}"); const credits = Number(map[priceId]); return Number.isFinite(credits) && credits > 0 ? credits : 0; } catch { return 0; } }

async function createKey(accountId: string, name: string, type = "live", rotatedFrom?: string) {
  const secret = makeSecret(type);
  const record: KeyRecord = { id: randomUUID(), accountId, name: name || "My application", prefix: secret.slice(0, 24), hash: hash(secret), type, createdAt: new Date().toISOString(), ...(rotatedFrom ? { rotatedFrom } : {}) };
  await store.setJSON(`key:${record.hash}`, record);
  await store.setJSON(`account-key:${accountId}:${record.id}`, record);
  return { secret, record };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  try {
    const p = pathParts(event); const method = event.httpMethod || "GET";

    if (p[0] === "payments" && p[1] === "webhook" && method === "POST") {
      const secret = process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET; if (!secret) return json(503, { error: "Stripe webhook secret is not configured" });
      const signature = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"]; if (!signature) return json(400, { error: "Missing Stripe signature" }); const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || ""); const stripe = await stripeClient(); const stripeEvent = stripe.webhooks.constructEvent(raw, signature, secret);
      if (stripeEvent.type === "checkout.session.completed") { const session = stripeEvent.data.object as Stripe.Checkout.Session; const accountId = String(session.metadata?.accountId || ""); const keyId = String(session.metadata?.keyId || ""); const credits = Math.max(0, Number(session.metadata?.credits || 0)); if (accountId && credits > 0) { const eventKey = `stripe-event:${stripeEvent.id}`; const already = await store.get(eventKey); if (!already) { const wallet = await getWallet(accountId); wallet.credits += credits; await saveWallet(accountId, wallet); await store.set(eventKey, "processed"); if (keyId) await store.setJSON(`payment:${stripeEvent.id}`, { accountId, keyId, credits, sessionId: session.id, createdAt: new Date().toISOString() }); } } }
      return json(200, { received: true });
    }

    // FSK manager: create, list, revoke and rotate FruityStory Keys.
    if (p[0] === "keys") {
      const accountId = accountFromEvent(event); if (!accountId || accountId === "demo-user") return json(401, { error: "Authenticated FruityStory account required" });
      if (method === "POST" && p[1] === "rotate") {
        const keyId = p[2]; if (!keyId) return json(400, { error: "key id is required" }); const old = await store.get(`account-key:${accountId}:${keyId}`, { type: "json" }) as KeyRecord | null; if (!old) return json(404, { error: "Key not found" });
        if (!old.revokedAt) { old.revokedAt = new Date().toISOString(); await store.setJSON(`key:${old.hash}`, old); await store.setJSON(`account-key:${accountId}:${old.id}`, old); }
        const created = await createKey(accountId, old.name, old.type || "live", old.id); return json(201, { key: created.secret, id: created.record.id, name: created.record.name, type: created.record.type, prefix: created.record.prefix, rotatedFrom: old.id, warning: "The new FSK secret is displayed once. The previous key has been revoked." });
      }
      if (method === "POST") { const body = readBody(event); const type = String(body.type || "live").replace(/^fsk_/, "").replace(/_live_.*$/, "") || "live"; const created = await createKey(accountId, String(body.name || "My application"), type); return json(201, { key: created.secret, id: created.record.id, name: created.record.name, type: created.record.type, prefix: created.record.prefix, createdAt: created.record.createdAt, warning: "Save this FSK secret now. It cannot be displayed again." }); }
      if (method === "GET") { const { blobs } = await store.list({ prefix: `account-key:${accountId}:` }); const items = [] as any[]; for (const blob of blobs) { const item = await store.get(blob.key, { type: "json" }) as KeyRecord | null; if (item) { const { hash: _hash, ...safe } = item; items.push(safe); } } items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); return json(200, { items }); }
      if (method === "DELETE" && p[1]) { const item = await store.get(`account-key:${accountId}:${p[1]}`, { type: "json" }) as KeyRecord | null; if (!item) return json(404, { error: "Key not found" }); if (!item.revokedAt) item.revokedAt = new Date().toISOString(); await store.setJSON(`key:${item.hash}`, item); await store.setJSON(`account-key:${accountId}:${item.id}`, item); return json(200, { revoked: true, id: item.id, revokedAt: item.revokedAt }); }
    }

    const key = await requireApiKey(event); const wallet = await getWallet(key.accountId);
    if (p[0] === "account" && method === "GET") return json(200, { accountId: key.accountId, key: { id: key.id, name: key.name, prefix: key.prefix, type: key.type }, wallet, usage: await store.get(`usage:${key.id}`, { type: "json" }) || { requests: 0, videoJobs: 0, creditsUsed: 0 } });
    if (p[0] === "usage" && method === "GET") return json(200, { wallet, usage: await store.get(`usage:${key.id}`, { type: "json" }) || { requests: 0, videoJobs: 0, creditsUsed: 0 } });
    if (p[0] === "credits" && method === "GET") return json(200, { balance: wallet.credits });

    if (p[0] === "video" && p[1] === "generate" && method === "POST") {
      const body = readBody(event); const prompt = String(body.prompt || "").trim(); if (!prompt) return json(400, { error: "prompt is required" }); const cost = Math.max(1, Number(process.env.VIDEO_API_CREDIT_COST || 100)); if (!Number.isFinite(cost) || cost > 100000) return json(500, { error: "Invalid VIDEO_API_CREDIT_COST configuration" }); if (wallet.credits < cost) return json(402, { error: "Insufficient credits", balance: wallet.credits, required: cost });
      const base = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://api.fruitystory.io"; const master = process.env.FRUITYSTORY_API_KEY; if (!master) return json(503, { error: "FruityStory provider API is not configured" }); const upstream = await fetch(`${base}/api/v1/videos/generations`, { method: "POST", headers: { "content-type": "application/json", "authorization": `Bearer ${master}` }, body: JSON.stringify(body) }); const data = await upstream.json(); if (!upstream.ok) return json(upstream.status, data); wallet.credits -= cost; await saveWallet(key.accountId, wallet); const usage = await addUsage(key.id, cost, 1); await store.setJSON(`job-owner:${data.jobId}`, { accountId: key.accountId, keyId: key.id, credits: cost, createdAt: new Date().toISOString() }); return json(202, { ...data, creditsCharged: cost, balance: wallet.credits, usage });
    }
    if (p[0] === "video" && p[1] === "status" && method === "GET" && p[2]) { const base = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://api.fruitystory.io"; const master = process.env.FRUITYSTORY_API_KEY; if (!master) return json(503, { error: "FruityStory provider API is not configured" }); const upstream = await fetch(`${base}/api/v1/videos/generations/${encodeURIComponent(p[2])}`, { headers: { authorization: `Bearer ${master}` } }); const data = await upstream.json(); return json(upstream.status, data); }

    if (p[0] === "payments" && p[1] === "checkout" && method === "POST") { const body = readBody(event); const priceId = String(body.priceId || "").trim(); if (!priceId) return json(400, { error: "priceId is required" }); const credits = configuredPriceCredits(priceId); if (!credits) return json(400, { error: "This Stripe price is not mapped to a credit package on the server" }); const stripe = await stripeClient(); const site = process.env.STRIPE_SITE_URL || "https://fruitstory.io"; const session = await stripe.checkout.sessions.create({ mode: body.mode === "payment" ? "payment" : "subscription", line_items: [{ price: priceId, quantity: 1 }], success_url: body.successUrl || `${site}/developer.html?payment=success`, cancel_url: body.cancelUrl || `${site}/developer.html?payment=cancelled`, metadata: { accountId: key.accountId, keyId: key.id, credits: String(credits), priceId } }); return json(200, { id: session.id, url: session.url, credits: 0, pendingCredits: credits }); }
    if (p[0] === "providers" && method === "GET") return json(200, { provider: "FruityStory", keyFormat: "fsk_live_...", legacyKeyFormat: "fs_live_...", keyName: "FruityStory Key (FSK)", providers: [{ id: "veo", name: "Google Veo", capabilities: ["text-to-video", "cinematic", "up-to-300s"] }, { id: "pixverse", name: "PixVerse", capabilities: ["text-to-video", "image-to-video"] }], maxDurationSeconds: 300 });
    return json(404, { error: "Developer API endpoint not found" });
  } catch (error) { console.error("Developer API error", error); const status = Number((error as any)?.status || 400); return json(status >= 400 && status < 600 ? status : 400, { error: error instanceof Error ? error.message : "Developer API error" }); }
};
export const config = { path: "/api/developer/*" };
