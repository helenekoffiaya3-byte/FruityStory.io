import type { Config, Context } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

type Provider = "veo" | "pixverse";

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

async function veoStatus(id: string) {
  const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  const operation = await ai.operations.getVideosOperation({
    operation: { name: id },
  });

  const video = operation.response?.generatedVideos?.[0]?.video;
  return {
    provider: "veo",
    status: operation.done ? "completed" : "processing",
    ...(video?.uri ? { videoUrl: video.uri } : {}),
    ...(operation.error ? { error: operation.error.message } : {}),
  };
}

async function pixverseStatus(id: string) {
  const response = await fetch(
    `https://app-api.pixverse.ai/openapi/v2/video/result/${encodeURIComponent(id)}`,
    {
      headers: {
        "API-KEY": requireEnv("PIXVERSE_API_KEY"),
        "Ai-trace-id": crypto.randomUUID(),
      },
    },
  );

  const data = await response.json();
  if (!response.ok || data.ErrCode !== 0) {
    throw new Error(data.ErrMsg || `PixVerse status failed (${response.status})`);
  }

  const result = data.Resp || {};
  const status =
    result.status === 1
      ? "completed"
      : result.status === 5
        ? "failed"
        : "processing";

  return {
    provider: "pixverse",
    status,
    ...(result.url ? { videoUrl: result.url } : {}),
    ...(status === "failed" ? { error: "PixVerse generation failed" } : {}),
  };
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method Not Allowed" }, 405);

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as Provider | null;
    const id = url.searchParams.get("id");

    if (!provider || !id) {
      return json({ error: "provider and id are required" }, 400);
    }

    const result =
      provider === "veo"
        ? await veoStatus(id)
        : provider === "pixverse"
          ? await pixverseStatus(id)
          : null;

    if (!result) return json({ error: "Unsupported provider" }, 400);
    return json({ success: true, ...result });
  } catch (error) {
    console.error("Video status error:", error);
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to read video status",
      },
      500,
    );
  }
};

export const config: Config = { path: "/api/video/status", method: "GET" };
