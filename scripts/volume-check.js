// Local, synthetic data only. No credentials, network or persistent database.
import {PGlite} from '@electric-sql/pglite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const rows=Number(process.env.VOLUME_ROWS||1000000);
if(!Number.isInteger(rows)||rows<10000||rows>1000000)throw Error('Choose 10000 to 1000000 rows');
await db.exec('create role anon;create role authenticated;create role service_role;');
for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const started=performance.now();
await db.query("insert into private.participations(browser_hash,consent_version) select md5(i::text)||md5(('synthetic-'||i)::text),'2026-11-13-v3' from generate_series(1,$1::integer) i",[rows]);
const insertMs=performance.now()-started;
assert.equal(Number((await db.query('select public.public_count() as n')).rows[0].n),rows);
const bytes=Number((await db.query("select pg_total_relation_size('private.participations') as bytes")).rows[0].bytes);
const times=[];for(let i=0;i<100;i++){const t=performance.now();await db.query('select public.public_count()');times.push(performance.now()-t);}
times.sort((a,b)=>a-b);
await db.exec("update private.participations set expires_at=now()-interval '1 hour' where browser_hash in (select browser_hash from private.participations limit 5000)");
const purgeStart=performance.now();const purge=(await db.query('select public.purge_expired() as result')).rows[0].result;
const purgeMs=performance.now()-purgeStart;
assert.equal(purge.removed,5000);assert.equal(Number((await db.query('select public.public_count() as n')).rows[0].n),rows-5000);
const report={syntheticRows:rows,participationsAndIndexesBytes:bytes,bulkInsertMs:Math.round(insertMs),countReadMedianMs:+times[50].toFixed(2),countReadP95Ms:+times[95].toFixed(2),purge5000Ms:Math.round(purgeMs),counterAfterPurge:rows-5000,limitation:'PGlite local: volume and integrity only; NOT a network or concurrent Supabase/Vercel load test.'};
await writeFile(new URL('../docs/volume-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await db.close();
