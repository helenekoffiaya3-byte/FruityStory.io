import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;

export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
  }
  return pool;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
