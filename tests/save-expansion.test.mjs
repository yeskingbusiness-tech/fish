import test from'node:test';import assert from'node:assert/strict';
import{SPECIES}from'../game-data.mjs';import{SAVE_KEY,SAVE_VERSION,normalizeSave,encodeFish}from'../save-state.mjs';
import{LEGACY_V8_SPECIES}from'../legacy-v8-data.mjs';import{LEGACY_ISLAND_MAP,replacementFor}from'../legacy-catalog.mjs';
import{collectionCoinBonus,xpForLevel}from'../archipelago.mjs';import{dockLocation}from'../navigation.mjs';
const wire=d=>({...d,bag:encodeFish(d.bag),log:encodeFish(d.log)});
test('save v9 uses species IDs, not ambiguous duplicate common names',()=>{
 assert.equal(SAVE_VERSION,9);assert.equal(SAVE_KEY,'reel-deal-save-v9');const fish=SPECIES.filter(s=>['Lake Whitefish','Arctic Grayling','Black Pacu','Atlantic Wolffish'].includes(s.name));
 const d=normalizeSave({version:9,bag:fish.map(s=>({id:s.id,n:s.name,w:s.minW}))});assert.equal(d.bag.length,8);assert.deepEqual(d.bag.map(e=>e.sp.id),fish.map(s=>s.id));assert.deepEqual(normalizeSave(wire(d)),d);
});
test('all 400 tiny and giant weights survive save/roundtrip at six-decimal precision',()=>{
 const bag=SPECIES.map(s=>({id:s.id,n:s.name,w:s.minW})),d=normalizeSave({version:9,bag});assert.equal(d.bag.length,400);assert.ok(d.bag.every(e=>e.weight>0));assert.deepEqual(normalizeSave(wire(d)),d);
});
test('all 120 historic catches and records survive without max-weight clamping or deletion',()=>{
 const raw={version:8,coins:78123,xp:123456,caught:1000,bag:LEGACY_V8_SPECIES.map(s=>({n:s.name,w:s.maxW})),log:LEGACY_V8_SPECIES.map(s=>({n:s.name,w:s.minW})),discoveries:Object.fromEntries(LEGACY_V8_SPECIES.map(s=>[s.id,{count:20,best:s.maxW,first:'2026-11-13'}]))};
 const d=normalizeSave(raw);assert.equal(d.bag.length,120);assert.equal(d.log.length,120);assert.equal(d.coins,raw.coins);assert.equal(d.xp,raw.xp);assert.equal(d.caught,1000);
 for(let n=0;n<120;n++){const old=LEGACY_V8_SPECIES[n];assert.equal(d.bag[n].weight,old.maxW);assert.equal(d.bag[n].sp.id,'legacy-'+old.id);assert.equal(d.discoveries['legacy-'+old.id].best,old.maxW);const next=replacementFor(old);if(next)assert.equal(d.discoveries[next.id].count,20);}
 assert.equal(collectionCoinBonus(d.discoveries,d.completedIslands),30);assert.deepEqual(normalizeSave(wire(d)),d);
});
test('equipment maps by old island identity/rung, with original ownership archived',()=>{
 for(let t=0;t<24;t++){const raw={version:8,owned:{rod:[0,t],line:[0,t],bait:[0,t]},gear:{rod:t,line:t,bait:t}};const d=normalizeSave(raw),mapped=LEGACY_ISLAND_MAP[Math.floor(t/4)]*2+(t%4>=2?1:0);for(const kind of ['rod','line','bait']){assert.equal(d.gear[kind],mapped);assert.ok(d.owned[kind].includes(mapped));assert.ok(d.equipmentArchive[kind].includes(t));}}
});
test('legacy completed-island rewards are preserved even after those catches leave the roster',()=>{
 const fish=LEGACY_V8_SPECIES.filter(s=>s.island===5),d=normalizeSave({version:8,discoveries:Object.fromEntries(fish.map(s=>[s.id,{count:1,best:s.maxW}]))});assert.ok(d.completedIslands.includes(15));assert.equal(collectionCoinBonus(d.discoveries,d.completedIslands),5);
});
test('sailing saves restore only valid water outside locked territory/terrain',()=>{
 const p=dockLocation(0,.85),d=normalizeSave({version:9,sailing:{...p,yaw:.3},coins:1});assert.deepEqual(d.sailing,{...p,yaw:.3});assert.deepEqual(normalizeSave(wire(d)),d);
 for(const p of [{x:99999,z:0,yaw:0},{x:NaN,z:0,yaw:0},{x:390,z:-1040,yaw:0},{x:-390,z:30,yaw:0}])assert.equal(normalizeSave({version:9,sailing:p}).sailing,null);
});
test('malformed saves cannot produce invalid equipped gear, negative money or invalid catches',()=>{
 for(const raw of [null,[],false,'broken',{}])assert.ok(normalizeSave(raw).coins>=0);
 const d=normalizeSave({version:9,coins:-5,xp:NaN,boat:999,ownedBoats:[0,-5,999],gear:{rod:999,bait:-1},bag:[null,{id:'nope',w:1},{id:SPECIES[0].id,w:0},{id:SPECIES[0].id,w:Infinity}]});assert.equal(d.bag.length,0);assert.equal(d.coins,0);assert.equal(d.boat,0);assert.equal(d.gear.rod,0);
});
