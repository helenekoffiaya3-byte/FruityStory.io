import type { Handler } from "@netlify/functions";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL || "https://1ew6qd.api.infobip.com";
  const sender = process.env.INFOBIP_EMAIL_SENDER;

  if (!apiKey || !sender) {
    console.error("Missing INFOBIP_API_KEY or INFOBIP_EMAIL_SENDER");
    return json(500, { error: "Email service is not configured" });
  }

  let payload: {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!payload.to || !payload.subject || (!payload.text && !payload.html)) {
    return json(400, {
      error: "Required fields: to, subject, and text or html",
    });
  }

  const content: Record<string, string> = {};
  content.subject = payload.subject;
  if (payload.text) content.text = payload.text;
  if (payload.html) content.html = payload.html;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/email/4/messages`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: [{ destination: payload.to }] }],
            sender,
            content,
          },
        ],
      }),
    });

    const responseText = await response.text();
    let responseBody: unknown = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      console.error("Infobip email request failed", {
        status: response.status,
        body: responseBody,
      });
      return json(502, { error: "Email provider rejected the request" });
    }

    return json(200, { ok: true, provider: "infobip" });
  } catch (error) {
    console.error("Infobip email request error", error);
    return json(502, { error: "Unable to reach email provider" });
  }
};
