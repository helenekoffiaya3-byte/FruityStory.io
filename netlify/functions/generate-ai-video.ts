import type { Handler } from '@netlify/functions';

const MAX_DURATION_MINUTES = 60;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });

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

  const jobs = video.clips.map((clip: any, index: number) => ({
    clipId: `scene-${clip.sceneNumber ?? index + 1}`,
    sceneNumber: clip.sceneNumber ?? index + 1,
    durationSeconds: Math.max(1, Number(clip.durationSeconds) || 1),
    prompt: clip.prompt,
    action: clip.action ?? '',
    location: clip.location ?? '',
    time: clip.time ?? '',
    style: clip.style ?? video.style ?? 'cinematic',
    aspectRatio: clip.aspectRatio ?? video.aspectRatio ?? '16:9',
    resolution: clip.resolution ?? video.resolution ?? '1080p',
    characters: Array.isArray(clip.characters) ? clip.characters.map((c: any) => ({
      name: c.name,
      appearancePrompt: c.appearancePrompt ?? '',
      consistencyPrompt: c.consistencyPrompt ?? '',
      dialogue: c.dialogue ?? '',
      emotion: c.emotion ?? 'neutral',
      emotionIntensity: c.emotionIntensity ?? 0.7,
      voiceTone: c.voiceTone ?? '',
      facialExpression: c.facialExpression ?? '',
      gesture: c.gesture ?? '',
    })) : [],
  }));

  // This endpoint creates a provider-neutral generation queue. A concrete
  // video provider can consume each job without exposing provider secrets.
  return json(200, {
    ok: true,
    status: 'ready',
    provider: 'video-provider-adapter',
    project: {
      title: video.title ?? 'FruityStory AI Video',
      language: video.language ?? 'fr',
      durationMinutes,
      maxDurationMinutes: MAX_DURATION_MINUTES,
      style: video.style ?? 'cinematic',
      aspectRatio: video.aspectRatio ?? '16:9',
      resolution: video.resolution ?? '1080p',
      jobs,
      assembly: video.assembly ?? {
        enabled: true,
        includeDialogueAudio: true,
        includeMusic: true,
        includeSoundEffects: true,
        preserveCharacterConsistency: true,
      },
    },
    nextStep: 'Send each project.jobs item to the configured video provider adapter, then assemble in scene order.',
  });
};

export { handler };
