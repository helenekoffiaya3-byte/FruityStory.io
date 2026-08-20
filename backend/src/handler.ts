import type { Handler } from '@netlify/functions';
import { bearer, checkPassword, hashPassword, signToken } from './auth';
import { db } from './db';
import { addComment, comments, createUser, createVideo, feed, follow, getUser, getUserByLogin, likeVideo, unlikeVideo, unfollow } from './repository';
import { commentSchema, generateSchema, loginSchema, promoteSchema, registerSchema, videoSchema } from './validation';
import { createSubscriptionCheckout, handleStripeWebhook } from './stripe';
import { publicPlans, getPlan, type PlanId } from './stripe-plans';
import { isProfessionalFreeAccount, PROFESSIONAL_FREE_ENTITLEMENTS } from '../../netlify/functions/_lib/professional-free';
import { generateWithProvider, chooseProvider } from '../../netlify/functions/providers';

const response=(statusCode:number,body:unknown,extra:Record<string,string>={})=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'Content-Type, Authorization, Stripe-Signature','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS',...extra},body:JSON.stringify(body)});
const jsonBody=(event:any)=>{try{return event.body?JSON.parse(event.body):{};}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}};
const path=(event:any)=>String(event.path||'').replace(/^.*\/\.netlify\/functions\/backend\/?/,'').replace(/^\/api\/?/,'').split('/').filter(Boolean);
const requireUser=(event:any)=>{const u=bearer(event);if(!u)throw Object.assign(new Error('Authentication required'),{status:401});return u;};

export const handler:Handler=async event=>{
 if(event.httpMethod==='OPTIONS')return response(204,{});
 try{
  const p=path(event), m=event.httpMethod||'GET';
  if(!p.length)return response(200,{ok:true,service:'FruityStory.io production API'});
  if(p[0]==='stripe'&&p[1]==='webhook'&&m==='POST'){
    const signature=event.headers?.['stripe-signature']||event.headers?.['Stripe-Signature'];
    if(!signature)return response(400,{error:'Missing Stripe-Signature'});
    const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):(event.body||'');
    const type=await handleStripeWebhook(raw,signature); return response(200,{received:true,type});
  }
  const body=jsonBody(event);
  if(p[0]==='health') { await db().query('SELECT 1'); return response(200,{ok:true,database:'connected'}); }
  if(p[0]==='auth'&&m==='POST'&&p[1]==='register'){const input=registerSchema.parse(body);const u=await createUser(input.username,input.email,await hashPassword(input.password));return response(201,{user:u,token:signToken({id:u.id,username:u.username})});}
  if(p[0]==='auth'&&m==='POST'&&p[1]==='login'){const input=loginSchema.parse(body);const u=await getUserByLogin(input.login);if(!u||!u.password_hash||!(await checkPassword(input.password,u.password_hash)))return response(401,{error:'Invalid credentials'});return response(200,{user:await getUser(u.id),token:signToken({id:u.id,username:u.username})});}
  if(p[0]==='auth'&&m==='GET'&&p[1]==='me'){const u=requireUser(event);return response(200,{user:await getUser(u.id)});}
  if(p[0]==='subscriptions'){
    if(m==='GET'&&!p[1]) return response(200,{plans:publicPlans()});
    if(m==='GET'&&p[1]==='me'){
      const u=requireUser(event); const user=await getUser(u.id);
      if(isProfessionalFreeAccount(user?.email)) return response(200,{subscription:null,history:[],plan:PROFESSIONAL_FREE_ENTITLEMENTS});
      const r=await db().query('SELECT id,plan_id AS "planId",status,current_period_end AS "currentPeriodEnd",cancel_at_period_end AS "cancelAtPeriodEnd" FROM subscriptions WHERE user_id=$1 ORDER BY updated_at DESC',[u.id]);
      const active=r.rows.find((x:any)=>['active','trialing','past_due'].includes(x.status));
      return response(200,{subscription:active||null,history:r.rows,plan:active?getPlan(active.planId)||null:null});
    }
    if(m==='POST'&&p[1]==='checkout'){
      const u=requireUser(event); const user=await getUser(u.id);
      if(isProfessionalFreeAccount(user?.email)) return response(200,{checkoutUrl:null,sessionId:null,plan:PROFESSIONAL_FREE_ENTITLEMENTS,free:true,message:'Professional account has permanent free access. Stripe checkout is disabled.'});
      const planId=String(body.planId||'') as PlanId;
      if(!getPlan(planId))return response(400,{error:'Invalid planId',allowed:['standard','premium','pro','ultra_pro']});
      const result=await createSubscriptionCheckout(u.id,user?.email,planId);
      return response(200,{checkoutUrl:result.url,sessionId:result.id,plan:result.plan});
    }
    if(m==='POST'&&p[1]==='cancel'){
      const u=requireUser(event); const user=await getUser(u.id);
      if(isProfessionalFreeAccount(user?.email)) return response(200,{ok:true,cancelAtPeriodEnd:false,free:true,message:'Professional account has no Stripe subscription to cancel.'});
      const r=await db().query('SELECT stripe_subscription_id FROM subscriptions WHERE user_id=$1 AND status IN (\'active\',\'trialing\') ORDER BY updated_at DESC LIMIT 1',[u.id]);
      if(!r.rows[0])return response(404,{error:'No active subscription'});
      const { stripe }=await import('./stripe');const sub=await stripe().subscriptions.update(r.rows[0].stripe_subscription_id,{cancel_at_period_end:true});await db().query('UPDATE subscriptions SET cancel_at_period_end=true,updated_at=now() WHERE stripe_subscription_id=$1',[sub.id]);return response(200,{ok:true,cancelAtPeriodEnd:true});
    }
  }
  if(p[0]==='feed'&&m==='GET'){const limit=Math.min(Number(event.queryStringParameters?.limit||20),50);return response(200,{items:await feed(limit,event.queryStringParameters?.cursor)});}
  if(p[0]==='users'&&p[1]&&m==='GET'){const u=await getUser(p[1]);return u?response(200,{user:u}):response(404,{error:'User not found'});}
  if(p[0]==='users'&&p[1]&&p[2]==='follow'){const me=requireUser(event);if(me.id===p[1])return response(400,{error:'Cannot follow yourself'});return response(200,{following:m==='POST'?await follow(me.id,p[1]):!(await unfollow(me.id,p[1]))});}
  if(p[0]==='videos'&&m==='POST'){const u=requireUser(event);const input=videoSchema.parse(body);const client=await db().connect();try{const v=await createVideo(client,u.id,input);if(input.hashtags?.length)for(const h of input.hashtags)await client.query('INSERT INTO video_hashtags(video_id,hashtag) VALUES($1,$2) ON CONFLICT DO NOTHING',[v.id,h.replace(/^#/,'').toLowerCase()]);return response(201,{video:v});}finally{client.release();}}
  if(p[0]==='videos'&&p[1]&&m==='GET'){const r=await db().query('SELECT * FROM videos WHERE id=$1',[p[1]]);if(!r.rows[0])return response(404,{error:'Video not found'});await db().query('UPDATE videos SET views_count=views_count+1 WHERE id=$1',[p[1]]);return response(200,{video:r.rows[0]});}
  if(p[0]==='videos'&&p[1]&&p[2]==='like'){const u=requireUser(event);return response(200,{liked:m==='POST'?await likeVideo(u.id,p[1]):!(await unlikeVideo(u.id,p[1]))});}
  if(p[0]==='videos'&&p[1]&&p[2]==='comments'){if(m==='GET')return response(200,{items:await comments(p[1])});const u=requireUser(event);const input=commentSchema.parse(body);return response(201,{comment:await addComment(u.id,p[1],input.text,input.parentId)});}
  if(p[0]==='search'&&m==='GET'){const q=String(event.queryStringParameters?.q||'').trim();if(!q)return response(200,{users:[],videos:[],hashtags:[]});const term=`%${q}%`;const [users,videos,hashtags]=await Promise.all([db().query('SELECT id,username,display_name AS "displayName",avatar_url AS "avatarUrl",verified FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 LIMIT 20',[term]),db().query('SELECT id,author_id AS "authorId",video_url AS "videoUrl",thumbnail_url AS "thumbnailUrl",caption,views_count AS views,likes_count AS likes,comments_count AS comments,created_at AS "createdAt" FROM videos WHERE caption ILIKE $1 AND visibility=$2 ORDER BY created_at DESC LIMIT 30',[term,'public']),db().query('SELECT DISTINCT hashtag FROM video_hashtags WHERE hashtag ILIKE $1 LIMIT 30',[term])]);return response(200,{users:users.rows,videos:videos.rows,hashtags:hashtags.rows.map(x=>x.hashtag)});}
  if(p[0]==='studio'||p[0]==='analytics'){const u=requireUser(event);const r=await db().query('SELECT COUNT(*)::int videos,COALESCE(SUM(views_count),0)::bigint views,COALESCE(SUM(likes_count),0)::bigint likes,COALESCE(SUM(comments_count),0)::bigint comments,COALESCE(SUM(shares_count),0)::bigint shares FROM videos WHERE author_id=$1',[u.id]);return response(200,{overview:r.rows[0]});}
  if(p[0]==='promote'){const u=requireUser(event);if(m==='POST'){const input=promoteSchema.parse(body);const r=await db().query('INSERT INTO promote_campaigns(user_id,video_id,objective,audience,budget,duration_days) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[u.id,input.videoId,input.objective,input.audience??{},input.budget,input.durationDays]);return response(201,{campaign:r.rows[0]});}const r=await db().query('SELECT * FROM promote_campaigns WHERE user_id=$1 ORDER BY created_at DESC',[u.id]);return response(200,{items:r.rows});}
  if(p[0]==='ai-video'&&m==='POST'&&p[1]==='generate'){const u=requireUser(event);const input=generateSchema.parse(body);const provider=chooseProvider(input.provider);const result=await generateWithProvider(provider,{prompt:input.prompt,duration:input.duration,aspectRatio:input.aspectRatio,imageUrl:input.imageUrl});const r=await db().query('INSERT INTO ai_jobs(user_id,provider,prompt,duration,aspect_ratio,provider_job_id,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[u.id,provider,input.prompt,input.duration??null,input.aspectRatio??'9:16',result.externalId,result.status]);return response(202,{job:r.rows[0],provider,externalId:result.externalId,message:'Video generation started.'});}
  if(p[0]==='ai-video'&&m==='GET'&&p[1]){const u=requireUser(event);const r=await db().query('SELECT * FROM ai_jobs WHERE id=$1 AND user_id=$2',[p[1],u.id]);return r.rows[0]?response(200,{job:r.rows[0]}):response(404,{error:'Job not found'});}
  if(p[0]==='credits'){const u=requireUser(event);const r=await db().query('SELECT COALESCE(SUM(amount),0)::bigint balance FROM credit_ledger WHERE user_id=$1',[u.id]);return response(200,{balance:r.rows[0].balance});}
  if(p[0]==='monetization'){requireUser(event);return response(200,{eligible:false,balance:0,estimatedRevenue:0,history:[],payouts:[],message:'Monetization is disabled.'});}
  if(p[0]==='payments'){requireUser(event);return response(501,{error:'Use /api/subscriptions for Stripe subscriptions.'});}
  if(p[0]==='settings'){const u=requireUser(event);if(m==='GET')return response(200,{user:await getUser(u.id)});return response(501,{error:'Settings persistence endpoint not implemented yet'});}
  return response(404,{error:'Route not found',path:p.join('/')});
 }catch(e:any){const status=e?.status|| (e?.name==='ZodError'?400:500);console.error(e);return response(status,{error:e?.message||'Internal server error'});}
};
