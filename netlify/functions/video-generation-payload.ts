import type { Handler, HandlerEvent } from '@netlify/functions';
import { z } from 'zod';

const emotionSchema = z.object({
  name: z.string().min(1).max(60),
  intensity: z.number().min(0).max(1).default(0.7),
  voiceTone: z.string().max(120).optional(),
  facialExpression: z.string().max(300).optional(),
  gesture: z.string().max(300).optional(),
});

const dialogueSchema = z.object({
  character: z.string().min(1).max(80),
  text: z.string().min(1).max(4000),
  emotion: emotionSchema,
});

const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  location: z.string().max(500),
  time: z.string().max(120).optional(),
  visualPrompt: z.string().min(1).max(6000),
  action: z.string().max(3000).optional(),
  durationSeconds: z.number().positive().max(3600),
  dialogues: z.array(dialogueSchema).max(100).default([]),
  characterConsistencyPrompt: z.string().max(3000).optional(),
});

const requestSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.string().min(2).max(20).default('fr'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
  durationMinutes: z.number().min(1).max(60),
  style: z.string().max(200).default('cinematic'),
  characters: z.array(z.object({
    name: z.string().min(1).max(80),
    role: z.string().max(200).optional(),
    personality: z.string().max(500).optional(),
    appearancePrompt: z.string().max(2000).optional(),
    consistencyPrompt: z.string().max(3000).optional(),
  })).max(30).default([]),
  scenes: z.array(sceneSchema).min(1).max(500),
});

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée. Utilisez POST.' });

  let body: unknown;
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return json(400, { error: 'Corps JSON invalide.' }); }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'Données de génération vidéo invalides.', details: parsed.error.flatten() });

  const input = parsed.data;
  const totalSceneSeconds = input.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  const characterMap = new Map(input.characters.map((character) => [character.name, character]));

  const clips = input.scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    durationSeconds: scene.durationSeconds,
    prompt: scene.visualPrompt,
    action: scene.action ?? '',
    location: scene.location,
    time: scene.time ?? '',
    style: input.style,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    characters: scene.dialogues.map((dialogue) => {
      const character = characterMap.get(dialogue.character);
      return {
        name: dialogue.character,
        appearancePrompt: character?.appearancePrompt ?? '',
        consistencyPrompt: scene.characterConsistencyPrompt ?? character?.consistencyPrompt ?? '',
        dialogue: dialogue.text,
        emotion: dialogue.emotion.name,
        emotionIntensity: dialogue.emotion.intensity,
        voiceTone: dialogue.emotion.voiceTone ?? '',
        facialExpression: dialogue.emotion.facialExpression ?? '',
        gesture: dialogue.emotion.gesture ?? '',
      };
    }),
  }));

  return json(200, {
    ok: true,
    readyForVideoGeneration: true,
    video: {
      title: input.title,
      language: input.language,
      durationMinutes: input.durationMinutes,
      durationSeconds: totalSceneSeconds,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      style: input.style,
      maxProjectDurationMinutes: 60,
      clips,
      assembly: {
        enabled: true,
        order: clips.map((clip) => clip.sceneNumber),
        includeDialogueAudio: true,
        includeMusic: true,
        includeSoundEffects: true,
        preserveCharacterConsistency: true,
      },
    },
  });
};

export { handler };
