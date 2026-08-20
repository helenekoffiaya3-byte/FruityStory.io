import type { Handler } from '@netlify/functions';
import { bearer } from '../../backend/src/auth';
import { createFsk } from './_lib/fsk-store';

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Utilisez POST.' });

  // The owner is derived exclusively from the authenticated FruityStory JWT.
  // Client-controlled owner/account headers are deliberately ignored.
  const user = bearer(event);
  if (!user) return json(401, { error: 'Session FruityStory valide requise pour créer une clé API.' });

  let body: any = {};
  try { body = JSON.parse(event.body ?? '{}'); } catch { return json(400, { error: 'JSON invalide.' }); }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'API key';
  const plan = typeof body.plan === 'string' ? body.plan.slice(0, 50) : 'developer';
  const credits = Number.isFinite(Number(body.credits)) ? Math.max(0, Math.floor(Number(body.credits))) : 0;
  const { key, record } = await createFsk(user.id, name, plan, credits);

  return json(201, {
    ok: true,
    keyType: 'fsk',
    key,
    prefix: 'fsk',
    keyId: record.id,
    ownerId: user.id,
    plan: record.plan,
    credits: record.credits,
    message: 'Clé générée. Affichez-la une seule fois et ne la partagez jamais publiquement.',
  });
};

export { handler };
