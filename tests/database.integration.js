// DANGER: increments cannot be reversed. Run only on a disposable, isolated test project.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rpc} from '../server/core.js';
const enabled=process.env.RUN_DATABASE_TESTS==='isolated';
test('concurrent anonymous increments remain atomic',{skip:!enabled},async()=>{
 const env=process.env;
 const start=await rpc('public_count',{},env);
 const results=await Promise.all(Array.from({length:20},()=>rpc('increment_count',{},env)));
 assert.equal(results.length,20);
 assert.equal(await rpc('public_count',{},env),start+20);
});
