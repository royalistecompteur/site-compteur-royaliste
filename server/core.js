export const VERSION = '2026-11-13-aggregate-v1';
export const declarations = ['french','adult','support','first','consent'];
export function live(env) {
  return env.COLLECTION_ENABLED === 'true' &&
    env.LEGAL_APPROVED_VERSION === VERSION &&
    ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_ORIGIN','LEGAL_EMAIL','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'].every(k => Boolean(env[k]?.trim()));
}
export function validBody(body) {
  return body && body.version === VERSION &&
    declarations.every(k => body[k] === true) &&
    typeof body.token === 'string' && body.token.length > 0 && body.token.length <= 2048;
}
export async function rpc(name,args,env,fetcher=fetch) {
  const response = await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`},
    body:JSON.stringify(args),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok) throw new Error('Database unavailable');
  return response.json();
}
export async function robot(token,env,fetcher=fetch) {
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return false;
  const result=await response.json();
  return result.success===true && result.hostname===new URL(env.APP_ORIGIN).hostname && result.action==='participate';
}
export function createHandler(env=process.env,fetcher=fetch,{cachePublicCount=false}={}) {
  let countSnapshot,countExpires=0,countPending;
  async function readCount(){
    if(cachePublicCount&&countSnapshot&&Date.now()<countExpires)return countSnapshot;
    if(cachePublicCount&&countPending)return countPending;
    const read=async()=>{
      const count=await rpc('public_count',{},env,fetcher);
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid counter');
      const result={count,demo:false,asOf:new Date().toISOString()};
      if(cachePublicCount){countSnapshot=result;countExpires=Date.now()+5000;}
      return result;
    };
    if(!cachePublicCount)return read();
    countPending=read();
    try{return await countPending;}finally{countPending=undefined;}
  }
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,data)=>res.status(status).json(data);
    const action=req.query?.action;
    try{
      // Only publish the project's dedicated contact address, never editor metadata.
      // Historical LEGAL_CONTROLLER / ADDRESS / PUBLISHER environment values stay server-side.
      if(req.method==='GET'&&action==='config')return send(200,{
        live:live(env),version:VERSION,siteKey:live(env)?env.TURNSTILE_SITE_KEY:null,
        email:env.LEGAL_EMAIL||''
      });
      if(req.method==='GET'&&action==='count'){
        if(!live(env))return send(200,{count:0,demo:true});
        const snapshot=await readCount();
        if(cachePublicCount){
          res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
          res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=15, stale-while-revalidate=30');
        }
        return send(200,snapshot);
      }
      if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Méthode refusée.'});}
      if(action!=='participate')return send(404,{error:'Action inconnue.'});
      if(!live(env))return send(503,{error:'Collecte désactivée : démonstration uniquement.'});
      if(!env.APP_ORIGIN||req.headers.origin!==env.APP_ORIGIN)return send(403,{error:'Origine refusée.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Format refusé.'});
      let body=req.body;
      if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body||{}))>4096)return send(413,{error:'Requête trop volumineuse.'});
      if(typeof body==='string'){try{body=JSON.parse(body);}catch{return send(400,{error:'Requête invalide.'});}}
      if(!validBody(body))return send(400,{error:'Toutes les déclarations et le consentement sont requis.'});
      if(!await robot(body.token,env,fetcher))return send(400,{error:'Vérification anti-robot échouée. Réessayez.'});
      const count=await rpc('increment_count',{},env,fetcher);
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid counter');
      countExpires=0;
      return send(201,{accepted:true,count});
    }catch{return send(503,{error:'Service momentanément indisponible. Un envoi interrompu peut avoir été comptabilisé : ne réessayez pas sans vérifier le compteur.'});}
  };
}
