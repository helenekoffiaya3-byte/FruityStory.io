import type { Handler } from '@netlify/functions';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const STATE_COOKIE = 'fruity_tiktok_oauth_state';
const TOKEN_COOKIE = 'fruity_tiktok_session';

function cookieValue(cookieHeader: string | undefined, name: string) {
  const item = (cookieHeader || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return createHash('sha256').update(secret).digest();
}

function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export const handler: Handler = async event => {
  const query = event.queryStringParameters || {};
  if (query.error) {
    return { statusCode: 302, headers: { location: `/tiktok.html?error=${encodeURIComponent(query.error_description || query.error)}` }, body: '' };
  }

  const state = query.state || '';
  const expectedState = cookieValue(event.headers.cookie || event.headers.Cookie, STATE_COOKIE);
  if (!state || !expectedState || state !== expectedState) {
    return { statusCode: 400, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Connexion TikTok refusée</h1><p>La vérification de sécurité a échoué. Recommencez la connexion.</p>' };
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const code = query.code || '';
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${event.headers['x-forwarded-proto'] || 'https'}://${event.headers.host || process.env.URL}/api/tiktok/callback`;
  if (!clientKey || !clientSecret || !code) {
    return { statusCode: 503, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>TikTok non configuré</h1><p>Les identifiants TikTok ou le code d’autorisation sont manquants.</p>' };
  }

  const form = new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri });
  const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cache-control': 'no-cache' }, body: form });
  const token = await tokenResponse.json() as Record<string, any>;
  if (!tokenResponse.ok || !token.access_token || !token.refresh_token) {
    console.error('TikTok token exchange failed', token);
    return { statusCode: 502, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Connexion TikTok impossible</h1><p>TikTok n’a pas accepté la connexion. Vérifiez la configuration de l’application TikTok.</p>' };
  }

  const session = encrypt({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    openId: token.open_id,
    scope: token.scope || '',
    accessExpiresAt: Date.now() + Number(token.expires_in || 86400) * 1000,
    refreshExpiresAt: Date.now() + Number(token.refresh_expires_in || 31536000) * 1000,
  });

  return {
    statusCode: 302,
    headers: { location: '/tiktok.html?connected=1', 'cache-control': 'no-store' },
    multiValueHeaders: {
      'set-cookie': [
        `${TOKEN_COOKIE}=${encodeURIComponent(session)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      ],
    },
    body: '',
  };
};
