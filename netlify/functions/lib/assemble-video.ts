import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveFfmpeg } from "../bin/ffmpeg";

const execFileAsync = promisify(execFile);

/** Assemble des clips MP4 dans l'ordre fourni. ffmpeg doit être disponible au runtime. */
export async function assembleVideoClips(clipUrls: string[]): Promise<Buffer> {
  if (!clipUrls.length) throw new Error("Aucun clip à assembler.");

  const ffmpeg = await resolveFfmpeg();
  const dir = await mkdtemp(path.join(tmpdir(), "fruitystory-assemble-"));
  try {
    const files: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const response = await fetch(clipUrls[i]);
      if (!response.ok) throw new Error(`Téléchargement du clip ${i + 1} impossible (${response.status}).`);
      const file = path.join(dir, `clip-${String(i).padStart(4, "0")}.mp4`);
      await writeFile(file, Buffer.from(await response.arrayBuffer()));
      files.push(file);
    }

    const concatFile = path.join(dir, "concat.txt");
    await writeFile(concatFile, files.map((f) => `file '${f.replaceAll("'", "'\\''")}'`).join("\n"));

    const output = path.join(dir, "final.mp4");
    await execFileAsync(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", output]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
