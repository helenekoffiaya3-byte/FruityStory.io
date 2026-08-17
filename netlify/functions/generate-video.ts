import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import {
  reserveDailyVideoQuota,
  releaseDailyVideoQuota,
  MAX_PER_DAY,
} from "./lib/atomic-video-quota";
import { createVeoVideo } from "./providers/veo";

const redis = Redis.fromEnv();

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getUserId(event: Parameters<Handler>[0], body: any) {
  // TODO: remplacer par l'identité issue de la session/JWT côté serveur.
  const value =
    typeof body?.userId === "string" && body.userId.trim()
      ? body.userId.trim()
      : event.headers["x-user-id"] || "";
  return value.trim() || null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, error: "Utilisez POST." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(500, {
      success: false,
      error: "GEMINI_API_KEY manquante côté serveur.",
    });
  }

  let body: any;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { success: false, error: "JSON invalide." });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return json(400, {
      success: false,
      error: "Le champ prompt est obligatoire.",
    });
  }

  const userId = getUserId(event, body);
  if (!userId) {
    return json(401, {
      success: false,
      error: "Utilisateur non authentifié.",
    });
  }

  // Le statut d'abonnement doit idéalement venir du serveur/auth, pas du client.
  if (body.subscription !== "ultra_premium") {
    return json(403, {
      success: false,
      error: "La génération vidéo nécessite Ultra Premium.",
    });
  }

  const quota = await reserveDailyVideoQuota(redis, userId);
  if (!quota) {
    return json(429, {
      success: false,
      error: `Quota quotidien atteint : maximum ${MAX_PER_DAY} vidéos par jour.`,
      quota: {
        videosCreatedToday: MAX_PER_DAY,
        dailyLimit: MAX_PER_DAY,
        remaining: 0,
        resetDate: new Date().toISOString().slice(0, 10),
      },
    });
  }

  try {
    const job = await createVeoVideo({
      prompt,
      aspectRatio: body.aspectRatio === "9:16" ? "9:16" : "16:9",
      resolution:
        body.resolution === "1080p" || body.resolution === "4k"
          ? body.resolution
          : "720p",
    });

    return json(200, {
      success: true,
      provider: job.provider,
      model: job.model,
      operationName: job.operationName,
      status: job.status,
      quota: {
        videosCreatedToday: quota.count,
        dailyLimit: MAX_PER_DAY,
        remaining: MAX_PER_DAY - quota.count,
        resetDate: quota.resetDate,
      },
    });
  } catch (error) {
    await releaseDailyVideoQuota(redis, quota.key);
    console.error("Veo generation failed:", error);

    return json(502, {
      success: false,
      error: "Veo n'a pas accepté la génération. Le quota a été restauré.",
    });
  }
};
