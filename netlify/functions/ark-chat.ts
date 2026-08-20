import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

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
    const content = String(body.content || '').trim();
    if (!content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'content is required' }) };
    }

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    });

    const completion = await client.chat.completions.create({
      model: 'seed-2-0-lite-260228',
      messages: [{ role: 'user', content }],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: completion.choices[0]?.message?.content ?? '',
      }),
    };
  } catch (error) {
    console.error('Ark request failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ark request failed' }),
    };
  }
};
