import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function mapSize(aspectRatio: string, resolution: string) {
  if (aspectRatio === '9:16') return resolution === '1080p' ? '1024x1792' : '720x1280';
  if (aspectRatio === '16:9') return resolution === '1080p' ? '1792x1024' : '1280x720';
  return '1280x720';
}

export async function createOpenAIVideo(input: {
  prompt: string;
  model?: 'sora-2' | 'sora-2-pro';
  duration: 4 | 8 | 12;
  aspectRatio?: string;
  resolution?: string;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.');
  return client.videos.create({
    model: input.model ?? 'sora-2',
    prompt: input.prompt,
    seconds: String(input.duration) as '4' | '8' | '12',
    size: mapSize(input.aspectRatio ?? '16:9', input.resolution ?? '720p') as '720x1280' | '1280x720' | '1024x1792' | '1792x1024',
  });
}

export async function retrieveOpenAIVideo(videoId: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.');
  return client.videos.retrieve(videoId);
}

export async function downloadOpenAIVideo(videoId: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.');
  return client.videos.downloadContent(videoId);
}
