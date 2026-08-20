import type { Handler } from '@netlify/functions';
import { randomBytes } from 'node:crypto';
import { signToken } from '../../backend/src/auth';
import { db } from '../../backend/src/db';

const COOKIE = 'fruity_google_oauth_state';
const AUTH_COOKIE = 'fruity_auth_token';

function cookieValue(header: string | undefined, name: string) {
  const item = (header || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function safeUsername(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'googleuser';
}

export const handler: Handler = async event => {
  try {
    const query = event.queryStringParameters || {};
    if (query.error) return { statusCode: 302, headers: { location: `/auth.html?error=${encodeURIComponent(query.error_description || query.error)}` }, body: '' };
    const expected = cookieValue(event.headers.cookie || event.headers.Cookie, COOKIE);
    if (!query.state || !expected || query.state !== expected) return { statusCode: 400, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Connexion Google refusée</h1><p>La vérification de sécurité a échoué.</p>' };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const code = query.code || '';
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host || process.env.URL || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/auth/google/callback`;
    if (!clientId || !clientSecret || !code) return { statusCode: 503, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Google non configuré</h1><p>Les identifiants Google ou le code d’autorisation sont manquants.</p>' };

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
    const token = await tokenResponse.json() as Record<string, any>;
    if (!tokenResponse.ok || !token.access_token) throw new Error('Google token exchange failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as Record<string, any>;
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) throw new Error('Google account email is unavailable or unverified');

    const existing = await db().query('SELECT * FROM users WHERE email=$1 LIMIT 1', [profile.email]);
    let user = existing.rows[0];
    if (!user) {
      let username = safeUsername(profile.email);
      const collision = await db().query('SELECT 1 FROM users WHERE username=$1 LIMIT 1', [username]);
      if (collision.rows[0]) username = `${username}_${randomBytes(3).toString('hex')}`;
      const created = await db().query('INSERT INTO users(username,email,password_hash,display_name,avatar_url) VALUES($1,$2,NULL,$3,$4) RETURNING *', [username, profile.email, profile.name || username, profile.picture || null]);
      user = created.rows[0];
    } else if (profile.picture && !user.avatar_url) {
      await db().query('UPDATE users SET avatar_url=$1,updated_at=now() WHERE id=$2', [profile.picture, user.id]);
    }

    const jwt = signToken({ id: user.id, username: user.username });
    return { statusCode: 302, headers: { location: '/dashboard.html?login=success', 'cache-control': 'no-store' }, multiValueHeaders: { 'set-cookie': [`${AUTH_COOKIE}=${encodeURIComponent(jwt)}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`, `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`] }, body: '' };
  } catch (error) {
    console.error('Google OAuth callback failed', error);
    return { statusCode: 502, headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>Connexion Google impossible</h1><p>Vérifiez la configuration OAuth Google et réessayez.</p>' };
  }
};
