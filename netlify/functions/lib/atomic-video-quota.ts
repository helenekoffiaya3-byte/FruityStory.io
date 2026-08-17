import { Redis } from "@upstash/redis";
import { getDailyVideoQuotaKey } from "./video-quota";

const QUOTA_TTL_SECONDS = 172800;
export const MAX_PER_DAY = 40;
export type ReservedVideoQuota = { key:string; count:number; resetDate:string; dailyLimit:number };
function todayISO(){return new Date().toISOString().slice(0,10)}
export async function reserveDailyVideoQuota(redis:Redis,userId:string,dailyLimit:number=MAX_PER_DAY):Promise<ReservedVideoQuota|null>{
 if(!userId.trim())throw new Error("userId obligatoire");if(!Number.isInteger(dailyLimit)||dailyLimit<0)throw new Error("dailyLimit invalide");if(dailyLimit===0)return null;
 const resetDate=todayISO();const key=getDailyVideoQuotaKey(userId,new Date(`${resetDate}T00:00:00.000Z`));
 const count=Number(await (redis as any).eval(`local key = KEYS[1]\nlocal max = tonumber(ARGV[1])\nlocal ttl = tonumber(ARGV[2])\nlocal current = tonumber(redis.call("GET", key) or "0")\nif current >= max then return -1 end\nlocal n = redis.call("INCR", key)\nif n == 1 then redis.call("EXPIRE", key, ttl) end\nreturn n`,[key],[String(dailyLimit),String(QUOTA_TTL_SECONDS)]));
 if(count===-1)return null;return{key,count,resetDate,dailyLimit};
}
export async function releaseDailyVideoQuota(redis:Redis,key:string):Promise<void>{await (redis as any).eval(`local key = KEYS[1]\nlocal current = tonumber(redis.call("GET", key) or "0")\nif current <= 0 then return 0 end\nlocal next = redis.call("DECR", key)\nif next <= 0 then redis.call("DEL", key) end\nreturn next`,[key],[]);}
export async function withDailyVideoQuota<T>(redis:Redis,userId:string,startGeneration:(reservation:ReservedVideoQuota)=>Promise<T>,dailyLimit:number=MAX_PER_DAY):Promise<{reservation:ReservedVideoQuota;result:T}>{const reservation=await reserveDailyVideoQuota(redis,userId,dailyLimit);if(!reservation)throw new Error(`Quota vidéo atteinte : maximum ${dailyLimit} vidéos par jour.`);try{return{reservation,result:await startGeneration(reservation)}}catch(error){await releaseDailyVideoQuota(redis,reservation.key);throw error}}
