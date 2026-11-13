import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,VERSION} from '../server/core.js';
const env={COLLECTION_ENABLED:'true',LEGAL_APPROVED_VERSION:VERSION,SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',HASH_SECRET:'x'.repeat(40),APP_ORIGIN:'https://example.org',LEGAL_CONTROLLER:'Editor',LEGAL_ADDRESS:'Address',LEGAL_EMAIL:'privacy@example.org',LEGAL_PUBLISHER:'Publisher',TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret',CRON_SECRET:'cron'};
async function invoke(handler,action='count',headers={}){
 const result={headers:{}};await handler({method:'GET',query:{action},headers},{setHeader(k,v){result.headers[k]=v;},status(s){result.status=s;return this;},json(body){result.body=body;}});return result;
}
test('concurrent public readers share one database call and use CDN cache headers',async()=>{
 let calls=0;const handler=createHandler(env,async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {ok:true,json:async()=>123};},{cachePublicCount:true});
 const results=await Promise.all(Array.from({length:100},()=>invoke(handler)));
 assert.equal(calls,1);assert.equal(results[0].body.count,123);assert.match(results[0].headers['Vercel-CDN-Cache-Control'],/s-maxage=15/);
 await invoke(handler);assert.equal(calls,1);
 const config=await invoke(handler,'config');assert.equal(config.headers['Vercel-CDN-Cache-Control'],'no-store');
});
test('failures are never cached and subsequent requests recover',async()=>{
 let calls=0;const handler=createHandler(env,async()=>({ok:++calls>1,json:async()=>7}),{cachePublicCount:true});
 const failed=await invoke(handler);assert.equal(failed.status,503);assert.equal(failed.headers['Vercel-CDN-Cache-Control'],'no-store');
 assert.equal((await invoke(handler)).body.count,7);
});
test('invalid database counts are not published',async()=>{
 const h=createHandler(env,async()=>({ok:true,json:async()=>-3}),{cachePublicCount:true});assert.equal((await invoke(h)).status,503);
});
test('maintenance status is private and reports stale cleanup as unavailable',async()=>{
 const h=createHandler(env,async()=>({ok:true,json:async()=>({healthy:false,lastCleanupAt:null})}));
 assert.equal((await invoke(h,'status')).status,401);
 const r=await invoke(h,'status',{authorization:'Bearer cron'});assert.equal(r.status,503);assert.equal(r.headers['Vercel-CDN-Cache-Control'],'no-store');
});
