import type { Config, Context } from "@netlify/functions";

type Provider = "sora" | "veo" | "pixverse" | "picsart";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await req.json();
  const provider = (body.provider ?? "sora") as Provider;
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

  // Provider adapters are intentionally isolated. API credentials must be stored
  // as Netlify environment variables and never sent from the browser.
  const supported: Provider[] = ["sora", "veo", "pixverse", "picsart"];
  if (!supported.includes(provider)) return Response.json({ error: "Unsupported provider" }, { status: 400 });

  return Response.json({
    status: "queued",
    provider,
    prompt,
    message: "Video provider adapter ready; connect the provider API credential server-side before production generation."
  }, { status: 202 });
};

export const config: Config = { path: "/api/video/generate", method: "POST" };