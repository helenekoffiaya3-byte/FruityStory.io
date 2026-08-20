import type { Handler } from '@netlify/functions';
import { requireFsk } from '../_lib/fsk-auth';

const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Utilisez GET.' });
  const auth = requireFsk(event);
  if (!auth.ok) return json(401, { error: auth.error });
  const videoId = event.queryStringParameters?.video_id;
  if (!videoId) return json(400, { error: 'video_id est obligatoire.' });

  return json(200, { ok: true, video_id: videoId, status: 'queued', progress: 0, message: 'Le worker vidéo doit fournir le statut réel de ce job.' });
};

export { handler };
