import OpenAI from "openai";
import type { Handler } from "@netlify/functions";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
Tu es le directeur IA de FruityStory.io.

Crée des dramas de fruits joués comme dans la vraie vie.

RÈGLES ABSOLUES :
- Aucun narrateur.
- Aucune voix off.
- L'histoire est racontée uniquement par les personnages, leurs dialogues, leurs expressions et leurs actions.
- Les personnages sont des fruits anthropomorphes.
- La tête et l'identité visuelle sont basées sur le fruit de référence.
- Le corps humain est personnalisable.
- Les vêtements sont personnalisables.
- La personnalité est personnalisable.
- Le nom est librement inspiré du fruit.
- Un personnage conserve exactement la même apparence, identité, vêtements et caractéristiques dans toutes les scènes, sauf si le scénario demande explicitement un changement.
- Chaque dialogue doit appartenir à un personnage présent dans la scène.
- Ne crée jamais de narrateur.
- Ne crée jamais de voix off.
- Les scènes doivent être directement exploitables par un système de génération vidéo.
- Décris les lieux, actions, émotions et dialogues avec précision.

Retourne uniquement un objet JSON conforme au schéma fourni.
`.trim();

const storySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          fruit: { type: "string" },
          appearance: { type: "string" },
          body: { type: "string" },
          clothing: { type: "string" },
          personality: { type: "string" },
        },
        required: [
          "id",
          "name",
          "fruit",
          "appearance",
          "body",
          "clothing",
          "personality",
        ],
      },
    },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          location: { type: "string" },
          time: { type: "string" },
          description: { type: "string" },
          characters: {
            type: "array",
            items: { type: "string" },
          },
          actions: {
            type: "array",
            items: { type: "string" },
          },
          dialogues: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                characterId: { type: "string" },
                text: { type: "string" },
                emotion: { type: "string" },
              },
              required: ["characterId", "text", "emotion"],
            },
          },
          continuity: { type: "string" },
        },
        required: [
          "id",
          "location",
          "time",
          "description",
          "characters",
          "actions",
          "dialogues",
          "continuity",
        ],
      },
    },
  },
  required: ["title", "characters", "scenes"],
} as const;

const json = (
  statusCode: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);

  if (event.httpMethod !== "POST") {
    return json(405, {
      success: false,
      error: "Méthode non autorisée. Utilisez POST.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, {
      success: false,
      error: "OPENAI_API_KEY non configurée sur le serveur.",
    });
  }

  let body: { prompt?: unknown } | null;

  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    return json(400, {
      success: false,
      error: "Le corps de la requête contient un JSON invalide.",
    });
  }

  const prompt = typeof body?.prompt === "string"
    ? body.prompt.trim()
    : "";

  if (!prompt) {
    return json(400, {
      success: false,
      error: "Le champ 'prompt' est obligatoire.",
    });
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      instructions: SYSTEM_PROMPT,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "fruity_story",
          strict: true,
          schema: storySchema,
        },
      },
    });

    if (!response.output_text) {
      return json(502, {
        success: false,
        error: "OpenAI n'a retourné aucune histoire.",
      });
    }

    let story: unknown;

    try {
      story = JSON.parse(response.output_text);
    } catch {
      console.error("Réponse OpenAI non JSON :", response.output_text);
      return json(502, {
        success: false,
        error: "La réponse d'OpenAI n'est pas un JSON valide.",
      });
    }

    return json(200, {
      success: true,
      story,
    });
  } catch (error) {
    console.error("Erreur OpenAI :", error);
    return json(500, {
      success: false,
      error: "Impossible de générer le drama.",
    });
  }
};
