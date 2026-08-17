import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Resolve the bundled ffmpeg binary, with an optional Netlify override. */
export async function resolveFfmpeg(): Promise<string> {
  const configured = process.env.NETLIFY_FFMPEG_PATH?.trim();
  const candidate = configured || ffmpegPath;

  if (!candidate) {
    throw new Error("ffmpeg-static n'a pas fourni de binaire. Configurez NETLIFY_FFMPEG_PATH.");
  }

  try {
    await execFileAsync(candidate, ["-version"]);
    return candidate;
  } catch (error) {
    throw new Error(
      `ffmpeg est introuvable ou non exécutable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
