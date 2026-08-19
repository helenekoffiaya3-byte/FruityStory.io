import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const clientId = process.env.ORANGE_MONEY_CLIENT_ID;
  const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET;
  const authorization = process.env.ORANGE_MONEY_AUTHORIZATION;
  const tokenUrl = process.env.ORANGE_MONEY_TOKEN_URL || 'https://api.orange.com/oauth/v3/token';

  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Orange Money credentials are not configured' }) };
  }

  const basic = authorization || `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: basic,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await response.text();
  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: text,
  };
};

export { handler };
