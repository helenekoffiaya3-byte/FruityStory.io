import type { Handler } from '@netlify/functions';
import { randomBytes } from 'node:crypto';

const FSK_PREFIX = 'fsk';

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function generateFskKey() {
  return `${FSK_PREFIX}_${randomBytes(24).toString('base64url')}`;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });

  // FSK = FruityStoryKey. The generated credential always starts with "fsk".
  // Persistence, ownership, plan/credit limits and revocation should be backed
  // by the application's authenticated database/session layer; never log keys.
  const key = generateFskKey();

  return json(201, {
    ok: true,
    keyType: 'fsk',
    key,
    prefix: 'fsk',
    message: 'Clé FruityStoryKey générée. Ne la partagez pas publiquement.',
  });
};

export { handler };
