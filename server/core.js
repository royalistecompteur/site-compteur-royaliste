import { createHmac } from 'node:crypto';
export const VERSION = '2026-11-13-v3';
export const declarations = ['french', 'adult', 'support', 'first', 'consent'];
export function live(env) {
  return env.COLLECTION_ENABLED === 'true' && env.LEGAL_APPROVED_VERSION === VERSION &&
    ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','HASH_SECRET','APP_ORIGIN','LEGAL_CONTROLLER','LEGAL_ADDRESS','LEGAL_EMAIL','LEGAL_PUBLISHER','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','CRON_SECRET'].every(k => Boolean(env[k]?.trim())) && env.HASH_SECRET.length >= 32;
}
export function digest(value, env) { return createHmac('sha256', env.HASH_SECRET).update(value).digest('hex'); }
export function validBody(body) {
  return body && /^[a-f0-9]{64}$/.test(body.browserId) && body.version === VERSION && declarations.every(k => body[k] === true) && typeof body.token === 'string' && body.token.length > 0 && body.token.length <= 2048;
}
export async function rpc(name, args, env, fetcher = fetch) {
  const response = await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {method:'POST', headers:{'Content-Type':'application/json', apikey:env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}, body:JSON.stringify(args), signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('Database unavailable');
  return response.json();
}
export async function robot(token, env, fetcher = fetch) {
  const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST', body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}), signal:AbortSignal.timeout(8000)});
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === new URL(env.APP_ORIGIN).hostname && result.action === 'participate';
}
export function createHandler(env = process.env, fetcher = fetch, {cachePublicCount = false} = {}) {
  let countSnapshot, countExpires = 0, countPending;
  async function readCount() {
    if (cachePublicCount && countSnapshot && Date.now() < countExpires) return countSnapshot;
    if (cachePublicCount && countPending) return countPending;
    const read = async () => {
      const count = await rpc('public_count',{},env,fetcher);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid counter');
      const result = {count, demo:false, asOf:new Date().toISOString()};
      if (cachePublicCount) {countSnapshot=result;countExpires=Date.now()+5000;}
      return result;
    };
    if (!cachePublicCount) return read();
    countPending=read();
    try {return await countPending;} finally {countPending=undefined;}
  }
  return async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send = (status, data) => res.status(status).json(data);
    const action = req.query?.action;
    try {
      if (req.method === 'GET' && action === 'config') return send(200,{live:live(env),version:VERSION,siteKey:live(env)?env.TURNSTILE_SITE_KEY:null,controller:env.LEGAL_CONTROLLER || 'À renseigner avant ouverture',address:env.LEGAL_ADDRESS || 'À renseigner',email:env.LEGAL_EMAIL || '',publisher:env.LEGAL_PUBLISHER || 'À renseigner'});
      if (req.method === 'GET' && action === 'count') {
        if (!live(env)) return send(200,{count:0,demo:true});
        const snapshot=await readCount();
        if (cachePublicCount) {res.setHeader('Cache-Control','public, max-age=0, must-revalidate');res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=15, stale-while-revalidate=30');}
        return send(200,snapshot);
      }
      if (req.method === 'GET' && ['cleanup','status'].includes(action)) {
        if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) return send(401,{error:'Accès refusé.'});
        if (action === 'status') {const status=await rpc('system_status',{},env,fetcher);return send(status.healthy?200:503,status);}
        const result=await rpc('purge_expired',{},env,fetcher); return send(200,{ok:true,...result});
      }
      if (req.method !== 'POST') {res.setHeader('Allow','GET, POST'); return send(405,{error:'Méthode refusée.'});}
      if (!['participate','withdraw'].includes(action)) return send(404,{error:'Action inconnue.'});
      // Withdrawal remains available when collection is paused.
      if (action === 'participate' && !live(env)) return send(503,{error:'Collecte désactivée : démonstration uniquement.'});
      if (!env.APP_ORIGIN || req.headers.origin !== env.APP_ORIGIN) return send(403,{error:'Origine refusée.'});
      if (!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'Format refusé.'});
      let body = req.body;
      if (Buffer.byteLength(typeof body === 'string'?body:JSON.stringify(body || {})) > 4096) return send(413,{error:'Requête trop volumineuse.'});
      if (typeof body === 'string') {try {body = JSON.parse(body);} catch {return send(400,{error:'Requête invalide.'});}}
      if (!/^[a-f0-9]{64}$/.test(body?.browserId)) return send(400,{error:'Code privé invalide.'});
      if (action === 'participate' && !validBody(body)) return send(400,{error:'Toutes les déclarations et le consentement sont requis.'});
      // Vercel overwrites x-forwarded-for. Do not trust this outside Vercel.
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
      if (!ip || env.VERCEL !== '1') return send(503,{error:'Environnement serveur non configuré.'});
      const bucket = digest(`rate:${new Date().toISOString().slice(0,10)}:${ip}`,env);
      const allowed = await rpc('take_rate_slot',{p_key:bucket},env,fetcher);
      if (!allowed) {res.setHeader('Retry-After','600'); return send(429,{error:'Trop de tentatives. Réessayez dans dix minutes.'});}
      const hash = digest(`browser:${body.browserId}`,env);
      if (action === 'withdraw') {const result=await rpc('withdraw_participation',{p_hash:hash},env,fetcher);countExpires=0;return send(200,{ok:true,...result});}
      if (!await robot(body.token,env,fetcher)) return send(400,{error:'Vérification anti-robot échouée. Réessayez.'});
      const result = await rpc('record_participation',{p_hash:hash,p_version:VERSION},env,fetcher);
      countExpires=0;
      return send(result.accepted?201:200,{...result,alreadyRecorded:!result.accepted});
    } catch { return send(503,{error:'Service momentanément indisponible. Réessayez plus tard avec le même code privé.'}); }
  };
}
