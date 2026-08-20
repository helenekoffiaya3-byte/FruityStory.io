import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(1).max(12000),
  durationMinutes: z.number().min(1).max(60).optional().default(10),
  language: z.string().min(2).max(20).optional().default("fr"),
  genre: z.string().min(1).max(80).optional().default("drama"),
  visualStyle: z.string().max(200).optional().default("cinematic"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
  characters: z.array(z.object({
    name: z.string().min(1).max(80),
    personality: z.string().max(500).optional(),
    role: z.string().max(200).optional(),
    appearancePrompt: z.string().max(2000).optional(),
    consistencyPrompt: z.string().max(3000).optional(),
  })).max(30).optional().default([]),
});

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Méthode non autorisée. Utilisez POST." });
  if (!process.env.OPENAI_API_KEY) return json(503, { error: "Agent IA non configuré côté serveur." });

  let body: unknown;
  try { body = JSON.parse(event.body ?? "{}"); } catch { return json(400, { error: "Corps JSON invalide." }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: "Paramètres invalides.", details: parsed.error.flatten() });

  const input = parsed.data;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const characterBlock = input.characters.length
    ? input.characters.map(c => `- ${c.name}: rôle=${c.role ?? "non défini"}; personnalité=${c.personality ?? "à définir"}; apparence=${c.appearancePrompt ?? "à définir"}; cohérence=${c.consistencyPrompt ?? "à définir"}`).join("\n")
    : "Aucun personnage imposé : crée les personnages nécessaires.";

  const systemPrompt = `Tu es l'Agent IA de dialogues et de préproduction vidéo de FruityStory.io.
Transforme une idée en scénario directement exploitable par un générateur de vidéos IA.

Contraintes :
- langue : ${input.language}
- genre : ${input.genre}
- durée cible : ${input.durationMinutes} minute(s), maximum 60
- style visuel global : ${input.visualStyle}
- format : ${input.aspectRatio}
- personnages :
${characterBlock}

DÉCOUPE L'HISTOIRE EN SCÈNES. Chaque scène doit avoir un objectif narratif clair et une durée estimée.
Pour CHAQUE scène, produis un visualPrompt cinématographique détaillé et autonome, directement utilisable par un générateur vidéo IA. Le visualPrompt doit décrire : sujet/personnages visibles, apparence cohérente, lieu, époque/heure, environnement, éclairage, ambiance, composition/cadrage, caméra, mouvement, profondeur, action et style visuel. N'invente pas de changement d'apparence non demandé. Réutilise les consistencyPrompt des personnages.

Retourne UNIQUEMENT un objet JSON valide :
{
  "title":"...",
  "logline":"...",
  "characters":[{"name":"...","role":"...","personality":"...","appearancePrompt":"...","consistencyPrompt":"..."}],
  "scenes":[{
    "sceneNumber":1,
    "durationSeconds":30,
    "location":"...",
    "time":"...",
    "visualPrompt":"...",
    "camera":"...",
    "lighting":"...",
    "mood":"...",
    "action":"...",
    "characterConsistencyPrompt":"...",
    "dialogues":[{"character":"...","text":"...","emotion":{"name":"...","intensity":0.8,"voiceTone":"...","facialExpression":"...","gesture":"..."}]}
  }],
  "estimatedDurationMinutes":0
}

Les visualPrompt doivent être spécifiques, visuels et continus d'une scène à l'autre. Les dialogues doivent correspondre aux personnages et aux actions. Prépare les données pour une génération par clips puis assemblage en vidéo finale, jusqu'à 60 minutes.`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      input: [{ role: "system", content: systemPrompt }, { role: "user", content: input.prompt }],
      text: { format: { type: "json_object" } },
    });
    const output = response.output_text?.trim();
    if (!output) return json(502, { error: "L'Agent IA n'a retourné aucun scénario." });
    let scenario: unknown;
    try { scenario = JSON.parse(output); } catch { return json(502, { error: "Réponse de l'Agent IA invalide." }); }
    return json(200, { ok: true, agent: "dialogues-video-preproduction", scenario, readyForVideoGeneration: true });
  } catch (error) {
    console.error("agent-dialogues error", error);
    return json(500, { error: "Erreur lors de la génération du scénario, des scènes et des visual prompts." });
  }
};

export { handler };
