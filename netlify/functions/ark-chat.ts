import OpenAI from "openai";
import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    console.error("ARK_API_KEY is not configured");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "ARK_API_KEY is not configured on the server" }),
    };
  }

  let body: { message?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "message is required" }),
    };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://ark.ap-southeast.bytepluses.com/api/v3",
    });

    const completion = await client.chat.completions.create({
      model: "seed-2-0-lite-260228",
      messages: [{ role: "user", content: message }],
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        content: completion.choices[0]?.message?.content ?? "",
        model: "seed-2-0-lite-260228",
      }),
    };
  } catch (error) {
    console.error("Ark request failed", error);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Ark request failed" }),
    };
  }
};

export { handler };
