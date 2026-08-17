import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import { getStore } from "@netlify/blobs";
import { getVeoVideoStatus } from "./providers/veo";
import { getPixVerseVideoStatus } from "./providers/pixverse";
import { assembleVideoClips } from "./lib/assemble-video";

const redis = Redis.fromEnv();
const videos = getStore({ name: "fruitystory-videos", consistency: "strong" });
const QUEUE_KEY = "video-generation-queue";
const JOB_TTL = 86400;

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) };
}

async function processJob(jobId: string) {
  const key = `video-job:${jobId}`;
  const job: any = await redis.get(key);
  if (!job) return { skipped: true, reason: "job_not_found" };
  if (job.status === "completed" || job.status === "failed") return { skipped: true, reason: job.status };

  const result = job.provider === "pixverse" ? await getPixVerseVideoStatus(job.operationId) : await getVeoVideoStatus(job.operationId);
  const status = String((result as any)?.status || "").toLowerCase();
  const completed = job.provider === "pixverse" ? status === "completed" || status === "succeeded" || Boolean((result as any)?.url) : Boolean((result as any)?.done);
  const failed = status === "failed" || status === "error" || Boolean((result as any)?.error);

  if (failed) {
    await redis.set(key, { ...job, status: "failed", error: (result as any)?.error || "Provider video generation failed" }, { ex: JOB_TTL });
    return { jobId, status: "failed" };
  }
  if (!completed) {
    await redis.set(key, { ...job, status: "processing" }, { ex: JOB_TTL });
    return { jobId, status: "processing" };
  }

  const url = (result as any)?.url || (result as any)?.videoUrl || (result as any)?.operation?.response?.generatedVideos?.[0]?.video?.uri;
  if (!url) throw new Error("Vidéo terminée mais URL introuvable.");

  const clips = [...(job.completedClipUrls || []), url];
  const expected = Array.isArray(job.clips) && job.clips.length ? job.clips.length : 1;
  if (clips.length < expected) {
    await redis.set(key, { ...job, status: "processing", completedClipUrls: clips }, { ex: JOB_TTL });
    return { jobId, status: "processing", clips: clips.length, expected };
  }

  const finalBuffer = await assembleVideoClips(clips);
  const blobKey = `videos/${job.userId}/${jobId}.mp4`;
  await videos.set(blobKey, finalBuffer, { metadata: { contentType: "video/mp4", jobId, userId: String(job.userId), provider: String(job.provider), createdAt: new Date().toISOString() } });

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!siteUrl) throw new Error("URL Netlify manquante.");
  const finalVideoUrl = `${siteUrl.replace(/\/$/, "")}/.netlify/functions/video-file?key=${encodeURIComponent(blobKey)}`;

  await redis.set(key, { ...job, status: "completed", finalVideoUrl, blobKey, completedAt: new Date().toISOString() }, { ex: JOB_TTL });
  return { jobId, status: "completed", finalVideoUrl };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "Utilisez POST." });
  let body: any = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { success: false, error: "JSON invalide." }); }

  const requested = typeof body.jobId === "string" ? [body.jobId] : [];
  const ids = requested.length ? requested : ((await redis.lrange<string>(QUEUE_KEY, 0, 9)) || []);
  if (!ids.length) return json(200, { success: true, processed: [] });

  const processed = [];
  for (const id of ids) {
    try { processed.push(await processJob(id)); } catch (error) { processed.push({ jobId: id, status: "failed", error: error instanceof Error ? error.message : "Worker error" }); }
  }
  if (!requested.length) await redis.ltrim(QUEUE_KEY, ids.length, -1);
  return json(200, { success: true, processed });
};
