import type { Config, Context } from "@netlify/functions";

function route() {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY is not configured");
  const baseUrl = (process.env.SEEDANCE_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3").replace(/\/$/, "");
  return { key, baseUrl };
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "GET") return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return Response.json({ error: "taskId is required" }, { status: 400 });

  try {
    const { key, baseUrl } = route();
    const response = await fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return Response.json({ success: false, error: data?.error?.message || data?.message || `Seedance status failed (${response.status})` }, { status: response.status });

    const status = String(data?.status || "").toLowerCase();
    const videoUrl = data?.content?.video_url || data?.content?.videoUrl || data?.video_url || data?.output?.video_url;
    return Response.json({ success: true, provider: "seedance", taskId, status, videoUrl, task: data });
  } catch (error) {
    console.error("Seedance status error:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Seedance status failed" }, { status: 500 });
  }
}

export const config: Config = { path: "/api/video/seedance-status", method: "GET" };
