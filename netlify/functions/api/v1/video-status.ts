import type { Handler } from '@netlify/functions';
import { requireFsk } from '../../_lib/fsk-auth';
import { retrieveOpenAIVideo } from '../../_lib/openai-video';

const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Utilisez GET.' });
  const auth = requireFsk(event);
  if (!auth.ok) return json(401, { error: auth.error });
  const videoId = event.queryStringParameters?.video_id;
  if (!videoId) return json(400, { error: 'video_id est obligatoire.' });

  try {
    const video = await retrieveOpenAIVideo(videoId);
    return json(200, {
      ok: true,
      video_id: video.id,
      provider_video_id: video.id,
      status: video.status,
      progress: video.progress,
      model: video.model,
      seconds: video.seconds,
      size: video.size,
      completed_at: video.completed_at,
      error: video.error,
      content: video.status === 'completed' ? `/api/v1/videos/${encodeURIComponent(video.id)}/content` : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur du fournisseur vidéo.';
    return json(502, { ok: false, error: 'Impossible de récupérer le statut vidéo.', details: message });
  }
};

export { handler };
