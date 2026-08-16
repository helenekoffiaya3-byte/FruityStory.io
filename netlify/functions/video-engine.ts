import type { Config, Context } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// Server-side video gateway for FruityStory.io.
// Supported providers: Google Veo and PixVerse.
// Seedance has been removed. NEVER send provider API keys from the browser.

type Provider = "veo" | "pixverse";
type Body = {
  provider?: Provider;
  prompt?: string;
  model?: string;
  duration?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  resolution?: "720p" | "1080p" | "4k";
  imageUrl?: string;
  seed?: number;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function generateVeo(body: Body) {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  const model = body.model || "veo-3.1-generate-preview";

  const operation = await ai.models.generateVideos({
    model,
    prompt: body.prompt!,
    ...(body.imageUrl
      ? {
          image: {
            imageBytes: await fetchImageAsBase64(body.imageUrl),
            mimeType: "image/png",
          },
        }
      : {}),
    config: {
      ...(body.aspectRatio ? { aspectRatio: body.aspectRatio } : {}),
      ...(body.resolution ? { resolution: body.resolution } : {}),
      ...(body.seed !== undefined ? { seed: body.seed } : {}),
    },
  });

  return {
    provider: "veo",
    status: operation.done ? "completed" : "processing",
    operationName: operation.name,
    model,
    ...(operation.done && operation.response?.generatedVideos?.[0]?.video?.uri
      ? { videoUrl: operation.response.generatedVideos[0].video.uri }
      : {}),
  };
}

async function generatePixVerse(body: Body) {
  const apiKey = requireEnv("PIXVERSE_API_KEY");
  const traceId = crypto.randomUUID();
  const response = await fetch(
    "https://app-api.pixverse.ai/openapi/v2/video/text/generate",
    {
      method: "POST",
      headers: {
        "API-KEY": apiKey,
        "Ai-trace-id": traceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: body.prompt,
        model: body.model || "v6",
        duration: body.duration || 5,
        aspect_ratio: body.aspectRatio || "9:16",
        quality: body.resolution || "720p",
        ...(body.seed !== undefined ? { seed: body.seed } : {}),
      }),
    },
  );

  const data = await response.json();
  if (!response.ok || data.ErrCode !== 0) {
    throw new Error(data.ErrMsg || `PixVerse request failed (${response.status})`);
  }

  return {
    provider: "pixverse",
    status: "processing",
    videoId: data.Resp?.video_id,
    model: body.model || "v6",
  };
}

async function fetchImageAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to fetch image (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const body = (await req.json()) as Body;
    const provider = body.provider || "veo";
    const prompt = String(body.prompt || "").trim();

    if (!prompt) return json({ error: "prompt is required" }, 400);
    if (!["veo", "pixverse"].includes(provider)) {
      return json({ error: "Unsupported provider" }, 400);
    }

    const result =
      provider === "veo"
        ? await generateVeo({ ...body, prompt })
        : await generatePixVerse({ ...body, prompt });

    return json({ success: true, ...result }, 202);
  } catch (error) {
    console.error("Video generation error:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Video generation failed",
      },
      500,
    );
  }
};

export const config: Config = { path: "/api/video/generate", method: "POST" };
