import { randomUUID } from 'node:crypto';
import type { User, Video, Comment, Notification, Conversation, Message, Story, Playlist, AiJob, PromoteCampaign, CreditLedger } from './api-types';

const now = () => new Date().toISOString();
const users = new Map<string, User>();
const videos = new Map<string, Video>();
const comments = new Map<string, Comment>();
const notifications = new Map<string, Notification>();
const conversations = new Map<string, Conversation>();
const messages = new Map<string, Message>();
const stories = new Map<string, Story>();
const playlists = new Map<string, Playlist>();
const aiJobs = new Map<string, AiJob>();
const campaigns = new Map<string, PromoteCampaign>();
const ledger: CreditLedger[] = [];
const balances = new Map<string, number>();
const following = new Map<string, Set<string>>();

export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const currentUser = (headers: Headers) => headers.get('x-user-id') || 'demo-user';

if (!users.has('demo-user')) users.set('demo-user', { id:'demo-user', username:'demo', displayName:'FruityStory Creator', followers:0, following:0, likes:0, verified:false, createdAt:now() });

export const store = { users, videos, comments, notifications, conversations, messages, stories, playlists, aiJobs, campaigns, ledger, balances, following };

export function ensureUser(userId: string) {
  if (!users.has(userId)) users.set(userId, { id:userId, username:userId, displayName:userId, followers:0, following:0, likes:0, verified:false, createdAt:now() });
  if (!balances.has(userId)) balances.set(userId, 0);
  if (!following.has(userId)) following.set(userId, new Set());
  return users.get(userId)!;
}

export function notify(userId:string, type:string, actorId?:string, videoId?:string) {
  const n: Notification = { id:id('notif'), userId, type, actorId, videoId, read:false, createdAt:now() };
  notifications.set(n.id,n); return n;
}

export { now };
