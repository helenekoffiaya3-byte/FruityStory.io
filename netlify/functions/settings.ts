import type { Handler } from '@netlify/functions';
import { db } from '../../backend/src/db';
import { bearer } from '../../backend/src/auth';

const defaults = { accountPrivate:false, activityStatus:true, profileViews:false, postViews:true, downloads:true, comments:true, mentions:true, directMessages:'friends', duet:true, stitch:true, reuse:true, reposts:true, stories:'friends', sensitiveContent:'standard', personalizedAds:true, pushNotifications:true, language:'fr', theme:'system', dataSaver:false, autoplay:true, location:false, contacts:false, screenTimeLimit:0, filteredKeywords:'', saveSearchHistory:true, postVisibility:'Tout le monde' };
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'Content-Type, Authorization','access-control-allow-methods':'GET,PATCH,OPTIONS'};
const response=(statusCode:number,body:unknown)=>({statusCode,headers,body:JSON.stringify(body)});
async function ensureColumn(){await db().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb");}
export const handler:Handler=async event=>{
  if(event.httpMethod==='OPTIONS') return response(204,{});
  try{
    await ensureColumn();
    const user=bearer(event);
    if(!user) return response(401,{error:'Authentication required'});
    if(event.httpMethod==='GET'){
      const r=await db().query('SELECT settings FROM users WHERE id=$1',[user.id]);
      if(!r.rows[0]) return response(404,{error:'User not found'});
      return response(200,{settings:{...defaults,...(r.rows[0].settings||{})}});
    }
    if(event.httpMethod==='PATCH'){
      let incoming:Record<string,unknown>;
      try{incoming=JSON.parse(event.body||'{}');}catch{return response(400,{error:'Invalid JSON'});}
      if(!incoming||Array.isArray(incoming)||typeof incoming!=='object') return response(400,{error:'Settings object required'});
      const allowed=new Set(Object.keys(defaults)); const patch:Record<string,unknown>={};
      for(const [key,value] of Object.entries(incoming)) if(allowed.has(key)) patch[key]=value;
      const r=await db().query("UPDATE users SET settings=COALESCE(settings,'{}'::jsonb)||$1::jsonb,updated_at=now() WHERE id=$2 RETURNING settings",[JSON.stringify(patch),user.id]);
      if(!r.rows[0]) return response(404,{error:'User not found'});
      return response(200,{settings:{...defaults,...(r.rows[0].settings||{})}});
    }
    return response(405,{error:'Method not allowed'});
  }catch(error:any){console.error('settings API error',error);return response(500,{error:error?.message||'Internal server error'});}
};
