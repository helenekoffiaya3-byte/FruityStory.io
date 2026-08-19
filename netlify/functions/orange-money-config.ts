import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const required = [
    'ORANGE_MONEY_CLIENT_ID',
    'ORANGE_MONEY_CLIENT_SECRET',
    'ORANGE_MONEY_AUTHORIZATION',
    'ORANGE_MONEY_TOKEN_URL',
    'ORANGE_MONEY_COUNTRY',
    'ORANGE_MONEY_CURRENCY',
  ];

  const configured = Object.fromEntries(
    required.map((name) => [name, Boolean(process.env[name])]),
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'orange-money',
      country: process.env.ORANGE_MONEY_COUNTRY || 'CI',
      currency: process.env.ORANGE_MONEY_CURRENCY || 'XOF',
      configured,
      ready: required.every((name) => Boolean(process.env[name])),
    }),
  };
};

export { handler };
