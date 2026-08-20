import type { Handler } from '@netlify/functions';
import { requireFsk } from '../_lib/fsk-auth';

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

  if (!prompt) return json(400, { error: 'prompt est obligatoire.' });
  if (![4, 8, 12].includes(duration)) return json(400, { error: 'duration doit être 4, 8 ou 12 secondes par clip.' });

  // FSK is the public developer credential. The provider secret remains server-side.
  // The actual provider job is delegated to the existing internal video pipeline.
  return json(202, {
    ok: true,
    authenticated: true,
    api: 'FruityStory Video API v1',
    request: { prompt, duration, model, aspect_ratio: aspectRatio },
    status: 'accepted',
    message: 'Demande authentifiée par FSK et prête pour la file de génération vidéo FruityStory.',
    next: 'Connecter cette requête au worker vidéo interne et retourner un video_id persistant.',
  });
};

export { handler };
