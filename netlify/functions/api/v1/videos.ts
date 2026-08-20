import type { Handler } from '@netlify/functions';
import { requireFsk } from '../../_lib/fsk-auth';
import { createOpenAIVideo } from '../../_lib/openai-video';

const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });
  const auth = requireFsk(event);
  if (!auth.ok) return json(401, { error: auth.error });

  let body: any;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'JSON invalide.' }); }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const duration = Number(body.duration ?? 12) as 4 | 8 | 12;
  const model = body.model === 'sora-2-pro' ? 'sora-2-pro' : 'sora-2';
  const aspectRatio = ['16:9', '9:16', '1:1'].includes(body.aspect_ratio) ? body.aspect_ratio : '16:9';
  const resolution = ['720p', '1024p', '1080p'].includes(body.resolution) ? body.resolution : '720p';
  const projectDurationMinutes = Number(body.duration_minutes ?? 0);
  const chunkMinutes = Number(body.chunk_minutes ?? 0);

  if (!prompt) return json(400, { error: 'prompt est obligatoire.' });
  if (![4, 8, 12].includes(duration)) return json(400, { error: 'duration doit être 4, 8 ou 12 secondes par clip.' });
  if (projectDurationMinutes && (projectDurationMinutes < 1 || projectDurationMinutes > 60)) return json(400, { error: 'duration_minutes doit être comprise entre 1 et 60.' });
  if (chunkMinutes && (chunkMinutes < 1 || chunkMinutes > 60)) return json(400, { error: 'chunk_minutes doit être comprise entre 1 et 60.' });

  try {
    const video = await createOpenAIVideo({ prompt, duration, model, aspectRatio, resolution });
    return json(202, {
      ok: true,
      authenticated: true,
      api: 'FruityStory Video API v1',
      video_id: video.id,
      provider_video_id: video.id,
      status: video.status,
      progress: video.progress,
      request: { prompt, duration, model, aspect_ratio: aspectRatio, resolution, duration_minutes: projectDurationMinutes || null, chunk_minutes: chunkMinutes || null },
      provider: model,
      message: 'Génération vidéo réellement lancée chez le fournisseur configuré.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur du fournisseur vidéo.';
    return json(502, { ok: false, error: 'La génération vidéo a échoué.', details: message });
  }
};

export { handler };
