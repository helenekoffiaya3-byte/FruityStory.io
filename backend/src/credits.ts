import { db } from './db';

export const VIDEO_GENERATION_CREDITS = 150;

export async function chargeCredits(userId: string, amount: number, reason: string) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const rows = await client.query(
      'SELECT amount FROM credit_ledger WHERE user_id=$1 FOR UPDATE',
      [userId]
    );
    const balance = rows.rows.reduce((total: number, row: { amount: string | number }) => total + Number(row.amount), 0);
    if (balance < amount) {
      await client.query('ROLLBACK');
      return { ok: false as const, balance };
    }
    const reference = `${reason}:${crypto.randomUUID()}`;
    await client.query(
      'INSERT INTO credit_ledger(user_id,amount,type,reference) VALUES($1,$2,$3,$4)',
      [userId, -amount, reason, reference]
    );
    await client.query('COMMIT');
    return { ok: true as const, balance, remaining: balance - amount, reference };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function refundCredits(userId: string, amount: number, reason: string) {
  await db().query(
    'INSERT INTO credit_ledger(user_id,amount,type,reference) VALUES($1,$2,$3,$4)',
    [userId, amount, `${reason}_refund`, `${reason}:refund:${crypto.randomUUID()}`]
  );
}
