const BASE_URL = "https://app-api.pixverse.ai/openapi/v2";
const DEFAULT_MODEL = "v6";

export type PixVerseModel = "v6" | "c1";
export type PixVerseAspectRatio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "2:3" | "3:2" | "21:9";
export type PixVerseQuality = "360p" | "540p" | "720p" | "1080p";

function getApiKey() {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) throw new Error("PIXVERSE_API_KEY manquante côté serveur.");
  return key;
}

function traceId() {
  return crypto.randomUUID();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { ErrMsg: text }; }

  if (!response.ok || data?.ErrCode !== 0) {
    throw new Error(`PixVerse ${response.status}: ${data?.ErrMsg || "API error"}`);
  }
  return data as T;
}

export async function createPixVerseVideo(params: {
  prompt: string;
  model?: PixVerseModel;
  duration?: number;
  quality?: PixVerseQuality;
  aspectRatio?: PixVerseAspectRatio;
  generateAudio?: boolean;
  generateMultiClip?: boolean;
}) {
  const model = params.model || (process.env.PIXVERSE_VIDEO_MODEL as PixVerseModel) || DEFAULT_MODEL;
  if (model !== "v6" && model !== "c1") throw new Error("Modèle PixVerse invalide. Utilisez v6 ou c1.");

  const duration = Math.max(1, Math.min(15, Math.floor(params.duration ?? 5)));
  const quality = params.quality ?? "720p";
  const aspectRatio = params.aspectRatio ?? "9:16";

  const data = await request<any>("/video/text/generate", {
    method: "POST",
    headers: {
      "API-KEY": getApiKey(),
      "Ai-trace-id": traceId(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: params.prompt,
      duration,
      quality,
      aspect_ratio: aspectRatio,
      ...(params.generateAudio === undefined ? {} : { generate_audio_switch: params.generateAudio }),
      ...(model === "v6" && params.generateMultiClip !== undefined ? { generate_multi_clip_switch: params.generateMultiClip } : {}),
    }),
  });

  const videoId = data?.Resp?.video_id;
  if (videoId === undefined || videoId === null) throw new Error("PixVerse n'a pas retourné de video_id.");

  return {
    provider: "pixverse",
    model,
    videoId: String(videoId),
    status: "processing" as const,
  };
}

export async function getPixVerseVideoStatus(videoId: string) {
  const data = await request<any>(`/video/result/${encodeURIComponent(videoId)}`, {
    method: "GET",
    headers: {
      "API-KEY": getApiKey(),
      "Ai-trace-id": traceId(),
    },
  });

  const result = data?.Resp;
  const statusCode = Number(result?.status);

  return {
    provider: "pixverse",
    videoId,
    statusCode,
    status: statusCode === 1 ? "completed" : statusCode === 7 || statusCode === 8 ? "failed" : "processing",
    url: statusCode === 1 ? result?.url ?? null : null,
    result,
  } as const;
}
