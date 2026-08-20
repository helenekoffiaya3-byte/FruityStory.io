import type { Handler, HandlerEvent } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";

const schema = z.object({
  prompt: z.string().min(1).max(12000),
  count: z.number().int().min(1).max(20).optional().default(3),
  language: z.string().min(2).max(20).optional().default("fr"),
  genre: z.string().max(80).optional().default("drama"),
  fruitTheme: z.string().max(100).optional().default("fruits anthropomorphes"),
});

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Utilisez POST." });
  if (!process.env.OPENAI_API_KEY) return json(503, { error: "OPENAI_API_KEY non configurée côté serveur." });

  let body: unknown;
  try { body = JSON.parse(event.body ?? "{}"); } catch { return json(400, { error: "JSON invalide." }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json(400, { error: "Paramètres invalides.", details: parsed.error.flatten() });

  const input = parsed.data;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = `Tu es le Character Designer IA de FruityStory.io. Crée ${input.count} personnages originaux pour une histoire ${input.genre} en ${input.language}. Thème: ${input.fruitTheme}. Les personnages sont des fruits anthropomorphes: leur tête et identité visuelle viennent du fruit, mais corps, vêtements, âge apparent, personnalité, rôle et genre sont personnalisables. Donne à chaque personnage une identité visuelle stable utilisable dans toutes les scènes et compatible avec la génération vidéo IA. Retourne uniquement un JSON valide sous la forme {"characters":[{"name":"","fruit":"","role":"","ageAppearance":"","gender":"","personality":"","appearance":"","clothing":"","voice":"","speechStyle":"","goals":"","relationships":[],"characterPrompt":"","consistencyPrompt":""}]}. characterPrompt doit être directement utilisable pour générer le personnage et consistencyPrompt doit aider à conserver exactement son apparence entre les scènes.`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      input: [{ role: "system", content: system }, { role: "user", content: input.prompt }],
      text: { format: { type: "json_object" } },
    });
    const output = response.output_text?.trim();
    if (!output) return json(502, { error: "Aucun personnage généré." });
    return json(200, { ok: true, characters: JSON.parse(output).characters ?? [] });
  } catch (error) {
    console.error("characters error", error);
    return json(500, { error: "Erreur lors de la création des personnages IA." });
  }
};
