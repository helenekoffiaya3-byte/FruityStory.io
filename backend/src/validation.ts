import { z } from 'zod';

export const registerSchema=z.object({username:z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/),email:z.string().email(),password:z.string().min(8).max(128)});
export const loginSchema=z.object({login:z.string().min(1),password:z.string().min(1)});
export const videoSchema=z.object({videoUrl:z.string().url(),thumbnailUrl:z.string().url().optional(),caption:z.string().max(2200).optional(),visibility:z.enum(['public','friends','private']).optional(),allowComments:z.boolean().optional(),allowDuet:z.boolean().optional(),allowStitch:z.boolean().optional(),allowDownload:z.boolean().optional(),hashtags:z.array(z.string().max(100)).max(100).optional()});
export const commentSchema=z.object({text:z.string().min(1).max(2000),parentId:z.string().uuid().optional()});
export const generateSchema=z.object({prompt:z.string().min(1).max(10000),duration:z.number().int().positive().max(1800).optional(),aspectRatio:z.string().max(20).optional(),provider:z.enum(['auto','veo','seedance','pixverse','sora']).optional()});
export const promoteSchema=z.object({videoId:z.string().uuid(),objective:z.string().min(1).max(100),audience:z.record(z.string(),z.unknown()).optional(),budget:z.number().positive(),durationDays:z.number().int().positive().max(365)});
