import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import { reserveDailyVideoQuota, releaseDailyVideoQuota } from "./lib/atomic-video-quota";
import { getSubscriptionPlan, type SubscriptionTier } from "./lib/subscription-plans";
import { getUserSubscriptionTier } from "./lib/subscription-access";
import { assertVideoProviderAllowed } from "./lib/video-quota";
import { createVeoVideo } from "./providers/veo";
import { createPixVerseVideo } from "./providers/pixverse";

const redis = Redis.fromEnv();
const QUEUE_KEY = "video-generation-queue";
const JOB_TTL = 86400;
const MAX_PROVIDER_CLIPS = 120;

type ClipJob = { index:number; prompt:string; operationId:string; status:"queued"|"processing"|"completed"|"failed"; url?:string };
function json(statusCode:number,body:unknown){return{statusCode,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization","Access-Control-Allow-Methods":"POST, OPTIONS"},body:JSON.stringify(body)}}
function getUserId(event:Parameters<Handler>[0],body:any){const value=typeof body?.userId==="string"&&body.userId.trim()?body.userId.trim():event.headers["x-user-id"]||"";return value.trim()||null}
function getClipPrompts(body:any,prompt:string,maxScenes:number){if(!Array.isArray(body.clips)||body.clips.length===0)return[prompt];const prompts=body.clips.map((clip:unknown)=>{if(typeof clip==="string")return clip.trim();if(clip&&typeof clip==="object"&&typeof(clip as any).prompt==="string")return(clip as any).prompt.trim();return""}).filter(Boolean);if(!prompts.length)throw new Error("clips ne contient aucun prompt valide.");if(prompts.length>Math.min(maxScenes,MAX_PROVIDER_CLIPS))throw new Error(`Ce forfait autorise au maximum ${Math.min(maxScenes,MAX_PROVIDER_CLIPS)} scènes.`);return prompts}
function getSeconds(body:any,plan:ReturnType<typeof getSubscriptionPlan>){const seconds=Number(body.seconds??8);if(!Number.isFinite(seconds)||seconds<=0)throw new Error("seconds invalide.");if(plan.maxSceneDurationSeconds&&seconds>plan.maxSceneDurationSeconds)throw new Error(`Une scène ne peut pas dépasser ${plan.maxSceneDurationSeconds} secondes avec ce forfait.`);return Math.ceil(seconds)}
async function startProviderClip(provider:"veo"|"pixverse",prompt:string,body:any){if(provider==="veo")return createVeoVideo({prompt,aspectRatio:body.aspectRatio==="9:16"?"9:16":"16:9",resolution:body.resolution==="1080p"||body.resolution==="4k"?body.resolution:"720p"});return createPixVerseVideo({prompt,model:body.model==="c1"?"c1":"v6",duration:body.seconds,quality:body.quality||"720p",aspectRatio:body.aspectRatio||"9:16",generateAudio:typeof body.generateAudio==="boolean"?body.generateAudio:undefined,generateMultiClip:typeof body.generateMultiClip==="boolean"?body.generateMultiClip:undefined})}
export const handler:Handler=async(event)=>{
 if(event.httpMethod==="OPTIONS")return json(204,null); if(event.httpMethod!=="POST")return json(405,{success:false,error:"Utilisez POST."});
 let body:any;try{body=event.body?JSON.parse(event.body):{}}catch{return json(400,{success:false,error:"JSON invalide."})}
 const prompt=typeof body.prompt==="string"?body.prompt.trim():"";if(!prompt)return json(400,{success:false,error:"Le champ prompt est obligatoire."});
 const userId=getUserId(event,body);if(!userId)return json(401,{success:false,error:"Utilisateur non authentifié."});
 const tier:SubscriptionTier=await getUserSubscriptionTier(redis,userId);const plan=getSubscriptionPlan(tier);if(tier==="free")return json(403,{success:false,error:"Un abonnement actif est nécessaire pour générer une vidéo.",tier});
 const provider=String(body.provider||"veo").toLowerCase() as "veo"|"pixverse";if(provider!=="veo"&&provider!=="pixverse")return json(400,{success:false,error:"provider doit être 'veo' ou 'pixverse'."});
 try{assertVideoProviderAllowed(tier,provider)}catch(error){return json(403,{success:false,error:error instanceof Error?error.message:"Fournisseur non autorisé.",tier})}
 if(provider==="veo"&&!process.env.GEMINI_API_KEY)return json(500,{success:false,error:"GEMINI_API_KEY manquante côté serveur."});if(provider==="pixverse"&&!process.env.PIXVERSE_API_KEY)return json(500,{success:false,error:"PIXVERSE_API_KEY manquante côté serveur."});
 let clipPrompts:string[];let seconds:number;try{clipPrompts=getClipPrompts(body,prompt,plan.maxScenes);seconds=getSeconds(body,plan);const totalSeconds=clipPrompts.length*seconds;if(totalSeconds>plan.maxDurationMinutes*60)return json(400,{success:false,error:`La durée totale demandée dépasse la limite de ${plan.maxDurationMinutes} minutes du forfait ${plan.name}.`,tier,maxDurationMinutes:plan.maxDurationMinutes,requestedDurationSeconds:totalSeconds})}catch(error){return json(400,{success:false,error:error instanceof Error?error.message:"Paramètres vidéo invalides.",tier})}
 const quota=await reserveDailyVideoQuota(redis,userId,plan.dailyVideoLimit);if(!quota)return json(429,{success:false,error:`Quota quotidien atteint : maximum ${plan.dailyVideoLimit} vidéos par jour.`,tier});
 const jobId=randomUUID();try{const clips:ClipJob[]=[];for(let index=0;index<clipPrompts.length;index++){const job:any=await startProviderClip(provider,clipPrompts[index],{...body,seconds});const operationId=provider==="veo"?job.operationName:job.videoId;if(!operationId)throw new Error(`${provider} n'a pas retourné d'identifiant de génération.`);clips.push({index,prompt:clipPrompts[index],operationId,status:"queued"})}
 const record={jobId,userId,tier,provider,model:provider==="veo"?process.env.GEMINI_VIDEO_MODEL||"veo-3.1-generate-preview":body.model==="c1"?"c1":"v6",status:"queued",prompt,clips,completedClipUrls:[],quotaKey:quota.key,createdAt:new Date().toISOString()};await redis.set(`video-job:${jobId}`,record,{ex:JOB_TTL});await redis.rpush(QUEUE_KEY,jobId);return json(200,{success:true,jobId,provider,tier,status:"queued",clipCount:clips.length,creditsIncluded:plan.credits,quota:{videosCreatedToday:quota.count,dailyLimit:plan.dailyVideoLimit,remaining:plan.dailyVideoLimit-quota.count,resetDate:quota.resetDate}})}catch(error){await releaseDailyVideoQuota(redis,quota.key);console.error(`${provider} generation failed:`,error);return json(502,{success:false,error:"Le fournisseur vidéo n'a pas accepté la génération. Le quota a été restauré.",tier})}
};
