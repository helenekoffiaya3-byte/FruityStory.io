import type { Handler } from '@netlify/functions';
import { randomBytes } from 'node:crypto';

const COOKIE = 'fruity_google_oauth_state';
const SCOPES = 'openid email profile';

export const handler: Handler = async event => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { statusCode: 503, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Google non configuré</h1><p>GOOGLE_CLIENT_ID doit être configurée dans Netlify.</p>' };
  const state = randomBytes(32).toString('hex');
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');
  return { statusCode: 302, headers: { location: url.toString(), 'cache-control': 'no-store', 'set-cookie': `${COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax` }, body: '' };
};
