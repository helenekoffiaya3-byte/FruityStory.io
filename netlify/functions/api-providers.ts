export interface VideoGenerationRequest { prompt: string; duration?: number; aspectRatio?: string; imageUrl?: string; }
export interface VideoGenerationResult { externalId: string; status: 'queued'|'processing'|'completed'; outputUrl?: string; }

/** Provider adapters. Credentials are read only from server environment variables. */
export async function generateWithProvider(provider: string, request: VideoGenerationRequest): Promise<VideoGenerationResult> {
  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
      throw new Error('OpenAI video adapter is not enabled in this deployment; connect the approved video API here.');
    case 'veo':
      if (!process.env.VEO_API_KEY && !process.env.GOOGLE_AI_API_KEY) throw new Error('VEO_API_KEY/GOOGLE_AI_API_KEY is not configured');
      throw new Error('Veo adapter requires the selected Google video API endpoint and account configuration.');
    case 'seedance':
      if (!process.env.SEEDANCE_API_KEY) throw new Error('SEEDANCE_API_KEY is not configured');
      throw new Error('Seedance adapter requires its provider endpoint/account configuration.');
    case 'pixverse':
      if (!process.env.PIXVERSE_API_KEY) throw new Error('PIXVERSE_API_KEY is not configured');
      throw new Error('PixVerse adapter requires its provider endpoint/account configuration.');
    default:
      throw new Error(`Unsupported video provider: ${provider}`);
  }
}

export function chooseProvider(preferred?: string) {
  if (preferred && preferred !== 'auto') return preferred;
  if (process.env.VEO_API_KEY || process.env.GOOGLE_AI_API_KEY) return 'veo';
  if (process.env.PIXVERSE_API_KEY) return 'pixverse';
  if (process.env.SEEDANCE_API_KEY) return 'seedance';
  return 'openai';
}
