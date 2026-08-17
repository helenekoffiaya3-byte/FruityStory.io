import type { Handler } from "@netlify/functions";
import { getVeoVideoStatus } from "./providers/veo";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { success: false, error: "Utilisez GET ou POST." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(500, {
      success: false,
      error: "GEMINI_API_KEY manquante côté serveur.",
    });
  }

  let operationName = event.queryStringParameters?.operationName ?? null;
  if (!operationName && event.body) {
    try {
      const body = JSON.parse(event.body);
      if (typeof body?.operationName === "string") {
        operationName = body.operationName;
      }
    } catch {
      return json(400, { success: false, error: "JSON invalide." });
    }
  }

  if (!operationName?.trim()) {
    return json(400, {
      success: false,
      error: "operationName est obligatoire.",
    });
  }

  // Empêche qu'un nom d'opération arbitraire devienne une URL externe.
  if (!operationName.startsWith("operations/")) {
    return json(400, {
      success: false,
      error: "operationName Veo invalide.",
    });
  }

  try {
    const operation = await getVeoVideoStatus(operationName);

    return json(200, {
      success: true,
      provider: "google_veo",
      operation,
    });
  } catch (error) {
    console.error("Veo status failed:", error);
    return json(502, {
      success: false,
      error: "Impossible de récupérer le statut de la génération Veo.",
    });
  }
};
