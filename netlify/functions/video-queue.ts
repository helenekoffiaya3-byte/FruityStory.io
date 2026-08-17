import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import { createVeoVideo } from "./providers/veo";
import { createPixVerseVideo } from "./providers/pixverse";

const redis = Redis.fromEnv();
const QUEUE_KEY = "video-generation-queue";
const JOB_TTL = 86400;

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: JSON.stringify(body) };
}

function userId(event: any, body: any) {
  return (typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : (event.headers["x-user-id"] || "").trim()) || null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "Utilisez POST." });

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { success: false, error: "JSON invalide." }); }

  const uid = userId(event, body);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const provider = String(body.provider || "veo").toLowerCase();
  if (!uid) return json(401, { success: false, error: "Utilisateur non authentifié." });
  if (!prompt) return json(400, { success: false, error: "prompt est obligatoire." });
  if (!["veo", "gemini_veo", "pixverse"].includes(provider)) return json(400, { success: false, error: "Provider invalide." });

  const jobId = crypto.randomUUID();
  const jobKey = `video-job:${jobId}`;
  const job = { id: jobId, userId: uid, provider: provider === "pixverse" ? "pixverse" : "veo", status: "queued", prompt, clips: Array.isArray(body.clips) ? body.clips : [{ prompt }], createdAt: new Date().toISOString() };

  await redis.set(jobKey, job, { ex: JOB_TTL });
  await redis.rpush(QUEUE_KEY, jobId);

  // Démarrage immédiat du premier job. Le statut est conservé dans Redis;
  // le worker peut reprendre les jobs restants sans perdre la demande.
  try {
    const started = job.provider === "pixverse"
      ? await createPixVerseVideo({ prompt, model: body.model })
      : await createVeoVideo({ prompt, aspectRatio: body.aspectRatio, resolution: body.resolution });

    const operationId = job.provider === "pixverse"
      ? String((started as any).videoId || (started as any).video_id || "")
      : String((started as any).operation?.name || (started as any).operation?.id || "");

    await redis.set(jobKey, { ...job, status: "processing", operationId, startedAt: new Date().toISOString() }, { ex: JOB_TTL });
    return json(202, { success: true, jobId, provider: job.provider, status: "processing", operationId });
  } catch (error) {
    await redis.set(jobKey, { ...job, status: "failed", error: error instanceof Error ? error.message : "Generation failed" }, { ex: JOB_TTL });
    return json(502, { success: false, jobId, status: "failed", error: "Impossible de démarrer la génération." });
  }
};
