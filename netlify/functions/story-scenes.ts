import type { Handler, HandlerEvent } from '@netlify/functions';

type StoryRequest = {
  title?: string;
  story?: string;
  targetDurationMinutes?: number;
  language?: string;
  characters?: Array<{ name: string; role?: string; personality?: string; consistencyPrompt?: string }>;
};

type Scene = {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  startSeconds: number;
  endSeconds: number;
  purpose: string;
  location: string;
  visualPrompt: string;
  action: string;
  dialogues: Array<{ character: string; text: string; emotion: string; intensity: number }>;
  characterConsistencyPrompts: Record<string, string>;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function makeSceneDurations(totalSeconds: number): number[] {
  // Scenes are kept short enough for clip-based video generation, while the
  // final assembled project can be anywhere from 1 to 60 minutes.
  const preferred = 30;
  const count = Math.max(1, Math.ceil(totalSeconds / preferred));
  const base = Math.floor(totalSeconds / count);
  const remainder = totalSeconds % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

function buildScenes(input: StoryRequest): Scene[] {
  const targetMinutes = Math.min(60, Math.max(1, Number(input.targetDurationMinutes ?? 1)));
  const totalSeconds = Math.round(targetMinutes * 60);
  const durations = makeSceneDurations(totalSeconds);
  const story = (input.story ?? '').trim();
  const characters = input.characters ?? [];
  let cursor = 0;

  return durations.map((duration, index) => {
    const sceneNumber = index + 1;
    const startSeconds = cursor;
    const endSeconds = cursor + duration;
    cursor = endSeconds;
    const characterConsistencyPrompts = Object.fromEntries(
      characters.map((character) => [character.name, character.consistencyPrompt ?? `${character.name}: ${character.role ?? 'personnage'}, ${character.personality ?? 'personnalité cohérente'}. Conserver exactement son apparence et son identité d'une scène à l'autre.`])
    );

    return {
      sceneNumber,
      title: `Scène ${sceneNumber}`,
      durationSeconds: duration,
      startSeconds,
      endSeconds,
      purpose: sceneNumber === 1 ? 'Introduction et mise en place' : sceneNumber === durations.length ? 'Conclusion et résolution' : 'Progression de l’histoire',
      location: 'À déterminer par l’Agent IA selon l’histoire',
      visualPrompt: `Créer la scène ${sceneNumber} dans le style cinématographique demandé. Histoire source: ${story.slice(0, 2500)}`,
      action: 'L’Agent IA développe les actions, mouvements, cadrages et transitions à partir de l’histoire.',
      dialogues: [],
      characterConsistencyPrompts,
    };
  });
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });

  let input: StoryRequest;
  try {
    input = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'JSON invalide.' });
  }

  const target = Number(input.targetDurationMinutes);
  if (!Number.isFinite(target) || target < 1 || target > 60) {
    return json(400, { error: 'targetDurationMinutes doit être compris entre 1 et 60.' });
  }
  if (!input.story?.trim()) return json(400, { error: 'L’histoire est obligatoire.' });

  const scenes = buildScenes(input);
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

  return json(200, {
    ok: true,
    readyForVideoGeneration: true,
    targetDurationMinutes: target,
    actualDurationMinutes: totalSeconds / 60,
    sceneCount: scenes.length,
    maxDurationMinutes: 60,
    assembly: {
      enabled: true,
      preserveOrder: true,
      includeDialogueAudio: true,
      includeMusic: true,
      includeSoundEffects: true,
      preserveCharacterConsistency: true,
    },
    scenes,
  });
};
