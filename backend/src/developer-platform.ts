import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const store = getStore({ name: 'fruitystory-developer-platform', consistency: 'strong' });

export type ApiKeyType = 'live' | 'test' | 'publishable' | 'secret' | 'webhook' | 'video' | 'image' | 'audio' | 'text' | 'ai' | 'payments' | 'storage' | 'analytics' | 'social' | 'admin';

export interface DeveloperProject { id: string; accountId: string; name: string; description: string; environment: 'test' | 'production'; createdAt: string; }
export interface DeveloperKey { id: string; projectId: string; accountId: string; name: string; type: ApiKeyType; prefix: string; hash: string; scopes: string[]; createdAt: string; expiresAt?: string; revokedAt?: string; }

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const KEY_TYPES: ApiKeyType[] = ['live','test','publishable','secret','webhook','video','image','audio','text','ai','payments','storage','analytics','social','admin'];
export const DEFAULT_SCOPES = ['projects:read','projects:write','keys:read','keys:write','video:generate','video:read','image:generate','audio:generate','text:generate','ai:generate','payments:read','payments:write','storage:read','storage:write','analytics:read','social:publish'];

function prefix(type: ApiKeyType, environment: 'test' | 'production') {
  const env = environment === 'production' ? 'live' : 'test';
  if (type === 'live') return `fsk_live_`;
  if (type === 'test') return `fsk_test_`;
  if (type === 'publishable') return `fsk_pk_${env}_`;
  if (type === 'secret') return `fsk_sk_${env}_`;
  if (type === 'webhook') return `fsk_wh_${env}_`;
  return `fsk_${type}_${env}_`;
}

export async function createProject(accountId: string, name: string, description = '', environment: 'test' | 'production' = 'production') {
  const project: DeveloperProject = { id: randomUUID(), accountId, name, description, environment, createdAt: new Date().toISOString() };
  await store.setJSON(`project:${project.id}`, project); await store.setJSON(`account-project:${accountId}:${project.id}`, project); return project;
}
export async function listProjects(accountId: string) { const { blobs } = await store.list({ prefix: `account-project:${accountId}:` }); const result: DeveloperProject[] = []; for (const blob of blobs) { const item = await store.get(blob.key, { type: 'json' }) as DeveloperProject | null; if (item) result.push(item); } return result; }
export async function createDeveloperKey(accountId: string, projectId: string, name: string, type: ApiKeyType = 'live', scopes = DEFAULT_SCOPES, expiresAt?: string) {
  if (!KEY_TYPES.includes(type)) throw new Error('Unsupported API key type'); const project = await store.get(`project:${projectId}`, { type: 'json' }) as DeveloperProject | null; if (!project || project.accountId !== accountId) throw new Error('Project not found');
  const secret = `${prefix(type, project.environment)}${randomBytes(32).toString('hex')}`; const record: DeveloperKey = { id: randomUUID(), projectId, accountId, name, type, prefix: secret.slice(0, Math.min(secret.length, 24)), hash: hash(secret), scopes, createdAt: new Date().toISOString(), ...(expiresAt ? { expiresAt } : {}) };
  await store.setJSON(`key:${record.hash}`, record); await store.setJSON(`project-key:${projectId}:${record.id}`, record); return { key: secret, id: record.id, projectId, type, prefix: record.prefix, scopes, createdAt: record.createdAt, warning: 'Save this FSK secret now. It will not be displayed again.' };
}
export async function listProjectKeys(accountId: string, projectId: string) { const project = await store.get(`project:${projectId}`, { type: 'json' }) as DeveloperProject | null; if (!project || project.accountId !== accountId) throw new Error('Project not found'); const { blobs } = await store.list({ prefix: `project-key:${projectId}:` }); const result: Omit<DeveloperKey, 'hash'>[] = []; for (const blob of blobs) { const item = await store.get(blob.key, { type: 'json' }) as DeveloperKey | null; if (item && !item.revokedAt) { const { hash: _, ...safe } = item; result.push(safe); } } return result; }
export async function revokeDeveloperKey(accountId: string, projectId: string, keyId: string) { const item = await store.get(`project-key:${projectId}:${keyId}`, { type: 'json' }) as DeveloperKey | null; if (!item || item.accountId !== accountId) throw new Error('Key not found'); item.revokedAt = new Date().toISOString(); await store.setJSON(`key:${item.hash}`, item); await store.setJSON(`project-key:${projectId}:${keyId}`, item); return { revoked: true, id: keyId }; }
