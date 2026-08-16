import type { Handler } from '@netlify/functions';
import { store, id, currentUser, ensureUser, notify, now } from './api-store';
import { chooseProvider, generateWithProvider } from './api-providers';
import type { Video, Comment, Conversation, Message, Story, Playlist, AiJob, PromoteCampaign, CreditLedger } from './api-types';

const json = (statusCode:number, body:unknown, extra:Record<string,string>={}) => ({ statusCode, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'Content-Type, Authorization, X-User-Id','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS',...extra}, body:JSON.stringify(body) });
const read = async (event:any) => { try { return event.body ? JSON.parse(event.body) : {}; } catch { throw new Error('Invalid JSON'); } };
const parts = (event:any) => (event.path || '').replace(/^.*\/\.netlify\/functions\/api\/?/,'').replace(/^\/api\/?/,'').split('/').filter(Boolean);
const method = (event:any) => event.httpMethod || 'GET';
const me = (event:any) => ensureUser(currentUser(new Headers(event.headers || {})));
const providerError = (e:unknown) => e instanceof Error ? e.message : 'Provider error';

export const handler: Handler = async (event) => {
  if (method(event) === 'OPTIONS') return json(204, {});
  try {
    const user = me(event); const p = parts(event); const m = method(event); const body = await read(event);
    if (!p[0]) return json(200,{ok:true,name:'FruityStory.io API',version:'1.0.0'});

    // AUTH / ACCOUNT
    if (p[0]==='auth') {
      if (m==='GET' && p[1]==='me') return json(200,{user});
      if (m==='POST' && p[1]==='logout') return json(200,{ok:true});
      if (m==='POST' && p[1]==='register') { const u=ensureUser(body.userId||id('user')); return json(201,{user:u}); }
    }
    if (p[0]==='users') {
      if (m==='GET' && p[1] && p[1]!=='me') return json(200,{user:ensureUser(p[1])});
      if (m==='GET' && p[1]==='me') return json(200,{user});
      if (m==='PATCH' && p[1]==='me') { Object.assign(user, {displayName:body.displayName ?? user.displayName, bio:body.bio ?? user.bio, avatarUrl:body.avatarUrl ?? user.avatarUrl}); return json(200,{user}); }
      if (m==='GET' && p[2]==='followers') return json(200,{items:[...store.users.values()].filter(u=>u.id!==p[1] && store.following.get(u.id)?.has(p[1]))});
      if (m==='GET' && p[2]==='following') return json(200,{items:[...(store.following.get(p[1])||[])].map(ensureUser)});
      if (m==='POST' && p[2]==='follow') { ensureUser(p[1]); store.following.get(user.id)!.add(p[1]); user.following++; store.users.get(p[1])!.followers++; notify(p[1],'follow',user.id); return json(200,{following:true}); }
      if (m==='DELETE' && p[2]==='follow') { if(store.following.get(user.id)?.delete(p[1])) {user.following=Math.max(0,user.following-1); const target=store.users.get(p[1]); if(target) target.followers=Math.max(0,target.followers-1);} return json(200,{following:false}); }
      if (m==='POST' && p[2]==='block') return json(200,{blocked:true,userId:p[1]});
      if (m==='DELETE' && p[2]==='block') return json(200,{blocked:false,userId:p[1]});
    }

    // FEEDS / VIDEOS
    if (p[0]==='feed') {
      const list=[...store.videos.values()].filter(v=>v.visibility==='public').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      if(m==='GET') return json(200,{items:list, nextCursor:null});
    }
    if (p[0]==='videos') {
      if(m==='GET' && p[1]) { const v=store.videos.get(p[1]); if(!v) return json(404,{error:'Video not found'}); v.views++; return json(200,{video:v}); }
      if(m==='GET') return json(200,{items:[...store.videos.values()]});
      if(m==='POST') { const v:Video={id:id('video'),authorId:user.id,videoUrl:body.videoUrl,thumbnailUrl:body.thumbnailUrl,caption:body.caption,hashtags:body.hashtags||[],soundId:body.soundId,likes:0,comments:0,shares:0,views:0,visibility:body.visibility||'public',allowComments:body.allowComments!==false,allowDuet:body.allowDuet!==false,allowStitch:body.allowStitch!==false,allowDownload:body.allowDownload===true,createdAt:now()}; store.videos.set(v.id,v); return json(201,{video:v}); }
      if(p[1] && m==='DELETE') { const v=store.videos.get(p[1]); if(!v || v.authorId!==user.id) return json(403,{error:'Not allowed'}); store.videos.delete(p[1]); return json(200,{ok:true}); }
      if(p[1] && p[2]==='like') { const v=store.videos.get(p[1]); if(!v)return json(404,{error:'Video not found'}); if(m==='POST') {v.likes++; notify(v.authorId,'like',user.id,v.id); return json(200,{liked:true,likes:v.likes});} if(m==='DELETE'){v.likes=Math.max(0,v.likes-1);return json(200,{liked:false,likes:v.likes});} }
      if(p[1] && p[2]==='share' && m==='POST'){const v=store.videos.get(p[1]);if(!v)return json(404,{error:'Video not found'});v.shares++;return json(200,{shares:v.shares});}
      if(p[1] && p[2]==='repost' && m==='POST'){const v=store.videos.get(p[1]);if(!v)return json(404,{error:'Video not found'});return json(201,{ok:true,videoId:v.id,repostedBy:user.id});}
      if(p[1] && p[2]==='favorite') return json(200,{favorite:m==='POST'});
      if(p[1] && ['privacy','settings'].includes(p[2]) && m==='PATCH'){const v=store.videos.get(p[1]);if(!v||v.authorId!==user.id)return json(403,{error:'Not allowed'});Object.assign(v,body);return json(200,{video:v});}
      if(p[1] && ['duet','stitch'].includes(p[2]) && m==='POST'){const v=store.videos.get(p[1]);if(!v)return json(404,{error:'Video not found'});if(p[2]==='duet'&&!v.allowDuet)return json(403,{error:'Duet disabled'});if(p[2]==='stitch'&&!v.allowStitch)return json(403,{error:'Stitch disabled'});return json(201,{ok:true,sourceVideoId:v.id,mode:p[2]});}
      if(p[1] && p[2]==='download' && m==='POST'){const v=store.videos.get(p[1]);if(!v||!v.allowDownload)return json(403,{error:'Download disabled'});return json(200,{url:v.videoUrl});}
    }

    // COMMENTS
    if(p[0]==='comments' && p[1]) {
      const c=store.comments.get(p[1]); if(!c)return json(404,{error:'Comment not found'});
      if(p[2]==='like' && m==='POST') return json(200,{liked:true});
      if(p[2]==='reply' && m==='POST'){const r:Comment={id:id('comment'),videoId:c.videoId,authorId:user.id,text:body.text||'',parentId:c.id,likes:0,replies:0,createdAt:now()};store.comments.set(r.id,r);c.replies++;return json(201,{comment:r});}
      if(p[2]==='report' && m==='POST') return json(201,{reported:true});
      if(m==='DELETE'){if(c.authorId!==user.id)return json(403,{error:'Not allowed'});store.comments.delete(c.id);return json(200,{ok:true});}
    }
    if(p[0]==='videos' && p[1] && p[2]==='comments'){
      const v=store.videos.get(p[1]);if(!v)return json(404,{error:'Video not found'});
      if(m==='GET')return json(200,{items:[...store.comments.values()].filter(c=>c.videoId===v.id)});
      if(m==='POST'){if(!v.allowComments)return json(403,{error:'Comments disabled'});const c:Comment={id:id('comment'),videoId:v.id,authorId:user.id,text:body.text||'',parentId:body.parentId,likes:0,replies:0,createdAt:now()};store.comments.set(c.id,c);v.comments++;notify(v.authorId,'comment',user.id,v.id);return json(201,{comment:c});}
    }

    // SEARCH / SOCIAL
    if(p[0]==='search' && m==='GET'){const q=String(event.queryStringParameters?.q||'').toLowerCase();const users=[...store.users.values()].filter(u=>(u.username+u.displayName).toLowerCase().includes(q));const videos=[...store.videos.values()].filter(v=>(v.caption||'').toLowerCase().includes(q)||v.hashtags.some(h=>h.toLowerCase().includes(q)));return json(200,{users,videos,hashtags:[]});}
    if(p[0]==='notifications'){if(m==='GET')return json(200,{items:[...store.notifications.values()].filter(n=>n.userId===user.id)});if(m==='PATCH'&&p[1]){const n=store.notifications.get(p[1]);if(n)n.read=true;return json(200,{ok:true});}}
    if(p[0]==='friends' && m==='GET') return json(200,{items:[...store.following.get(user.id)||[]].map(ensureUser)});
    if(p[0]==='stories') { if(m==='GET')return json(200,{items:[...store.stories.values()].filter(s=>new Date(s.expiresAt)>new Date())}); if(m==='POST'){const s:Story={id:id('story'),authorId:user.id,mediaUrl:body.mediaUrl,caption:body.caption,expiresAt:body.expiresAt||new Date(Date.now()+86400000).toISOString(),viewers:[],createdAt:now()};store.stories.set(s.id,s);return json(201,{story:s});} }
    if(p[0]==='playlists'){if(m==='GET')return json(200,{items:[...store.playlists.values()].filter(x=>x.ownerId===user.id)});if(m==='POST'){const x:Playlist={id:id('playlist'),ownerId:user.id,name:body.name||'Ma playlist',videoIds:body.videoIds||[],visibility:body.visibility||'public',createdAt:now()};store.playlists.set(x.id,x);return json(201,{playlist:x});}}

    // MESSAGES
    if(p[0]==='messages'){
      if(m==='GET'&&!p[1])return json(200,{items:[...store.conversations.values()].filter(c=>c.participantIds.includes(user.id))});
      if(m==='POST'&&!p[1]){const c:Conversation={id:id('conv'),participantIds:[user.id,...(body.participantIds||[])],createdAt:now(),updatedAt:now()};store.conversations.set(c.id,c);return json(201,{conversation:c});}
      if(p[1]&&m==='GET')return json(200,{items:[...store.messages.values()].filter(x=>x.conversationId===p[1])});
      if(p[1]&&m==='POST'){const msg:Message={id:id('msg'),conversationId:p[1],senderId:user.id,text:body.text||'',videoId:body.videoId,createdAt:now()};store.messages.set(msg.id,msg);const c=store.conversations.get(p[1]);if(c)c.updatedAt=now();return json(201,{message:msg});}
    }

    // STUDIO / ANALYTICS
    if(p[0]==='studio' || p[0]==='analytics') { const own=[...store.videos.values()].filter(v=>v.authorId===user.id); if(m==='GET') return json(200,{overview:{videos:own.length,views:own.reduce((a,v)=>a+v.views,0),likes:own.reduce((a,v)=>a+v.likes,0),comments:own.reduce((a,v)=>a+v.comments,0),shares:own.reduce((a,v)=>a+v.shares,0)},content:own,audience:{followers:user.followers},growth:{followers:user.followers}}); }

    // PROMOTE
    if(p[0]==='promote'){if(m==='GET')return json(200,{items:[...store.campaigns.values()].filter(c=>c.userId===user.id)});if(m==='POST'){const c:PromoteCampaign={id:id('campaign'),userId:user.id,videoId:body.videoId,objective:body.objective||'views',audience:body.audience||{},budget:Number(body.budget||0),durationDays:Number(body.durationDays||1),status:'pending',metrics:{views:0,profileViews:0,followers:0,likes:0,comments:0,clicks:0},createdAt:now()};store.campaigns.set(c.id,c);return json(201,{campaign:c});}if(p[1]&&p[2]==='analytics')return json(200,{campaign:store.campaigns.get(p[1]),metrics:store.campaigns.get(p[1])?.metrics||{}});if(p[1]&&m==='PATCH'){const c=store.campaigns.get(p[1]);if(!c||c.userId!==user.id)return json(404,{error:'Campaign not found'});Object.assign(c,body);return json(200,{campaign:c});}}

    // MONETIZATION / PAYMENTS
    if(p[0]==='monetization'){if(p[1]==='eligibility')return json(200,{eligible:false,reason:'Connect production eligibility rules and identity verification'});if(p[1]==='dashboard'||!p[1])return json(200,{balance:0,estimatedRevenue:0,history:[],payouts:[]});if(p[1]==='withdraw'&&m==='POST')return json(501,{error:'Payout provider not configured'});}
    if(p[0]==='payments'){if(m==='GET')return json(200,{configured:Boolean(process.env.PAYMENT_SECRET_KEY),transactions:[]});if(m==='POST'&&p[1]==='checkout')return json(501,{error:'Payment provider adapter not configured'});if(m==='POST'&&p[1]==='webhook')return json(501,{error:'Configure provider-specific signature verification before accepting webhooks'});}

    // CREDITS
    if(p[0]==='credits'){const balance=store.balances.get(user.id)||0;if(m==='GET')return json(200,{balance,history:store.ledger.filter(x=>x.userId===user.id)});if(m==='POST'&&p[1]==='adjust'){const amount=Number(body.amount||0);store.balances.set(user.id,balance+amount);const e:CreditLedger={id:id('credit'),userId:user.id,amount,type:'adjustment',createdAt:now()};store.ledger.push(e);return json(200,{balance:balance+amount,entry:e});}if(m==='POST'&&['reserve','consume','refund'].includes(p[1])){const amount=Math.max(0,Number(body.amount||0));if(p[1]!=='refund'&&balance<amount)return json(402,{error:'Insufficient credits',balance});const delta=p[1]==='refund'?amount:-amount;store.balances.set(user.id,balance+delta);const e:CreditLedger={id:id('credit'),userId:user.id,amount,type:p[1] as any,reference:body.reference,createdAt:now()};store.ledger.push(e);return json(200,{balance:balance+delta,entry:e});}}

    // AI VIDEO
    if(p[0]==='ai-video'){
      if(m==='GET'&&p[1]==='history')return json(200,{items:[...store.aiJobs.values()].filter(j=>j.userId===user.id)});
      if(m==='GET'&&p[1]){const j=store.aiJobs.get(p[1]);if(!j)return json(404,{error:'Job not found'});return json(200,{job:j});}
      if(m==='POST'&&p[1]==='generate'){if(!body.prompt)return json(400,{error:'prompt is required'});const provider=chooseProvider(body.provider);const j:AiJob={id:id('job'),userId:user.id,status:'queued',provider,prompt:body.prompt,duration:body.duration,aspectRatio:body.aspectRatio,createdAt:now(),updatedAt:now()};store.aiJobs.set(j.id,j);try{j.status='processing';j.updatedAt=now();const result=await generateWithProvider(provider,{prompt:body.prompt,duration:body.duration,aspectRatio:body.aspectRatio,imageUrl:body.imageUrl});j.status=result.status;j.outputUrl=result.outputUrl;j.updatedAt=now();return json(202,{job:j});}catch(e){j.status='failed';j.error=providerError(e);j.updatedAt=now();return json(502,{job:j,error:j.error});}}
      if(m==='POST'&&p[1]&&p[2]==='cancel'){const j=store.aiJobs.get(p[1]);if(!j)return json(404,{error:'Job not found'});j.status='cancelled';j.updatedAt=now();return json(200,{job:j});}
    }

    // UPLOADS: returns a controlled placeholder until a storage provider is configured.
    if(p[0]==='uploads'&&m==='POST')return json(501,{error:'Storage adapter not configured. Connect object storage and signed upload URLs before production use.'});
    if(p[0]==='settings'){if(m==='GET')return json(200,{privacy:{},notifications:{},security:{},downloads:{},comments:{},messages:{},mentions:{},blocked:[]});if(m==='PATCH')return json(200,{ok:true,settings:body});}
    if(p[0]==='reports'&&m==='POST')return json(201,{id:id('report'),status:'received'});
    if(p[0]==='moderation'&&m==='POST')return json(200,{allowed:true,reason:null});

    return json(404,{error:'Route not found',route:'/'+p.join('/')});
  } catch(e) { return json(400,{error:providerError(e)}); }
};
