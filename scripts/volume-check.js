// Synthetic aggregate increments only; no participant rows, secrets or network.
import {PGlite} from '@electric-sql/pglite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const rows=Number(process.env.VOLUME_ROWS||100000);
if(!Number.isInteger(rows)||rows<10000||rows>1000000)throw Error('Choose 10000 to 1000000 increments');
await db.exec('create role anon;create role authenticated;create role service_role;');
for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort())
 await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const started=performance.now();
// Simulate aggregate writes through a bounded series rather than materializing persons.
await db.query('update private.aggregate_count set total=total+$1 where id=true',[rows]);
const incrementMs=performance.now()-started;
const count=Number((await db.query('select public.public_count() as n')).rows[0].n);
assert.equal(count,rows);
const bytes=Number((await db.query("select pg_total_relation_size('private.aggregate_count') as bytes")).rows[0].bytes);
const times=[];
for(let i=0;i<100;i++){const t=performance.now();await db.query('select public.public_count()');times.push(performance.now()-t);}
times.sort((a,b)=>a-b);
const report={syntheticIncrements:rows,aggregateStorageBytes:bytes,bulkAggregateUpdateMs:Math.round(incrementMs),countReadMedianMs:+times[50].toFixed(2),countReadP95Ms:+times[95].toFixed(2),limitation:'Local aggregated bulk update, not concurrent API load test.'};
await writeFile(new URL('../docs/volume-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));await db.close();
