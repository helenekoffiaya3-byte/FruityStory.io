import OpenAI from "openai";
import type { Config, Context } from "@netlify/functions";

const client = new OpenAI();

const SYSTEM = `You are the FruityStory.io story director. Create original fruit dramas performed like real life, with dialogue and actions only: never use a narrator or voice-over narration. Each character is an anthropomorphic fruit: the head/visual identity is based on its reference fruit, while the body, clothing, personality, gender and name are customizable. Names should be creatively inspired by the fruit but are not fixed (e.g. banana -> Banano, Bana, Bananito, Bananita). Preserve character identity and visual continuity across scenes. Return valid JSON with characters and scenes. Each scene must include setting, action, dialogue, camera, visual_style, duration_seconds and audio_direction.`;

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt }
      ]
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    return Response.json(JSON.parse(content));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
};

export const config: Config = { path: "/api/ai/story", method: "POST" };