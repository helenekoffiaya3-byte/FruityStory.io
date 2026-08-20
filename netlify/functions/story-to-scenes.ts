import type { Handler, HandlerEvent } from '@netlify/functions';

const MAX_MINUTES = 60;
const DEFAULT_SCENE_SECONDS = 30;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function splitStory(story: string, targetSeconds: number) {
  const paragraphs = story.split(/\n\s*\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return [];
  const desiredCount = Math.max(1, Math.ceil(targetSeconds / DEFAULT_SCENE_SECONDS));
  const count = Math.min(desiredCount, paragraphs.length);
  const perScene = Math.ceil(paragraphs.length / count);
  const scenes: string[] = [];
  for (let i = 0; i < paragraphs.length; i += perScene) scenes.push(paragraphs.slice(i, i + perScene).join('\n'));
  return scenes;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });
  let body: any;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'JSON invalide.' }); }

  const story = typeof body.story === 'string' ? body.story.trim() : '';
  const durationMinutes = Number(body.durationMinutes ?? 1);
  const language = typeof body.language === 'string' ? body.language : 'fr';
  const style = typeof body.style === 'string' ? body.style : 'cinematic';

  if (!story) return json(400, { error: 'L’histoire est obligatoire.' });
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_MINUTES) {
    return json(400, { error: 'La durée doit être comprise entre 1 et 60 minutes.' });
  }

  const targetSeconds = Math.round(durationMinutes * 60);
  const rawScenes = splitStory(story, targetSeconds);
  const sceneDuration = Math.max(10, Math.round(targetSeconds / Math.max(1, rawScenes.length)));

  const scenes = rawScenes.map((text, index) => ({
    sceneNumber: index + 1,
    title: `Scène ${index + 1}`,
    durationSeconds: sceneDuration,
    storySegment: text,
    location: '',
    time: '',
    action: '',
    visualPrompt: `${style}, cinematic scene, consistent characters and environment. ${text}`,
    dialogues: [],
    emotion: { name: 'neutre', intensity: 0.5 },
    characterConsistencyPrompt: '',
    language,
    readyForDialogueAgent: true,
    readyForVideoGeneration: true,
  }));

  return json(200, {
    ok: true,
    maxDurationMinutes: MAX_MINUTES,
    requestedDurationMinutes: durationMinutes,
    totalScenes: scenes.length,
    scenes,
    nextStep: 'Passer les scènes à l’Agent Dialogues puis à video-generation-payload.',
  });
};

export { handler };
