import test from 'node:test';
import assert from 'node:assert/strict';
import {ISLANDS,islandServices} from '../island-data.mjs';

test('Central Isle is the full service hub and only four outposts buy fish',()=>{
 assert.deepEqual(islandServices(0),['rod','line','bait','market','port']);
 const markets=ISLANDS.filter(i=>islandServices(i.id).includes('market')).map(i=>i.id);
 assert.deepEqual(markets,[0,4,9,13,19]);
});
test('service-free islands remain genuine exploration destinations',()=>{
 const empty=ISLANDS.filter(i=>islandServices(i.id).length===0).map(i=>i.id);
 assert.ok(empty.length>=10,`expected many wild islands, got ${empty.length}`);
});
test('specialist outposts are sparse and keep island identities distinct',()=>{
 assert.deepEqual(islandServices(3),['bait']);assert.deepEqual(islandServices(5),['bait']);
 assert.deepEqual(islandServices(14),['rod','line','bait']);assert.deepEqual(islandServices(10),['rod','line']);
});
