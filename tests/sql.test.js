import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL migration, permissions, atomic counter, expiration and rate limiting',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role;');
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()) await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 const count=async()=>Number((await db.query('select public.public_count() as n')).rows[0].n);
 const add=hash=>db.query('select public.record_participation($1,$2) as result',[hash,'2026-11-13-v3']);
 assert.equal(await count(),0);
 const hash='a'.repeat(64);const results=await Promise.all(Array.from({length:20},()=>add(hash)));
 assert.equal(results.filter(r=>r.rows[0].result.accepted).length,1);assert.equal(await count(),1);
 await assert.rejects(()=>db.query('select public.record_participation($1,$2)',['b'.repeat(64),'2026-11-13-v1']));assert.equal(await count(),1);
 await db.query('select public.withdraw_participation($1)',[hash]);await db.query('select public.withdraw_participation($1)',[hash]);assert.equal(await count(),0);
 await add(hash);await db.exec("update private.participations set expires_at=now()-interval '1 day'; select public.purge_expired();");assert.equal(await count(),0);
 for(let i=1;i<=12;i++){assert.equal((await db.query('select public.take_rate_slot($1) as ok',['key'])).rows[0].ok,i<=10);}
 await db.exec("update private.rate_limits set expires_at=now()-interval '1 second';");assert.equal((await db.query("select public.take_rate_slot('key') as ok")).rows[0].ok,true);
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(()=>db.query('select public.public_count()'));await assert.rejects(()=>add(hash));await assert.rejects(()=>db.query('select * from private.participations'));await db.exec('reset role');}
 await db.exec('set role service_role');assert.equal(await count(),0);await add(hash);assert.equal(await count(),1);await db.exec('reset role');
 await db.exec("update private.maintenance set last_cleanup_at=now()-interval '27 hours'");
 await assert.rejects(()=>add('b'.repeat(64)));
 // Withdrawal must remain possible during a maintenance outage.
 await db.query('select public.withdraw_participation($1)',[hash]);assert.equal(await count(),0);
 await db.exec('select public.purge_expired()');await add(hash);assert.equal(await count(),1);
 await db.exec("insert into private.participations(browser_hash,consent_version,expires_at) select md5(i::text)||md5(i::text),'2026-11-13-v3',now()-interval '1 hour' from generate_series(1,5001) i");
 assert.equal(await count(),5002);
 const first=(await db.query('select public.purge_expired() as result')).rows[0].result;
 assert.equal(first.removed,5000);assert.equal(first.pending,true);assert.equal(await count(),2);
 await db.exec('select public.purge_expired()');assert.equal(await count(),1);
 assert.equal(Number((await db.query('select sum(total) as n from private.counter_buckets')).rows[0].n),1);
 const before=await count();await db.exec('begin');await add('c'.repeat(64));await db.exec('rollback');assert.equal(await count(),before);
 await db.close();
});

test('upgrade preserves existing participations and counters',async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
 for(const name of ['001_initial.sql','002_consent_v2.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.query('select public.record_participation($1,$2)',['d'.repeat(64),'2026-11-13-v2']);
 await db.exec(await readFile(new URL('../supabase/migrations/003_resilience.sql',import.meta.url),'utf8'));
 assert.equal(Number((await db.query('select public.public_count() as n')).rows[0].n),1);
 const retry=(await db.query('select public.record_participation($1,$2)',['d'.repeat(64),'2026-11-13-v3'])).rows[0].record_participation;
 assert.equal(retry.accepted,false);assert.equal(retry.alreadyRecorded,true);assert.equal(retry.count,1);
 await db.query('select public.withdraw_participation($1)',['d'.repeat(64)]);
 assert.equal(Number((await db.query('select public.public_count() as n')).rows[0].n),0);
 await db.close();
});
