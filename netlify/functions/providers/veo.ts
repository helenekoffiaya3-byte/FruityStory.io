import { GoogleGenAI } from "@google/genai";

export const VEO_MODEL =
  process.env.GEMINI_VIDEO_MODEL?.trim() || "veo-3.1-generate-preview";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante côté serveur.");
  return new GoogleGenAI({ apiKey });
}

export async function createVeoVideo(params: {
  prompt: string;
  aspectRatio?: "16:9" | "9:16";
  resolution?: "720p" | "1080p" | "4k";
}) {
  const ai = getClient();
  const operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt: params.prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: params.aspectRatio ?? "16:9",
      resolution: params.resolution ?? "720p",
    },
  });

  if (!operation?.name) {
    throw new Error("Veo n'a pas retourné d'identifiant d'opération.");
  }

  return {
    operationName: operation.name,
    status: operation.done ? "completed" : "processing",
    model: VEO_MODEL,
    provider: "google_veo",
  } as const;
}

export async function getVeoVideoStatus(operationName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante côté serveur.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
    { headers: { "x-goog-api-key": apiKey } },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Veo status ${response.status}: ${message}`);
  }

  return response.json();
}
