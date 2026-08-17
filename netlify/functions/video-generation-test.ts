import type { Handler } from "@netlify/functions";
import { createVeoVideo, getVeoVideoStatus } from "./providers/veo";
import { createPixVerseVideo, getPixVerseVideoStatus } from "./providers/pixverse";

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

  const provider = String(body.provider || "veo").toLowerCase();
  const prompt = String(body.prompt || "A cinematic tropical fruit garden at sunrise, gentle camera movement").trim();
  if (!["veo", "pixverse"].includes(provider)) return json(400, { success: false, error: "provider must be veo or pixverse" });

  try {
    if (provider === "veo") {
      if (!process.env.GEMINI_API_KEY) return json(500, { success: false, error: "GEMINI_API_KEY missing" });
      const created = await createVeoVideo({ prompt, aspectRatio: body.aspectRatio === "9:16" ? "9:16" : "16:9", resolution: "720p" });
      if (created.status === "completed") return json(200, { success: true, provider, operationId: created.operationName, status: "completed" });
      return json(202, { success: true, provider, operationId: created.operationName, status: "processing", message: "Generation started. Poll the provider operation with the production worker/API." });
    }

    if (!process.env.PIXVERSE_API_KEY) return json(500, { success: false, error: "PIXVERSE_API_KEY missing" });
    const created = await createPixVerseVideo({ prompt, model: "v6", duration: 5, quality: "720p", aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16" });
    return json(202, { success: true, provider, operationId: created.videoId, status: "processing", message: "Generation started. Poll the production job API/worker for completion." });
  } catch (error) {
    console.error("video-generation-test", error);
    return json(502, { success: false, provider, error: error instanceof Error ? error.message : "Provider generation failed" });
  }
};
