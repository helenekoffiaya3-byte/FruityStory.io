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

/** Provider adapters. Credentials are read only from server environment variables. */
export async function generateWithProvider(
  provider: string,
  request: VideoGenerationRequest,
): Promise<VideoGenerationResult> {
  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
      throw new Error(
        "OpenAI video adapter is not enabled in this deployment; connect the approved video API here.",
      );
    case "veo":
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      throw new Error(
        "Veo generation is handled by the video-engine endpoint; this adapter is reserved for provider abstraction.",
      );
    case "pixverse":
      if (!process.env.PIXVERSE_API_KEY) {
        throw new Error("PIXVERSE_API_KEY is not configured");
      }
      throw new Error(
        "PixVerse generation is handled by the video-engine endpoint; this adapter is reserved for provider abstraction.",
      );
    default:
      throw new Error(`Unsupported video provider: ${provider}`);
  }
}

export function chooseProvider(preferred?: string) {
  if (preferred && preferred !== "auto") return preferred;
  if (process.env.GEMINI_API_KEY) return "veo";
  if (process.env.PIXVERSE_API_KEY) return "pixverse";
  return "openai";
}
