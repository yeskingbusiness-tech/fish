import test from'node:test';import assert from'node:assert/strict';
import{ISLANDS,BOATS,xpForLevel,hasIslandLicense,travelRequirement}from'../archipelago.mjs';
import{normalizeSave}from'../save-state.mjs';
import{LEGACY_ISLAND_MAP}from'../legacy-catalog.mjs';
test('all twenty territory gates unlock exactly at their required level for every boat',()=>{
 for(const i of ISLANDS)for(const b of BOATS){const xp=xpForLevel(i.level);assert.equal(travelRequirement(i.id,xp,b.id),null);if(i.id){assert.equal(hasIslandLicense(i.id,xp-1),false);assert.match(travelRequirement(i.id,xp-1,b.id),new RegExp('level '+i.level));}}
});
test('saved licenses waive only their own level gate; vessel class never gates a territory',()=>{
 for(const i of ISLANDS){assert.equal(travelRequirement(i.id,0,0,[i.id]),null);assert.equal(travelRequirement(i.id,0,7,[i.id]),null);}assert.match(travelRequirement(20,0,7),/Unknown/);
});
test('v8 earned islands remap by identity instead of old numeric position',()=>{
 const d=normalizeSave({version:8,xp:0,licenses:[0,1,2,3,4,5],zone:5,boat:5,ownedBoats:[0,5]});
 assert.deepEqual(d.licenses,[...LEGACY_ISLAND_MAP].sort((a,b)=>a-b));assert.equal(d.zone,15);assert.equal(d.boat,5);assert.equal(d.xp,0);
});
test('v7 and v6 retain old milestone licenses without changing their stored v7 XP',()=>{
 const d=normalizeSave({version:7,xp:xpForLevel(50),coins:725,zone:5,ownedBoats:[0,5],boat:5});assert.equal(d.xp,xpForLevel(50));assert.equal(d.coins,725);assert.equal(d.zone,15);for(const n of LEGACY_ISLAND_MAP)assert.ok(d.licenses.includes(n));
});
test('migration is idempotent and fresh saves do not receive historic licenses',()=>{
 const old=normalizeSave({version:8,xp:3,licenses:[0,5]});assert.deepEqual(normalizeSave(old),old);
 const fresh=normalizeSave({version:9,xp:3,zone:19,licenses:[-1,99,'19'],boat:7,ownedBoats:[0,7]});assert.deepEqual(fresh.licenses,[0]);assert.equal(fresh.zone,0);
});
