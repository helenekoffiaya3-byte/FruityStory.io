import type { Handler } from '@netlify/functions';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

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

function decrypt(value: string) {
  const [ivText, tagText, dataText] = value.split('.');
  if (!ivText || !tagText || !dataText) throw new Error('Invalid TikTok session');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const clear = Buffer.concat([decipher.update(Buffer.from(dataText, 'base64url')), decipher.final()]).toString('utf8');
  return JSON.parse(clear) as Record<string, any>;
}

function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

async function refresh(session: Record<string, any>) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret || !session.refreshToken) return null;
  const form = new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: session.refreshToken });
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cache-control': 'no-cache' }, body: form });
  const token = await response.json() as Record<string, any>;
  if (!response.ok || !token.access_token) return null;
  return { ...session, accessToken: token.access_token, refreshToken: token.refresh_token || session.refreshToken, scope: token.scope || session.scope, accessExpiresAt: Date.now() + Number(token.expires_in || 86400) * 1000, refreshExpiresAt: Date.now() + Number(token.refresh_expires_in || 31536000) * 1000 };
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export const handler: Handler = async event => {
  try {
    const raw = cookieValue(event.headers.cookie || event.headers.Cookie, TOKEN_COOKIE);
    if (!raw) return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ connected: false, error: 'TikTok non connecté' }) };

    let session = decrypt(raw);
    let refreshed = false;
    if (Number(session.accessExpiresAt || 0) <= Date.now() + 60_000) {
      const next = await refresh(session);
      if (!next) return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ connected: false, error: 'La connexion TikTok a expiré. Reconnectez votre compte.' }) };
      session = next;
      refreshed = true;
    }

    const fields = 'open_id,avatar_url,display_name,profile_deep_link,bio_description,is_verified,follower_count,following_count,likes_count,video_count,username';
    const response = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, { headers: { authorization: `Bearer ${session.accessToken}` } });
    const payload = await response.json() as Record<string, any>;
    if (!response.ok || (payload.error?.code && payload.error.code !== 'ok')) {
      console.error('TikTok user info failed', payload);
      return { statusCode: 502, headers: jsonHeaders, body: JSON.stringify({ connected: true, error: 'TikTok ne permet pas de récupérer les statistiques demandées. Vérifiez que les scopes nécessaires sont approuvés.' }) };
    }

    const data = payload.data || {};
    const result = { connected: true, profile: { open_id: data.open_id, username: data.username, display_name: data.display_name, avatar_url: data.avatar_url, profile_deep_link: data.profile_deep_link, bio_description: data.bio_description, is_verified: data.is_verified }, stats: { follower_count: data.follower_count, following_count: data.following_count, likes_count: data.likes_count, video_count: data.video_count }, scope: session.scope || '' };
    const headers: Record<string, string> = { ...jsonHeaders };
    const multiValueHeaders: Record<string, string[]> = {};
    if (refreshed) multiValueHeaders['set-cookie'] = [`${TOKEN_COOKIE}=${encodeURIComponent(encrypt(session))}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`];
    return { statusCode: 200, headers, multiValueHeaders, body: JSON.stringify(result) };
  } catch (error: any) {
    console.error('TikTok stats error', error);
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ connected: false, error: 'Impossible de charger les statistiques TikTok.' }) };
  }
};
