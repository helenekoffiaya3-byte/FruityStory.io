import type { Handler } from '@netlify/functions';

const ARK_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_MODEL = process.env.ARK_VIDEO_MODEL || 'seedance-2-0';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ARK_API_KEY is not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
    }

    const payload = {
      model: body.model || DEFAULT_MODEL,
      content: [
        { type: 'text', text: prompt },
        ...(typeof body.image_url === 'string' && body.image_url.trim()
          ? [{ type: 'image_url', image_url: { url: body.image_url.trim() } }]
          : []),
      ],
      ...(body.duration ? { duration: body.duration } : {}),
      ...(body.aspect_ratio ? { aspect_ratio: body.aspect_ratio } : {}),
      ...(body.resolution ? { resolution: body.resolution } : {}),
    };

    const response = await fetch(`${ARK_BASE_URL}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: 'Ark video generation request failed', details: data }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Invalid request or Ark API failure', details: error instanceof Error ? error.message : 'Unknown error' }) };
  }
};
