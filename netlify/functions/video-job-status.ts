import type { Handler } from "@netlify/functions";
import { Redis } from "@upstash/redis";
import { getVeoVideoStatus } from "./providers/veo";
import { getPixVerseVideoStatus } from "./providers/pixverse";
const redis=Redis.fromEnv();
const json=(statusCode:number,body:unknown)=>({statusCode,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS"},body:JSON.stringify(body)});
export const handler:Handler=async event=>{
 if(event.httpMethod==="OPTIONS")return json(204,null);if(event.httpMethod!=="GET"&&event.httpMethod!=="POST")return json(405,{success:false,error:"Utilisez GET ou POST."});
 let body:any={};try{body=event.body?JSON.parse(event.body):{}}catch{return json(400,{success:false,error:"JSON invalide."})}
 const provider=String(body.provider||event.queryStringParameters?.provider||"").toLowerCase();const id=String(body.id||event.queryStringParameters?.id||body.operationName||event.queryStringParameters?.operationName||"").trim();if(!id)return json(400,{success:false,error:"id est obligatoire."});
 const job=await redis.get<any>(`video-job:${id}`);
 if(job){const clips=Array.isArray(job.clips)?job.clips:[];if(job.status==="completed")return json(200,{success:true,provider:job.provider,status:"completed",finalVideoUrl:job.finalVideoUrl,jobId:id});if(job.status==="failed")return json(200,{success:true,provider:job.provider,status:"failed",error:job.error||"La génération vidéo a échoué.",jobId:id});return json(200,{success:true,provider:job.provider,status:job.status==="queued"?"queued":"processing",jobId:id,completedClips:clips.filter((c:any)=>c.status==="completed").length,totalClips:clips.length});}
 try{
  if(provider==="pixverse"){if(!process.env.PIXVERSE_API_KEY)return json(500,{success:false,error:"PIXVERSE_API_KEY manquante côté serveur."});return json(200,{success:true,...(await getPixVerseVideoStatus(id))});}
  if(provider!=="veo"&&provider!=="gemini_veo")return json(400,{success:false,error:"provider invalide."});if(!process.env.GEMINI_API_KEY)return json(500,{success:false,error:"GEMINI_API_KEY manquante côté serveur."});if(!id.startsWith("operations/"))return json(404,{success:false,error:"Job vidéo introuvable."});
  const operation=await getVeoVideoStatus(id);return json(200,{success:true,provider:"google_veo",status:operation?.error?"failed":operation?.done?"completed":"processing",operation});
 }catch(error){console.error("video status failed:",error);return json(502,{success:false,error:"Impossible de récupérer le statut de la vidéo."})}
};
