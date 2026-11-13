// Run only against an isolated, empty Supabase test project with the migration applied.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {rpc,VERSION} from '../server/core.js';
const enabled=process.env.RUN_DATABASE_TESTS==='isolated';
test('concurrent insert, duplicate and withdrawal preserve the counter',{skip:!enabled},async()=>{
 const env=process.env;const hash=randomBytes(32).toString('hex');const extra=Array.from({length:200},()=>randomBytes(32).toString('hex'));await rpc('purge_expired',{},env);const start=await rpc('public_count',{},env);
 try{const results=await Promise.all(Array.from({length:20},()=>rpc('record_participation',{p_hash:hash,p_version:VERSION},env)));
 assert.equal(results.filter(r=>r.accepted).length,1);assert.equal(await rpc('public_count',{},env),start+1);
 await Promise.all(Array.from({length:5},()=>rpc('withdraw_participation',{p_hash:hash},env)));
 assert.equal(await rpc('public_count',{},env),start);
 // Twenty independent requests at a time, then concurrent retries and withdrawals.
 for(let i=0;i<extra.length;i+=20)await Promise.all(extra.slice(i,i+20).map(h=>rpc('record_participation',{p_hash:h,p_version:VERSION},env)));
 assert.equal(await rpc('public_count',{},env),start+extra.length);
 for(let i=0;i<extra.length;i+=20)await Promise.all(extra.slice(i,i+20).map(h=>rpc('withdraw_participation',{p_hash:h},env)));
 assert.equal(await rpc('public_count',{},env),start);
 const key=randomBytes(32).toString('hex');const slots=await Promise.all(Array.from({length:20},()=>rpc('take_rate_slot',{p_key:key},env)));assert.equal(slots.filter(Boolean).length,10);
 }finally{for(const h of [hash,...extra])await rpc('withdraw_participation',{p_hash:h},env);}
});
