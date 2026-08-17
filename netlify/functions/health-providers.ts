import type { Config, Context } from "@netlify/functions";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const timeoutSignal = (ms = 10000) => AbortSignal.timeout(ms);

function statusFromError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 180);
}

async function checkArk() {
  const key = process.env.ARK_API_KEY;
  if (!key) return { status: "missing", message: "ARK_API_KEY is not configured" };

  const response = await fetch("https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: timeoutSignal(),
    body: JSON.stringify({
      model: "seed-2-0-lite-260228",
      messages: [{ role: "user", content: "Reply with OK" }],
      max_tokens: 4,
    }),
  });

  if (!response.ok) return { status: "invalid", httpStatus: response.status, message: "ARK authentication/model check failed" };
  return { status: "ok", model: "seed-2-0-lite-260228" };
}

async function checkGemini() {
  const key = process.env.GeminiAPIKey || process.env.GEMINI_API_KEY;
  if (!key) return { status: "missing", message: "Gemini API key is not configured" };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    { signal: timeoutSignal() },
  );

  if (!response.ok) return { status: "invalid", httpStatus: response.status, message: "Gemini authentication check failed" };
  return { status: "ok" };
}

async function checkPixVerse() {
  const key = process.env.PIXVERSE_API_KEY;
  if (!key) return { status: "missing", message: "PIXVERSE_API_KEY is not configured" };

  const response = await fetch("https://app-api.pixverse.ai/openapi/v2/account/balance", {
    headers: { "API-KEY": key, "Ai-trace-id": crypto.randomUUID() },
    signal: timeoutSignal(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ErrCode !== 0) {
    return { status: "invalid", httpStatus: response.status, message: "PixVerse authentication/balance check failed" };
  }

  return {
    status: "ok",
    credits: {
      monthly: data.Resp?.credit_monthly ?? null,
      package: data.Resp?.credit_package ?? null,
    },
  };
}

async function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_SECRET_KEY;
  if (!key) return { status: "missing", message: "Stripe secret key is not configured" };

  const response = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    signal: timeoutSignal(),
  });

  if (!response.ok) return { status: "invalid", httpStatus: response.status, message: "Stripe authentication check failed" };
  const data = await response.json();
  return { status: "ok", livemode: Boolean(data.livemode) };
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method Not Allowed" }, 405);
  if (process.env.HEALTH_PROVIDERS_ENABLED !== "true") return json({ error: "Not Found" }, 404);

  const auth = req.headers.get("authorization");
  const expected = process.env.HEALTH_PROVIDERS_TOKEN;
  if (expected && auth !== `Bearer ${expected}`) return json({ error: "Unauthorized" }, 401);

  const startedAt = Date.now();
  const results = await Promise.allSettled([
    checkArk(),
    checkGemini(),
    checkPixVerse(),
    checkStripe(),
  ]);

  const names = ["ark", "gemini", "pixverse", "stripe"] as const;
  const providers = Object.fromEntries(
    results.map((result, index) => [
      names[index],
      result.status === "fulfilled"
        ? result.value
        : { status: "error", message: statusFromError(result.reason) },
    ]),
  );

  const statuses = Object.values(providers).map((p) => p.status);
  const overall = statuses.every((s) => s === "ok") ? "ok" : statuses.some((s) => s === "ok") ? "partial" : "failed";

  return json({
    success: overall !== "failed",
    overall,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    providers,
    note: "Secret values are never returned by this endpoint.",
  });
};

export const config: Config = { path: "/api/health/providers", method: "GET" };
