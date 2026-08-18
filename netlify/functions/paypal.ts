import type { Handler } from "@netlify/functions";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.PUBLIC_SITE_URL || "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  },
  body: JSON.stringify(body),
});

const paypalBase = () =>
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials are not configured");

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`PayPal OAuth failed: ${response.status}`);
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function planAmount(planId: string) {
  const key = `PAYPAL_${planId.toUpperCase()}_PRICE`;
  const amount = process.env[key];
  if (!amount || !/^\d+(\.\d{2})$/.test(amount)) {
    throw new Error(`Missing or invalid PayPal price for plan: ${planId}`);
  }
  return amount;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "POST required" });

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const action = payload.action;
    const token = await paypalAccessToken();

    if (action === "create-order") {
      const planId = String(payload.planId || "").trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(planId)) return json(400, { error: "Invalid planId" });

      const amount = planAmount(planId);
      const userId = payload.userId ? String(payload.userId).slice(0, 128) : "anonymous";
      const siteUrl = process.env.PUBLIC_SITE_URL || "https://fruitstory.io";

      const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `fruitstory-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: planId,
            custom_id: userId,
            description: `FruityStory.io ${planId} subscription`,
            amount: { currency_code: "EUR", value: amount },
          }],
          application_context: {
            brand_name: "FruityStory.io",
            user_action: "PAY_NOW",
            return_url: `${siteUrl}/payment/success?provider=paypal`,
            cancel_url: `${siteUrl}/payment/cancel?provider=paypal`,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) return json(response.status, { error: "PayPal order creation failed", details: data });
      return json(200, { id: data.id, status: data.status, links: data.links });
    }

    if (action === "capture-order") {
      const orderId = String(payload.orderId || "").trim();
      if (!/^[A-Z0-9-]+$/i.test(orderId)) return json(400, { error: "Invalid orderId" });

      const response = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `fruitstory-capture-${orderId}`,
        },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) return json(response.status, { error: "PayPal capture failed", details: data });

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
      return json(200, {
        id: data.id,
        status: data.status,
        captureId: capture?.id,
        amount: capture?.amount,
        planId: data.purchase_units?.[0]?.reference_id,
        userId: data.purchase_units?.[0]?.custom_id,
      });
    }

    return json(400, { error: "Unknown action", allowed: ["create-order", "capture-order"] });
  } catch (error) {
    console.error("PayPal integration error", error);
    return json(500, { error: error instanceof Error ? error.message : "PayPal integration error" });
  }
};
