import { createHash, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type FskRecord = {
  id: string;
  keyHash: string;
  ownerId: string;
  name: string;
  plan: string;
  credits: number;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

const store = () => getStore({ name: 'fruitystory-fsk', consistency: 'strong' });
const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

export async function createFsk(ownerId: string, name = 'API key', plan = 'developer', credits = 0) {
  const key = `fsk_${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
  const record: FskRecord = { id: randomUUID(), keyHash: hashKey(key), ownerId, name, plan, credits, revoked: false, createdAt: new Date().toISOString() };
  await store().setJSON(`key:${record.keyHash}`, record);
  return { key, record };
}

export async function getFsk(key: string) {
  if (!key.startsWith('fsk_')) return null;
  const record = await store().get(`key:${hashKey(key)}`, { type: 'json' }) as FskRecord | null;
  return record;
}

export async function revokeFsk(key: string) {
  const record = await getFsk(key);
  if (!record) return false;
  record.revoked = true;
  await store().setJSON(`key:${record.keyHash}`, record);
  return true;
}

export async function consumeCredits(key: string, amount: number) {
  const record = await getFsk(key);
  if (!record || record.revoked || record.credits < amount) return { ok: false as const, record };
  record.credits -= amount;
  record.lastUsedAt = new Date().toISOString();
  await store().setJSON(`key:${record.keyHash}`, record);
  return { ok: true as const, record };
}
