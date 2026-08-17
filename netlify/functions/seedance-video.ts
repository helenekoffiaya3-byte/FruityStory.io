import type { Config, Context } from "@netlify/functions";

// Seedance 2 server-side gateway for FruityStory.io.
// Default route: BytePlus ModelArk international AP.
// Set ARK_API_KEY, and optionally SEEDANCE_BASE_URL / SEEDANCE_MODEL in Netlify.

type Body = {
  prompt?: string;
  model?: string;
  duration?: number;
  aspectRatio?: "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
  resolution?: "720p" | "1080p";
  imageUrl?: string;
  seed?: number;
  generateAudio?: boolean;
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function route() {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY is not configured");
  const baseUrl = (process.env.SEEDANCE_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3").replace(/\/$/, "");
  const model = process.env.SEEDANCE_MODEL || "dreamina-seedance-2-0-260128";
  if (baseUrl.includes("bytepluses.com") && !model.startsWith("dreamina-seedance-")) throw new Error("BytePlus requires a dreamina-seedance-* model ID");
  if (baseUrl.includes("volces.com") && !model.startsWith("doubao-seedance-")) throw new Error("Volcengine requires a doubao-seedance-* model ID");
  return { key, baseUrl, model };
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    const body = (await req.json()) as Body;
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return json({ error: "prompt is required" }, 400);

    const { key, baseUrl, model: configuredModel } = route();
    const model = body.model || configuredModel;
    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    if (body.imageUrl) content.push({ type: "image_url", image_url: { url: body.imageUrl } });

    const payload: Record<string, unknown> = {
      model,
      content,
      ratio: body.aspectRatio || "9:16",
      resolution: body.resolution || "720p",
      duration: Math.min(15, Math.max(4, Math.round(body.duration || 5))),
      generate_audio: body.generateAudio ?? true,
    };
    if (body.seed !== undefined) payload.seed = body.seed;

    const response = await fetch(`${baseUrl}/contents/generations/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ success: false, error: data?.error?.message || data?.message || `Seedance request failed (${response.status})` }, response.status);

    const taskId = data?.id || data?.task_id || data?.task?.id;
    if (!taskId) return json({ success: false, error: "Seedance returned no task ID" }, 502);
    return json({ success: true, provider: "seedance", status: "processing", taskId, model, statusEndpoint: "/api/video/seedance-status" }, 202);
  } catch (error) {
    console.error("Seedance generation error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Seedance generation failed" }, 500);
  }
}

export const config: Config = { path: "/api/video/seedance", method: "POST" };
