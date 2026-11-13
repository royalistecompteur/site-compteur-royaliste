import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const path=name=>new URL('../supabase/migrations/'+name,import.meta.url);
const newDb=async()=>{const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');return db;};
const count=async db=>Number((await db.query('select public.public_count() as n')).rows[0].n);
test('migrations result in aggregate-only private counter',async()=>{
 const db=await newDb();
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort())
  await db.exec(await readFile(path(file),'utf8'));
 assert.equal(await count(db),0);
 assert.equal((await db.query("select to_regclass('private.participations') as p")).rows[0].p,null);
 assert.equal((await db.query("select to_regclass('private.rate_limits') as p")).rows[0].p,null);
 const adds=await Promise.all(Array.from({length:20},()=>db.query('select public.increment_count() as n')));
 assert.equal(adds.length,20);assert.equal(await count(db),20);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await assert.rejects(()=>db.query('select public.public_count()'));
  await assert.rejects(()=>db.query('select public.increment_count()'));
  await assert.rejects(()=>db.query('select * from private.aggregate_count'));
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 assert.equal(await count(db),20);
 await db.query('select public.increment_count()');
 await db.exec('reset role');
 assert.equal(await count(db),21);
 await db.exec('begin');
 await db.query('select public.increment_count()');
 await db.exec('rollback');
 assert.equal(await count(db),21);
 await db.close();
});
test('migration preserves old total but erases identifiable participation rows',async()=>{
 const db=await newDb();
 for(const name of ['001_initial.sql','002_consent_v2.sql','003_resilience.sql'])
  await db.exec(await readFile(path(name),'utf8'));
 await db.query('select public.record_participation($1,$2)',['d'.repeat(64),'2026-11-13-v3']);
 await db.query('select public.record_participation($1,$2)',['e'.repeat(64),'2026-11-13-v3']);
 assert.equal(await count(db),2);
 await db.exec(await readFile(path('004_anonymous_aggregate.sql'),'utf8'));
 assert.equal(await count(db),2);
 assert.equal((await db.query("select to_regclass('private.participations') as p")).rows[0].p,null);
 await db.query('select public.increment_count()');
 assert.equal(await count(db),3);
 await db.close();
});
