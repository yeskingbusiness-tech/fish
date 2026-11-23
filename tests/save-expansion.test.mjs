import test from'node:test';import assert from'node:assert/strict';
import{SPECIES}from'../game-data.mjs';import{SAVE_KEY,SAVE_VERSION,normalizeSave,encodeFish}from'../save-state.mjs';
import{LEGACY_V8_SPECIES}from'../legacy-v8-data.mjs';import{LEGACY_ISLAND_MAP,replacementFor}from'../legacy-catalog.mjs';
import{collectionCoinBonus,xpForLevel}from'../archipelago.mjs';import{dockLocation,dockPose,validBoatPose}from'../navigation.mjs';
import{ISLANDS,BOATS}from'../archipelago.mjs';
import{WORLD_LAYOUT_VERSION}from'../island-data.mjs';
import{islandToWorld}from'../island-layout.mjs';
import{V41_ISLAND_ANCHORS}from'../legacy-v41-world.mjs';
import{GEAR_ISLAND_STEPS}from'../game-data.mjs';
const wire=d=>({...d,bag:encodeFish(d.bag),log:encodeFish(d.log)});
test('save v10 uses species IDs, not ambiguous duplicate common names',()=>{
 assert.equal(SAVE_VERSION,10);assert.equal(SAVE_KEY,'reel-deal-save-v10');const fish=SPECIES.filter(s=>['Lake Whitefish','Arctic Grayling','Black Pacu','Atlantic Wolffish'].includes(s.name));
 const d=normalizeSave({version:10,bag:fish.map(s=>({id:s.id,n:s.name,w:s.minW}))});assert.equal(d.bag.length,8);assert.deepEqual(d.bag.map(e=>e.sp.id),fish.map(s=>s.id));assert.deepEqual(normalizeSave(wire(d)),d);
});
test('v9 equipment ownership migrates to the nearest curated tier without losing catches or currency',()=>{
 const oldIsland=14,oldIndex=oldIsland*2+1,newTier=GEAR_ISLAND_STEPS.map((island,n)=>island<=oldIsland?n:-1).filter(n=>n>=0).at(-1);
 const d=normalizeSave({version:9,coins:4567,xp:12345,owned:{rod:[0,oldIndex],line:[0,oldIndex],bait:[0,oldIndex]},gear:{rod:oldIndex,line:oldIndex,bait:oldIndex}});
 assert.equal(d.version,10);assert.equal(d.coins,4567);for(const kind of ['rod','line','bait']){assert.equal(d.gear[kind],newTier);assert.ok(d.owned[kind].includes(newTier));assert.ok(d.equipmentArchive[kind].includes(oldIndex));}
});
test('all 400 tiny and giant weights survive save/roundtrip at six-decimal precision',()=>{
 const bag=SPECIES.map(s=>({id:s.id,n:s.name,w:s.minW})),d=normalizeSave({version:10,bag});assert.equal(d.bag.length,400);assert.ok(d.bag.every(e=>e.weight>0));assert.deepEqual(normalizeSave(wire(d)),d);
});
test('all 120 historic catches and records survive without max-weight clamping or deletion',()=>{
 const raw={version:8,coins:78123,xp:123456,caught:1000,bag:LEGACY_V8_SPECIES.map(s=>({n:s.name,w:s.maxW})),log:LEGACY_V8_SPECIES.map(s=>({n:s.name,w:s.minW})),discoveries:Object.fromEntries(LEGACY_V8_SPECIES.map(s=>[s.id,{count:20,best:s.maxW,first:'2026-11-13'}]))};
 const d=normalizeSave(raw);assert.equal(d.bag.length,120);assert.equal(d.log.length,120);assert.equal(d.coins,raw.coins);assert.equal(d.xp,raw.xp);assert.equal(d.caught,1000);
 for(let n=0;n<120;n++){const old=LEGACY_V8_SPECIES[n];assert.equal(d.bag[n].weight,old.maxW);assert.equal(d.bag[n].sp.id,'legacy-'+old.id);assert.equal(d.discoveries['legacy-'+old.id].best,old.maxW);const next=replacementFor(old);if(next)assert.equal(d.discoveries[next.id].count,20);}
 assert.equal(collectionCoinBonus(d.discoveries,d.completedIslands),30);assert.deepEqual(normalizeSave(wire(d)),d);
});
test('equipment maps by old island identity/rung, with original ownership archived',()=>{
 for(let t=0;t<24;t++){const raw={version:8,owned:{rod:[0,t],line:[0,t],bait:[0,t]},gear:{rod:t,line:t,bait:t}},oldMapped=LEGACY_ISLAND_MAP[Math.floor(t/4)]*2+(t%4>=2?1:0),mapped=GEAR_ISLAND_STEPS.map((island,n)=>island<=Math.floor(oldMapped/2)?n:-1).filter(n=>n>=0).at(-1)||0;const d=normalizeSave(raw);for(const kind of ['rod','line','bait']){assert.equal(d.gear[kind],mapped);assert.ok(d.owned[kind].includes(mapped));assert.ok(d.equipmentArchive[kind].includes(t));}}
});
test('legacy completed-island rewards are preserved even after those catches leave the roster',()=>{
 const fish=LEGACY_V8_SPECIES.filter(s=>s.island===5),d=normalizeSave({version:8,discoveries:Object.fromEntries(fish.map(s=>[s.id,{count:1,best:s.maxW}]))});assert.ok(d.completedIslands.includes(15));assert.equal(collectionCoinBonus(d.discoveries,d.completedIslands),5);
});
test('sailing saves restore only valid water outside locked territory/terrain',()=>{
 const p=dockLocation(0,.85),d=normalizeSave({version:10,worldLayout:WORLD_LAYOUT_VERSION,sailing:{...p,yaw:.3},coins:1});assert.deepEqual(d.sailing,{...p,yaw:.3});assert.deepEqual(normalizeSave(wire(d)),d);
 for(const p of [{x:99999,z:0,yaw:0},{x:NaN,z:0,yaw:0},dockPose(19,.85),{...islandToWorld(ISLANDS[0],0,30),yaw:0}])assert.equal(normalizeSave({version:10,worldLayout:WORLD_LAYOUT_VERSION,sailing:p}).sailing,null);
});
test('malformed saves cannot produce invalid equipped gear, negative money or invalid catches',()=>{
 for(const raw of [null,[],false,'broken',{}])assert.ok(normalizeSave(raw).coins>=0);
 const d=normalizeSave({version:10,coins:-5,xp:NaN,boat:999,ownedBoats:[0,-5,999],gear:{rod:999,bait:-1},bag:[null,{id:'nope',w:1},{id:SPECIES[0].id,w:0},{id:SPECIES[0].id,w:Infinity}]});assert.equal(d.bag.length,0);assert.equal(d.coins,0);assert.equal(d.boat,0);assert.equal(d.gear.rod,0);
});
test('parked boats survive ashore saves at all twenty islands independently of player location',()=>{
 for(const i of ISLANDS)for(const b of BOATS){const parked={...islandToWorld(i,0,-130),yaw:1.23},raw={version:10,worldLayout:WORLD_LAYOUT_VERSION,boat:b.id,ownedBoats:[b.id],zone:0,xp:xpForLevel(400),boatPosition:parked};const d=normalizeSave(raw);assert.equal(d.zone,0);assert.equal(d.sailing,null);assert.deepEqual(d.boatPosition,parked);assert.deepEqual(normalizeSave(wire(d)),d);}
});
test('current-layout sailing saves outside the old bounds restore their actual territory and boat',()=>{
 for(const i of ISLANDS){const pose={...islandToWorld(i,0,-130),yaw:.75},d=normalizeSave({version:10,worldLayout:WORLD_LAYOUT_VERSION,zone:0,xp:xpForLevel(400),sailing:pose});assert.deepEqual(d.sailing,pose);assert.equal(d.zone,i.id);}
});
test('v41 grid positions migrate relative to the correct island, once, without resetting progress',()=>{
 for(const [oldId,newId]of LEGACY_ISLAND_MAP.entries()){const old=V41_ISLAND_ANCHORS[oldId],layout=ISLANDS[newId].layout,local={x:layout.dockX,z:-60},raw={version:7,zone:oldId,coins:1234567,xp:xpForLevel(ISLANDS[newId].level),ownedBoats:[0],boat:0,sailing:{x:old.x+local.x,z:old.z+local.z,yaw:.4}},first=normalizeSave(raw),again=normalizeSave(first);assert.deepEqual(again,first);assert.equal(first.coins,raw.coins);}
});
test('invalid legacy water positions do not unlock future territory',()=>{
 const d=normalizeSave({version:8,zone:19,coins:987,xp:0,sailing:{x:99999,z:99999,yaw:0}});assert.equal(d.zone,0);assert.equal(d.sailing,null);assert.equal(d.coins,987);
});
