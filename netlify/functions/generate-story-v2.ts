import OpenAI from "openai";
import type { Handler } from "@netlify/functions";

const SYSTEM_PROMPT = `Tu es le directeur IA de FruityStory.io. Crée des dramas de fruits joués comme dans la vraie vie. Aucun narrateur ni voix off. L'histoire est racontée uniquement par les personnages, leurs dialogues, expressions et actions. Les personnages sont des fruits anthropomorphes et conservent leur identité, apparence, vêtements et caractéristiques entre les scènes sauf changement explicitement demandé. Chaque dialogue appartient à un personnage présent dans la scène. Les scènes doivent être directement exploitables par un système de génération vidéo. Retourne uniquement un objet JSON conforme au schéma fourni.`.trim();

const storySchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" },
    characters: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, name: { type: "string" }, fruit: { type: "string" }, appearance: { type: "string" }, body: { type: "string" }, clothing: { type: "string" }, personality: { type: "string" },
    }, required: ["id", "name", "fruit", "appearance", "body", "clothing", "personality"] } },
    scenes: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, location: { type: "string" }, time: { type: "string" }, description: { type: "string" },
      characters: { type: "array", items: { type: "string" } }, actions: { type: "array", items: { type: "string" } },
      dialogues: { type: "array", items: { type: "object", additionalProperties: false, properties: { characterId: { type: "string" }, text: { type: "string" }, emotion: { type: "string" } }, required: ["characterId", "text", "emotion"] } },
      continuity: { type: "string" },
    }, required: ["id", "location", "time", "description", "characters", "actions", "dialogues", "continuity"] } },
  }, required: ["title", "characters", "scenes"],
} as const;

const json = (statusCode: number, payload: unknown) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: JSON.stringify(payload) });

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, null);
  if (event.httpMethod !== "POST") return json(405, { error: "Méthode non autorisée. Utilisez POST." });
  if (!process.env.OPENAI_API_KEY) return json(500, { error: "OPENAI_API_KEY manquante côté serveur." });
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return json(400, { error: "prompt is required" });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini", store: false,
      input: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(body) }],
      text: { format: { type: "json_schema", name: "fruity_story", strict: true, schema: storySchema } },
    });
    return json(200, { success: true, story: JSON.parse(response.output_text || "{}") });
  } catch (error) {
    console.error("Story generation failed:", error);
    return json(500, { success: false, error: "Story generation failed" });
  }
};
