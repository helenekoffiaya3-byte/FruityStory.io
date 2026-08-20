import type { Handler, HandlerEvent } from '@netlify/functions';
import OpenAI from 'openai';
import { z } from 'zod';

const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  location: z.string().max(500).optional(),
  time: z.string().max(200).optional(),
  action: z.string().max(3000).optional(),
  dialogues: z.array(z.object({
    character: z.string().max(100),
    text: z.string().max(3000),
    emotion: z.string().max(100).optional(),
  })).max(50).optional().default([]),
});

const requestSchema = z.object({
  title: z.string().max(300).optional(),
  genre: z.string().max(100).optional().default('drama'),
  style: z.string().max(500).optional().default('cinematic'),
  scenes: z.array(sceneSchema).min(1).max(500),
});

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée. Utilisez POST.' });
  if (!process.env.OPENAI_API_KEY) return json(503, { error: 'Agent Visual Prompt non configuré côté serveur.' });

  let raw: unknown;
  try { raw = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'Corps JSON invalide.' }); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: 'Paramètres invalides.', details: parsed.error.flatten() });

  const input = parsed.data;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const scenes = input.scenes.map((s) => JSON.stringify(s)).join('\n');

  const systemPrompt = `Tu es le Visual Prompt Director de FruityStory.io. Pour chaque scène fournie, produis un visual prompt détaillé, directement exploitable par un générateur de vidéo IA. Conserve exactement l'identité et l'apparence des personnages d'une scène à l'autre. Décris sujet/personnages, apparence, vêtements, expressions et émotions, actions, décor, époque, heure, météo, éclairage, ambiance, caméra, cadrage, mouvement de caméra, profondeur de champ, composition, style visuel et continuité. Ne génère pas de dialogue dans le visualPrompt : les dialogues sont fournis séparément. Évite les incohérences et les changements arbitraires de personnages. Retourne UNIQUEMENT un objet JSON valide : {"scenes":[{"sceneNumber":1,"visualPrompt":"...","negativePrompt":"...","camera":"...","lighting":"...","continuity":"..."}]}. Genre: ${input.genre}. Style global: ${input.style}. Titre: ${input.title ?? ''}.`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: scenes },
      ],
      text: { format: { type: 'json_object' } },
    });
    const output = response.output_text?.trim();
    if (!output) return json(502, { error: 'Aucun visual prompt retourné.' });
    try {
      return json(200, { ok: true, agent: 'visual-prompts', result: JSON.parse(output) });
    } catch {
      return json(502, { error: 'Réponse Visual Prompt invalide.' });
    }
  } catch (error) {
    console.error('visual-prompts error', error);
    return json(500, { error: 'Erreur lors de la génération des visual prompts.' });
  }
};
