import type { Handler } from '@netlify/functions';
import { requireFsk } from '../../_lib/fsk-auth';
import { downloadOpenAIVideo } from '../../_lib/openai-video';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Utilisez GET.' };
  const auth = requireFsk(event);
  if (!auth.ok) return { statusCode: 401, body: auth.error };
  const videoId = event.queryStringParameters?.video_id;
  if (!videoId) return { statusCode: 400, body: 'video_id est obligatoire.' };

  try {
    const response = await downloadOpenAIVideo(videoId);
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': `inline; filename="${videoId}.mp4"`, 'Cache-Control': 'private, max-age=300' },
      body: buffer.toString('base64'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur du fournisseur vidéo.';
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Impossible de télécharger la vidéo.', details: message }) };
  }
};

export { handler };
