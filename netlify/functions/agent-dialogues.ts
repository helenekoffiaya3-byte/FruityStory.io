import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(1).max(12000),
  durationMinutes: z.number().min(1).max(60).optional().default(10),
  language: z.string().min(2).max(20).optional().default("fr"),
  genre: z.string().min(1).max(80).optional().default("drama"),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        personality: z.string().max(500).optional(),
        role: z.string().max(200).optional(),
      }),
    )
    .max(30)
    .optional()
    .default([]),
});

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée. Utilisez POST." });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured in Netlify environment variables.");
    return json(503, { error: "Agent IA non configuré côté serveur." });
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "Corps JSON invalide." });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: "Paramètres invalides.",
      details: parsed.error.flatten(),
    });
  }

  const input = parsed.data;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const characterBlock = input.characters.length
    ? input.characters
        .map(
          (character) =>
            `- ${character.name}: rôle=${character.role ?? "non défini"}; personnalité=${character.personality ?? "à définir"}`,
        )
        .join("\n")
    : "Aucun personnage imposé : crée les personnages nécessaires.";

  const systemPrompt = `Tu es l'Agent IA de dialogues de FruityStory.io.\n\nTa mission est de transformer une idée en scénario exploitable par un générateur de vidéos IA. Tu dois créer des dialogues naturels, distincts pour chaque personnage et cohérents avec leur personnalité.\n\nContraintes :\n- langue principale : ${input.language}\n- genre : ${input.genre}\n- durée cible : ${input.durationMinutes} minute(s)\n- personnages :\n${characterBlock}\n\nRetourne UNIQUEMENT un objet JSON valide avec cette structure :\n{\n  "title": "...",\n  "logline": "...",\n  "characters": [{"name":"...","role":"...","personality":"..."}],\n  "scenes": [{\n    "sceneNumber": 1,\n    "location": "...",\n    "time": "...",\n    "visualPrompt": "...",\n    "action": "...",\n    "dialogues": [{"character":"...","text":"...","emotion":"..."}]\n  }],\n  "estimatedDurationMinutes": 0\n}\n\nLes visualPrompt doivent être directement utilisables comme descriptions de scènes pour une génération vidéo IA. Les dialogues doivent faire progresser l'histoire. Répartis les scènes pour approcher la durée demandée.`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.prompt },
      ],
      text: { format: { type: "json_object" } },
    });

    const output = response.output_text?.trim();
    if (!output) {
      return json(502, { error: "L'Agent IA n'a retourné aucun scénario." });
    }

    let scenario: unknown;
    try {
      scenario = JSON.parse(output);
    } catch {
      console.error("Agent returned non-JSON output", output);
      return json(502, { error: "Réponse de l'Agent IA invalide." });
    }

    return json(200, {
      ok: true,
      agent: "dialogues",
      scenario,
    });
  } catch (error) {
    console.error("agent-dialogues error", error);
    return json(500, { error: "Erreur lors de la génération du scénario et des dialogues." });
  }
};

export { handler };
