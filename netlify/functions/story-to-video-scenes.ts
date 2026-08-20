import type { Handler, HandlerEvent } from '@netlify/functions';

const MAX_MINUTES = 60;
const MAX_SCENES = 500;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitParagraphs(story: string) {
  return story
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function makeScenes(story: string, durationMinutes: number) {
  const paragraphs = splitParagraphs(story);
  const requestedSeconds = clamp(durationMinutes * 60, 60, MAX_MINUTES * 60);
  const targetSeconds = Math.max(requestedSeconds, paragraphs.length * 10);
  const sceneCount = Math.min(MAX_SCENES, Math.max(1, Math.ceil(targetSeconds / 45), paragraphs.length));
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / sceneCount));
  const groups: string[][] = [];

  for (let i = 0; i < paragraphs.length; i += chunkSize) groups.push(paragraphs.slice(i, i + chunkSize));
  if (!groups.length) groups.push([story.trim()]);

  const duration = targetSeconds / groups.length;
  return groups.map((parts, index) => ({
    sceneNumber: index + 1,
    title: `Scène ${index + 1}`,
    summary: parts.join(' '),
    location: '',
    time: '',
    action: parts.join(' '),
    visualPrompt: parts.join(' '),
    durationSeconds: Math.round(duration),
    dialogues: [],
    characterConsistencyPrompt: '',
  }));
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée. Utilisez POST.' });

  let body: any;
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return json(400, { error: 'Corps JSON invalide.' }); }

  if (typeof body.story !== 'string' || !body.story.trim()) {
    return json(400, { error: 'Le champ story est obligatoire.' });
  }

  const durationMinutes = Number(body.durationMinutes ?? 15);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_MINUTES) {
    return json(400, { error: `durationMinutes doit être compris entre 1 et ${MAX_MINUTES}.` });
  }

  const scenes = makeScenes(body.story, durationMinutes);
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

  return json(200, {
    ok: true,
    readyForVideoGeneration: true,
    story: {
      title: String(body.title ?? 'FruityStory'),
      language: String(body.language ?? 'fr'),
      durationMinutes,
      maxProjectDurationMinutes: MAX_MINUTES,
    },
    scenes,
    videoGenerationPayload: {
      title: String(body.title ?? 'FruityStory'),
      language: String(body.language ?? 'fr'),
      durationMinutes: totalSeconds / 60,
      aspectRatio: body.aspectRatio ?? '16:9',
      resolution: body.resolution ?? '1080p',
      style: body.style ?? 'cinematic',
      clips: scenes.map((scene) => ({
        sceneNumber: scene.sceneNumber,
        durationSeconds: scene.durationSeconds,
        prompt: scene.visualPrompt,
        action: scene.action,
        characters: scene.dialogues,
      })),
      assembly: {
        enabled: true,
        order: scenes.map((scene) => scene.sceneNumber),
        includeDialogueAudio: true,
        includeMusic: true,
        includeSoundEffects: true,
        preserveCharacterConsistency: true,
      },
    },
  });
};

export { handler };
