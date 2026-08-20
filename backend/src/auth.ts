import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { HandlerEvent } from '@netlify/functions';

function secret() { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured'); return process.env.JWT_SECRET; }
export type AuthUser = { id: string; username: string; };
export function signToken(user: AuthUser) { return jwt.sign({ sub: user.id, username: user.username }, secret(), { expiresIn: '7d' }); }
export function verifyToken(token: string): AuthUser { const p = jwt.verify(token, secret()) as jwt.JwtPayload; if (!p.sub || !p.username) throw new Error('Invalid token'); return { id: String(p.sub), username: String(p.username) }; }
function cookieValue(header: string | undefined, name: string) { const item = (header || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
export function bearer(event: HandlerEvent): AuthUser | null {
  const raw = event.headers.authorization || event.headers.Authorization;
  const cookieToken = cookieValue(event.headers.cookie || event.headers.Cookie, 'fruity_auth_token');
  const token = raw?.startsWith('Bearer ') ? raw.slice(7) : cookieToken;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function checkPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
