export type Visibility = 'public' | 'friends' | 'private';

export interface User { id: string; username: string; displayName: string; avatarUrl?: string; bio?: string; followers: number; following: number; likes: number; verified: boolean; createdAt: string; }
export interface Video { id: string; authorId: string; videoUrl: string; thumbnailUrl?: string; caption?: string; hashtags: string[]; soundId?: string; likes: number; comments: number; shares: number; views: number; visibility: Visibility; allowComments: boolean; allowDuet: boolean; allowStitch: boolean; allowDownload: boolean; createdAt: string; }
export interface Comment { id: string; videoId: string; authorId: string; text: string; parentId?: string; likes: number; replies: number; createdAt: string; }
export interface Notification { id: string; userId: string; type: string; actorId?: string; videoId?: string; read: boolean; createdAt: string; }
export interface Message { id: string; conversationId: string; senderId: string; text: string; videoId?: string; createdAt: string; }
export interface Conversation { id: string; participantIds: string[]; createdAt: string; updatedAt: string; }
export interface Story { id: string; authorId: string; mediaUrl: string; caption?: string; expiresAt: string; viewers: string[]; createdAt: string; }
export interface Playlist { id: string; ownerId: string; name: string; videoIds: string[]; visibility: Visibility; createdAt: string; }
export interface AiJob { id: string; userId: string; status: 'queued'|'processing'|'completed'|'failed'|'cancelled'; provider: string; prompt: string; duration?: number; aspectRatio?: string; outputUrl?: string; error?: string; createdAt: string; updatedAt: string; }
export interface PromoteCampaign { id: string; userId: string; videoId: string; objective: string; audience: Record<string, unknown>; budget: number; durationDays: number; status: 'pending'|'active'|'paused'|'rejected'|'completed'|'cancelled'; metrics: Record<string, number>; createdAt: string; }
export interface CreditLedger { id: string; userId: string; amount: number; type: 'purchase'|'reserve'|'consume'|'refund'|'adjustment'; reference?: string; createdAt: string; }
