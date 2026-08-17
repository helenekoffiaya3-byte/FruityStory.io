import type { Handler } from "@netlify/functions";
import { createVeoVideo } from "./providers/veo";
import { createPixVerseVideo } from "./providers/pixverse";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" },
  body: JSON.stringify(body),
});

function tokenOk(event: Parameters<Handler>[0]) {
  const expected = process.env.VIDEO_TEST_TOKEN?.trim();
  if (!expected) return true;
  const auth = event.headers.authorization || event.headers.Authorization || "";
  return auth === `Bearer ${expected}`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "POST required" });
  if (process.env.VIDEO_GENERATION_TEST_ENABLED !== "true") return json(404, { success: false, error: "Video generation test disabled" });
  if (!tokenOk(event)) return json(401, { success: false, error: "Unauthorized" });

  let body: any = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { success: false, error: "Invalid JSON" }); }

  const requestedProvider = String(body.provider || "veo").toLowerCase();
  const provider = requestedProvider === "gemini" ? "veo" : requestedProvider;
  const prompt = String(body.prompt || "A cinematic tropical fruit garden at sunrise, gentle camera movement").trim();
  if (!["veo", "pixverse"].includes(provider)) return json(400, { success: false, error: "provider must be gemini, veo, or pixverse" });

  const testUserId = process.env.VIDEO_TEST_USER_ID || "fruitystory-video-test";
  const testTier = process.env.VIDEO_TEST_TIER || "pro";

  try {
    if (provider === "veo") {
      if (!process.env.GEMINI_API_KEY) return json(500, { success: false, provider: "gemini", error: "GEMINI_API_KEY missing" });
      const created = await createVeoVideo({ prompt, aspectRatio: body.aspectRatio === "9:16" ? "9:16" : "16:9", resolution: body.resolution === "1080p" || body.resolution === "4k" ? body.resolution : "720p" });
      return json(created.status === "completed" ? 200 : 202, { success: true, provider: "gemini", model: created.model, operationId: created.operationName, status: created.status, testUserId, testTier });
    }

    if (!process.env.PIXVERSE_API_KEY) return json(500, { success: false, provider, error: "PIXVERSE_API_KEY missing" });
    const created = await createPixVerseVideo({ prompt, model: body.model === "c1" ? "c1" : "v6", duration: Math.max(1, Math.min(15, Number(body.duration || 5))), quality: body.quality === "1080p" || body.quality === "540p" || body.quality === "360p" ? body.quality : "720p", aspectRatio: body.aspectRatio || "9:16", generateAudio: typeof body.generateAudio === "boolean" ? body.generateAudio : undefined });
    return json(202, { success: true, provider, model: created.model, operationId: created.videoId, status: created.status, testUserId, testTier });
  } catch (error) {
    console.error("video-generation-test", error);
    return json(502, { success: false, provider: provider === "veo" ? "gemini" : provider, error: error instanceof Error ? error.message : "Provider generation failed", testUserId, testTier });
  }
};
