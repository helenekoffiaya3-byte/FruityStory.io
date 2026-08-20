import type { Handler } from '@netlify/functions';

const ARK_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ARK_API_KEY is not configured' }) };
  }

  const taskId = event.queryStringParameters?.id;
  if (!taskId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'id is required' }) };
  }

  try {
    const response = await fetch(`${ARK_BASE_URL}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Ark video status failed:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Ark video status failed' }) };
  }
};
