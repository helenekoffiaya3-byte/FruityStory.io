import { GoogleGenAI } from "@google/genai";

export interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  imageUrl?: string;
}

export interface VideoGenerationResult {
  externalId: string;
  status: "queued" | "processing" | "completed";
  outputUrl?: string;
}

/**
 * Starts a real Google Veo video generation job.
 * The API key is read only from the server environment.
 */
export async function generateWithProvider(
  provider: string,
  request: VideoGenerationRequest,
): Promise<VideoGenerationResult> {
  switch (provider) {
    case "veo": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

      const ai = new GoogleGenAI({ apiKey });
      const operation = await ai.models.generateVideos({
        model: process.env.VEO_MODEL || "veo-3.1-fast-generate-preview",
        prompt: request.prompt,
        ...(request.imageUrl ? { image: { imageBytes: await fetchImageAsBase64(request.imageUrl), mimeType: "image/jpeg" } } : {}),
      });

      return {
        externalId: operation.name || "",
        status: "processing",
      };
    }
    case "openai":
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
      throw new Error("OpenAI video provider is not enabled in this deployment yet");
    case "pixverse":
      if (!process.env.PIXVERSE_API_KEY) throw new Error("PIXVERSE_API_KEY is not configured");
      throw new Error("PixVerse provider is not enabled in this deployment yet");
    case "seedance":
      if (!process.env.SEEDANCE_API_KEY) throw new Error("SEEDANCE_API_KEY is not configured");
      throw new Error("Seedance provider is not enabled in this deployment yet");
    default:
      throw new Error(`Unsupported video provider: ${provider}`);
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download image: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

export function chooseProvider(preferred?: string) {
  if (preferred && preferred !== "auto") return preferred;
  if (process.env.GEMINI_API_KEY) return "veo";
  if (process.env.PIXVERSE_API_KEY) return "pixverse";
  if (process.env.SEEDANCE_API_KEY) return "seedance";
  return "openai";
}
