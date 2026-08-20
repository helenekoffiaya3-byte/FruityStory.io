import type { Handler } from '@netlify/functions';

const ARK_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ARK_API_KEY is not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
    }

    const response = await fetch(`${ARK_BASE_URL}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'seedance-1-0-pro',
        content: [{ type: 'text', text: prompt }],
      }),
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Ark video generation failed:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Ark video generation failed' }) };
  }
};
