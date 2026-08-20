import type { Handler } from '@netlify/functions';
import { randomBytes } from 'node:crypto';

const COOKIE = 'fruity_tiktok_oauth_state';
const scopes = 'user.info.basic,user.info.profile,user.info.stats';

function baseUrl(event: Parameters<Handler>[0]) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL || '';
  return `${proto}://${host}`;
}

export const handler: Handler = async (event) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const configuredRedirect = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey) {
    return { statusCode: 503, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>TikTok non configuré</h1><p>TIKTOK_CLIENT_KEY doit être configurée dans Netlify.</p>' };
  }

  const state = randomBytes(32).toString('hex');
  const redirectUri = configuredRedirect || `${baseUrl(event)}/api/tiktok/callback`;
  const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authorize.searchParams.set('client_key', clientKey);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', scopes);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('state', state);

  return {
    statusCode: 302,
    headers: {
      location: authorize.toString(),
      'cache-control': 'no-store',
      'set-cookie': `${COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
    body: '',
  };
};
