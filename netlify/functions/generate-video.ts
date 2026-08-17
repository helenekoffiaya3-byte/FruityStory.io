import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import { reserveDailyVideoQuota, releaseDailyVideoQuota, MAX_PER_DAY } from "./lib/atomic-video-quota";
import { createVeoVideo } from "./providers/veo";
import { createPixVerseVideo } from "./providers/pixverse";

const redis = Redis.fromEnv();
const QUEUE_KEY = "video-generation-queue";
const JOB_TTL = 86400;

function json(statusCode: number, body: unknown) { return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: JSON.stringify(body) }; }

function getUserId(event: Parameters<Handler>[0], body: any) { const value = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : event.headers["x-user-id"] || ""; return value.trim() || null; }

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "Utilisez POST." });
  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { success: false, error: "JSON invalide." }); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json(400, { success: false, error: "Le champ prompt est obligatoire." });
  const userId = getUserId(event, body);
  if (!userId) return json(401, { success: false, error: "Utilisateur non authentifié." });

  const provider = String(body.provider || "veo").toLowerCase();
  if (provider !== "veo" && provider !== "pixverse") return json(400, { success: false, error: "provider doit être 'veo' ou 'pixverse'." });
  if (provider === "veo" && !process.env.GEMINI_API_KEY) return json(500, { success: false, error: "GEMINI_API_KEY manquante côté serveur." });
  if (provider === "pixverse" && !process.env.PIXVERSE_API_KEY) return json(500, { success: false, error: "PIXVERSE_API_KEY manquante côté serveur." });

  const quota = await reserveDailyVideoQuota(redis, userId);
  if (!quota) return json(429, { success: false, error: `Quota quotidien atteint : maximum ${MAX_PER_DAY} vidéos par jour.`, quota: { videosCreatedToday: MAX_PER_DAY, dailyLimit: MAX_PER_DAY, remaining: 0, resetDate: new Date().toISOString().slice(0, 10) } });

  const jobId = randomUUID();
  try {
    const job = provider === "veo"
      ? await createVeoVideo({ prompt, aspectRatio: body.aspectRatio === "9:16" ? "9:16" : "16:9", resolution: body.resolution === "1080p" || body.resolution === "4k" ? body.resolution : "720p" })
      : await createPixVerseVideo({ prompt, model: body.model === "c1" ? "c1" : "v6", duration: body.seconds, quality: body.quality || "720p", aspectRatio: body.aspectRatio || "9:16", generateAudio: typeof body.generateAudio === "boolean" ? body.generateAudio : undefined, generateMultiClip: typeof body.generateMultiClip === "boolean" ? body.generateMultiClip : undefined });
    const operationId = provider === "veo" ? job.operationName : job.videoId;
    const record = { jobId, userId, provider, model: job.model, operationId, status: "queued", prompt, clips: body.clips || [jobId], completedClipUrls: [], quotaKey: quota.key, createdAt: new Date().toISOString() };
    await redis.set(`video-job:${jobId}`, record, { ex: JOB_TTL });
    await redis.rpush(QUEUE_KEY, jobId);
    return json(200, { success: true, jobId, provider: job.provider, model: job.model, job, status: "queued", quota: { videosCreatedToday: quota.count, dailyLimit: MAX_PER_DAY, remaining: MAX_PER_DAY - quota.count, resetDate: quota.resetDate } });
  } catch (error) {
    await releaseDailyVideoQuota(redis, quota.key);
    console.error(`${provider} generation failed:`, error);
    return json(502, { success: false, error: "Le fournisseur vidéo n'a pas accepté la génération. Le quota a été restauré." });
  }
};
