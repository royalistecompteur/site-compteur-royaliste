import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,live,VERSION} from '../server/core.js';
const env={COLLECTION_ENABLED:'true',LEGAL_APPROVED_VERSION:VERSION,SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',APP_ORIGIN:'https://example.org',LEGAL_CONTROLLER:'Éditeur',LEGAL_ADDRESS:'Adresse',LEGAL_EMAIL:'privacy@example.org',LEGAL_PUBLISHER:'Directeur',TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'};
const body={version:VERSION,french:true,adult:true,support:true,first:true,consent:true,token:'test'};
const response=x=>({ok:true,json:async()=>x});
async function call({config=env,action='participate',method='POST',data=body,headers={},fetcher=async()=>{throw Error('Unexpected network');}}={}){
 let status,output;
 const res={setHeader(){},status(s){status=s;return this;},json(d){output=d;}};
 await createHandler(config,fetcher)({method,query:{action},body:data,headers:{origin:env.APP_ORIGIN,'content-type':'application/json',...headers}},res);
 return {status,output};
}
test('collection is closed until approval',async()=>{
 assert.equal(live({}),false);
 assert.equal(live({...env,LEGAL_APPROVED_VERSION:'old'}),false);
 assert.equal((await call({config:{}})).status,503);
});
test('demo has zero and no persistent backend',async()=>{
 assert.deepEqual((await call({config:{},action:'count',method:'GET'})).output,{count:0,demo:true});
});
test('rejects malformed and cross-origin requests',async()=>{
 assert.equal((await call({headers:{origin:'https://evil.example'}})).status,403);
 assert.equal((await call({data:'{'})).status,400);
 assert.equal((await call({data:{...body,token:'a'.repeat(5000)}})).status,413);
 assert.equal((await call({method:'DELETE'})).status,405);
});
test('declarations and version required',async()=>{
 for(const key of ['french','adult','support','first','consent'])
  assert.equal((await call({data:{...body,[key]:'true'}})).status,400);
 assert.equal((await call({data:{...body,version:'old'}})).status,400);
});
test('Turnstile verifies hostname and action',async()=>{
 for(const result of [{success:false},{success:true,hostname:'evil.org',action:'participate'},{success:true,hostname:'example.org',action:'other'}]){
  assert.equal((await call({fetcher:async()=>response(result)})).status,400);
 }
});
test('valid submission increments only aggregate, without browser or IP data',async()=>{
 const calls=[];
 const result=await call({fetcher:async(url,options)=>{
  calls.push({url,body:options.body?.toString()});
  if(url.includes('siteverify'))return response({success:true,hostname:'example.org',action:'participate'});
  assert.match(url,/increment_count/);assert.deepEqual(JSON.parse(options.body),{});
  return response(1);
 }});
 assert.equal(result.status,201);assert.equal(result.output.count,1);
 assert.equal(calls.length,2);
 assert.ok(!JSON.stringify(calls).includes('192.0.2'));
});
test('withdrawal, cleanup and status APIs are removed',async()=>{
 for(const action of ['withdraw','cleanup','status'])assert.equal((await call({action})).status,404);
});
test('database failure never fabricates a count',async()=>{
 assert.equal((await call({action:'count',method:'GET'})).status,503);
});
test('public config does not expose secret',async()=>{
 const result=await call({action:'config',method:'GET'});
 assert.equal(result.output.live,true);assert.equal(JSON.stringify(result.output).includes('secret'),false);
 assert.equal(Object.hasOwn(result.output,'controller'),false);
 assert.equal(Object.hasOwn(result.output,'address'),false);
 assert.equal(Object.hasOwn(result.output,'publisher'),false);
});

test('public API never leaks historical editor metadata, even with sensitive Vercel variables configured',async()=>{
 const r=await call({action:'config',method:'GET',config:{...env,LEGAL_CONTROLLER:'PRIVATE_EDITOR_NAME',LEGAL_ADDRESS:'PRIVATE_HOME_ADDRESS',LEGAL_PUBLISHER:'PRIVATE_PUBLISHER_NAME'}});
 assert.equal(r.status,200);
 for(const value of ['PRIVATE_EDITOR_NAME','PRIVATE_HOME_ADDRESS','PRIVATE_PUBLISHER_NAME'])assert.ok(!JSON.stringify(r.output).includes(value));
});
