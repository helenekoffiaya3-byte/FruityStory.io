import type { Handler } from '@netlify/functions';

const MAX_DURATION_MINUTES = 60;
const MAX_CLIP_SECONDS = 12;
const OPENAI_VIDEO_URL = 'https://api.openai.com/v1/videos';

type VideoClip = {
  sceneNumber?: number;
  durationSeconds?: number;
  prompt?: string;
  action?: string;
  location?: string;
  time?: string;
  style?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '720p' | '1080p' | '4k';
  characters?: Array<{
    name?: string;
    appearancePrompt?: string;
    consistencyPrompt?: string;
    dialogue?: string;
    emotion?: string;
    emotionIntensity?: number;
    voiceTone?: string;
    facialExpression?: string;
    gesture?: string;
  }>;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function toSize(aspectRatio: string, resolution: string): string {
  if (aspectRatio === '9:16') return resolution === '1080p' ? '1080x1920' : '720x1280';
  if (aspectRatio === '1:1') return '720x720';
  return resolution === '1080p' ? '1920x1080' : '1280x720';
}

function buildPrompt(clip: VideoClip): string {
  const characters = (clip.characters ?? []).map((c) => {
    const parts = [
      c.name && `Character: ${c.name}`,
      c.appearancePrompt,
      c.consistencyPrompt && `Keep this character visually consistent: ${c.consistencyPrompt}`,
      c.dialogue && `Dialogue: ${c.dialogue}`,
      c.emotion && `Emotion: ${c.emotion} (${Math.round((c.emotionIntensity ?? 0.7) * 100)}% intensity)`,
      c.voiceTone && `Voice tone: ${c.voiceTone}`,
      c.facialExpression && `Facial expression: ${c.facialExpression}`,
      c.gesture && `Gesture: ${c.gesture}`,
    ].filter(Boolean);
    return parts.join('. ');
  }).join('\n');

  return [
    clip.prompt,
    clip.action && `Action: ${clip.action}`,
    clip.location && `Location: ${clip.location}`,
    clip.time && `Time: ${clip.time}`,
    clip.style && `Visual style: ${clip.style}`,
    characters && `Characters:\n${characters}`,
    'Cinematic continuity. Preserve character identity and visual details throughout the shot.',
  ].filter(Boolean).join('\n\n');
}

function splitDuration(totalSeconds: number): number[] {
  const result: number[] = [];
  let remaining = Math.max(1, Math.round(totalSeconds));
  while (remaining > 0) {
    // Sora accepts 4, 8, or 12 seconds. Use 12-second clips and a final 4/8/12-second clip.
    if (remaining >= 12) {
      result.push(12);
      remaining -= 12;
    } else if (remaining >= 8) {
      result.push(8);
      remaining -= 8;
    } else if (remaining >= 4) {
      result.push(4);
      remaining -= 4;
    } else {
      // A sub-4-second remainder is folded into the preceding clip by rounding the target.
      if (result.length) result[result.length - 1] += remaining;
      remaining = 0;
    }
  }
  return result;
}

async function createSoraJob(apiKey: string, prompt: string, seconds: number, size: string, model: 'sora-2' | 'sora-2-pro') {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt.slice(0, 32000));
  form.append('seconds', String(seconds));
  form.append('size', size);

  const response = await fetch(OPENAI_VIDEO_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI Videos API error (${response.status}).`);
  }
  return data;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: 'OPENAI_API_KEY est manquante dans les variables d’environnement Netlify.' });
  }

  let input: any;
  try { input = JSON.parse(event.body ?? '{}'); }
  catch { return json(400, { error: 'JSON invalide.' }); }

  const video = input?.video;
  if (!video || !Array.isArray(video.clips) || video.clips.length === 0) {
    return json(400, { error: 'Payload Vidéos IA incomplet. Fournissez video.clips.' });
  }

  const durationMinutes = Number(video.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
    return json(400, { error: `La durée doit être comprise entre 1 et ${MAX_DURATION_MINUTES} minutes.` });
  }

  const model: 'sora-2' | 'sora-2-pro' = input?.model === 'sora-2-pro' ? 'sora-2-pro' : 'sora-2';
  const jobs: any[] = [];

  try {
    for (let sceneIndex = 0; sceneIndex < video.clips.length; sceneIndex += 1) {
      const clip = video.clips[sceneIndex] as VideoClip;
      const sceneNumber = clip.sceneNumber ?? sceneIndex + 1;
      const prompt = buildPrompt(clip);
      const secondsList = splitDuration(Number(clip.durationSeconds) || 4);
      const size = toSize(clip.aspectRatio ?? video.aspectRatio ?? '16:9', clip.resolution ?? video.resolution ?? '720p');

      for (let chunkIndex = 0; chunkIndex < secondsList.length; chunkIndex += 1) {
        const seconds = secondsList[chunkIndex];
        const providerJob = await createSoraJob(apiKey, prompt, seconds, size, model);
        jobs.push({
          sceneNumber,
          chunkNumber: chunkIndex + 1,
          seconds,
          provider: 'openai',
          model,
          videoId: providerJob.id,
          status: providerJob.status,
          progress: providerJob.progress ?? 0,
          size: providerJob.size ?? size,
        });
      }
    }
  } catch (error) {
    return json(502, {
      error: 'La génération Sora a échoué.',
      message: error instanceof Error ? error.message : 'Erreur inconnue.',
      jobs,
    });
  }

  return json(202, {
    ok: true,
    status: 'queued',
    provider: 'openai',
    model,
    project: {
      title: video.title ?? 'FruityStory AI Video',
      language: video.language ?? 'fr',
      durationMinutes,
      maxDurationMinutes: MAX_DURATION_MINUTES,
      jobs,
      assembly: video.assembly ?? {
        enabled: true,
        includeDialogueAudio: true,
        includeMusic: true,
        includeSoundEffects: true,
        preserveCharacterConsistency: true,
      },
    },
    note: 'Sora génère des clips de 4, 8 ou 12 secondes. Les projets longs sont donc découpés en clips puis assemblés par FruityStory.',
  });
};

export { handler };
