import { getFsk } from './fsk-store';

export async function requireFsk(event: { headers?: Record<string, string | undefined> }) {
  const headers = event.headers ?? {};
  const authorization = headers.authorization ?? headers.Authorization ?? '';
  const match = authorization.match(/^Bearer\s+(fsk_[A-Za-z0-9_-]{20,})$/);
  const direct = headers['x-fsk-key'] ?? headers['X-FSK-Key'];
  const key = match?.[1] ?? direct ?? '';
  if (!key.startsWith('fsk_')) return { ok: false as const, error: 'Clé API FruityStory manquante ou invalide. Utilisez Authorization: Bearer fsk_...' };
  const record = await getFsk(key);
  if (!record) return { ok: false as const, error: 'Clé FSK inconnue.' };
  if (record.revoked) return { ok: false as const, error: 'Clé FSK révoquée.' };
  return { ok: true as const, key, keyHash: record.keyHash, record };
}
