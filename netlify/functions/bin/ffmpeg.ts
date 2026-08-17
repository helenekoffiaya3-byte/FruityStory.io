import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Resolves ffmpeg from the Netlify runtime.
 * NETLIFY_FFMPEG_PATH can be set to a custom executable path.
 */
export async function resolveFfmpeg(): Promise<string> {
  const configured = process.env.NETLIFY_FFMPEG_PATH?.trim();
  if (configured) return configured;

  const candidates = ["ffmpeg", "/opt/bin/ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["-version"]);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error("ffmpeg introuvable dans le runtime Netlify. Installez-le dans le build ou configurez NETLIFY_FFMPEG_PATH.");
}
