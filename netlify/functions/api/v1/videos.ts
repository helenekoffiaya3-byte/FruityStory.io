import type { Handler } from '@netlify/functions';
import { requireFsk } from '../../_lib/fsk-auth';

const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });
  const auth = requireFsk(event);
  if (!auth.ok) return json(401, { error: auth.error });

  let body: any;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'JSON invalide.' }); }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const duration = Number(body.duration ?? 12);
  const model = body.model === 'sora-2-pro' ? 'sora-2-pro' : 'sora-2';
  const aspectRatio = ['16:9', '9:16', '1:1'].includes(body.aspect_ratio) ? body.aspect_ratio : '16:9';
  const projectDurationMinutes = Number(body.duration_minutes ?? 0);
  const chunkMinutes = Number(body.chunk_minutes ?? 0);

  if (!prompt) return json(400, { error: 'prompt est obligatoire.' });
  if (![4, 8, 12].includes(duration)) return json(400, { error: 'duration doit être 4, 8 ou 12 secondes par clip.' });
  if (projectDurationMinutes && (projectDurationMinutes < 1 || projectDurationMinutes > 60)) return json(400, { error: 'duration_minutes doit être comprise entre 1 et 60.' });
  if (chunkMinutes && (chunkMinutes < 1 || chunkMinutes > 60)) return json(400, { error: 'chunk_minutes doit être comprise entre 1 et 60.' });

  const videoId = `fsk_${crypto.randomUUID()}`;
  return json(202, {
    ok: true,
    authenticated: true,
    api: 'FruityStory Video API v1',
    video_id: videoId,
    status: 'queued',
    request: { prompt, duration, model, aspect_ratio: aspectRatio, duration_minutes: projectDurationMinutes || null, chunk_minutes: chunkMinutes || null },
    provider: 'sora-2',
    message: 'Job vidéo accepté par l’API FSK. Le worker vidéo doit consommer ce job et publier le résultat.',
  });
};

export { handler };
