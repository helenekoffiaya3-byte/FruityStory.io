import type { Handler } from "@netlify/functions";
import { createVeoVideo, getVeoVideoStatus } from "./providers/veo";
import { createPixVerseVideo, getPixVerseVideoStatus } from "./providers/pixverse";

/**
 * FruityStory Provider API
 *
 * Public API facade for third-party applications. Provider credentials stay
 * server-side; clients authenticate only with a FruityStory API key.
 */

type Provider = "veo" | "pixverse";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  },
  body: JSON.stringify(body),
});

function apiKeys(): string[] {
  return [process.env.FRUITYSTORY_API_KEY, process.env.FRUITYSTORY_API_KEYS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function authorized(event: Parameters<Handler>[0]): boolean {
  const configured = apiKeys();
  if (!configured.length) return false;
  const header = event.headers.authorization || event.headers.Authorization || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const key = event.headers["x-api-key"] || event.headers["X-API-Key"] || bearer;
  return Boolean(key && configured.includes(key));
}

function provider(value: unknown): Provider {
  const normalized = String(value || "veo").toLowerCase();
  if (normalized !== "veo" && normalized !== "pixverse") {
    throw new Error("provider doit être 'veo' ou 'pixverse'.");
  }
  return normalized;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (!authorized(event)) {
    return json(401, { success: false, error: "API key FruityStory invalide ou non configurée." });
  }

  const path = (event.path || "").replace(/^.*\/provider-api\/?/, "").replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);

  try {
    if (event.httpMethod === "GET" && path[0] === "providers") {
      return json(200, {
        success: true,
        providers: [
          { id: "veo", name: "Google Veo", capabilities: ["text-to-video", "image-to-video"] },
          { id: "pixverse", name: "PixVerse", capabilities: ["text-to-video"] },
        ],
      });
    }

    if (event.httpMethod === "POST" && path[0] === "videos") {
      const body = event.body ? JSON.parse(event.body) : {};
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json(400, { success: false, error: "prompt est obligatoire." });

      const selected = provider(body.provider);
      if (selected === "veo") {
        const job = await createVeoVideo({
          prompt,
          aspectRatio: body.aspectRatio === "9:16" ? "9:16" : "16:9",
          resolution: ["720p", "1080p", "4k"].includes(body.resolution) ? body.resolution : "720p",
        });
        return json(202, {
          success: true,
          provider: "veo",
          jobId: job.operationName,
          status: job.status,
          model: job.model,
          statusEndpoint: `/api/v1/videos/${encodeURIComponent(job.operationName)}?provider=veo`,
        });
      }

      const job = await createPixVerseVideo({
        prompt,
        model: body.model === "c1" ? "c1" : "v6",
        duration: Number(body.duration ?? 5),
        quality: ["360p", "540p", "720p", "1080p"].includes(body.quality) ? body.quality : "720p",
        aspectRatio: body.aspectRatio || "9:16",
        generateAudio: typeof body.generateAudio === "boolean" ? body.generateAudio : undefined,
        generateMultiClip: typeof body.generateMultiClip === "boolean" ? body.generateMultiClip : undefined,
      });
      return json(202, {
        success: true,
        provider: "pixverse",
        jobId: job.videoId,
        status: job.status,
        model: job.model,
        statusEndpoint: `/api/v1/videos/${encodeURIComponent(job.videoId)}?provider=pixverse`,
      });
    }

    if (event.httpMethod === "GET" && path[0] === "videos" && path[1]) {
      const selected = provider(event.queryStringParameters?.provider);
      if (selected === "veo") {
        const result = await getVeoVideoStatus(path[1]);
        return json(200, { success: true, provider: "veo", jobId: path[1], result });
      }
      const result = await getPixVerseVideoStatus(path[1]);
      return json(200, { success: true, provider: "pixverse", jobId: path[1], result });
    }

    return json(404, { success: false, error: "Endpoint API introuvable." });
  } catch (error) {
    console.error("FruityStory Provider API error", error);
    return json(502, {
      success: false,
      error: error instanceof Error ? error.message : "Provider error",
    });
  }
};

export const config = { path: "/api/v1/*" };
