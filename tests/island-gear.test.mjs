import test from'node:test';import assert from'node:assert/strict';
import{RODS,LINES,BAITS}from'../game-data.mjs';import{ISLANDS,BOATS,gearIsland,localGearPriceCeiling}from'../archipelago.mjs';
test('two curated upgrades per category in every local shop, not four',()=>{
 for(const i of ISLANDS)for(const list of [RODS,LINES,BAITS]){const items=list.filter((g,n)=>gearIsland(n)===i.id);assert.equal(items.length,2);assert.ok(items.every(g=>g.island===i.id));}
});
test('every upgrade improves stats and island boundaries are noticeably larger',()=>{
 for(let n=1;n<40;n++){
 assert.ok(RODS[n].reel>RODS[n-1].reel);assert.ok(RODS[n].cast>RODS[n-1].cast);assert.ok(LINES[n].rating>LINES[n-1].rating);
 const ratio=RODS[n].power/RODS[n-1].power;assert.ok(ratio>=(n%2?1.17:1.30));assert.ok(LINES[n].control>LINES[n-1].control);
 assert.ok(RODS[n].tension>0&&LINES[n].strain>0);
 }
});
test('prices remain strict, integer and independent of wallet/equipped boat',()=>{
 for(const list of [RODS,LINES,BAITS]){assert.equal(list[0].cost,0);for(let n=1;n<40;n++){assert.ok(Number.isSafeInteger(list[n].cost));assert.ok(list[n].cost>list[n-1].cost);}}
 for(const i of ISLANDS)assert.equal(localGearPriceCeiling(i.id),Math.max(...[RODS,LINES,BAITS].flatMap(list=>list.filter(g=>g.island===i.id).map(g=>g.cost))));
});
test('eight optional vessels vary only in speed, size, styling and price—not access',()=>{
 assert.equal(BOATS.length,8);assert.equal(BOATS[0].cost,0);
 for(const b of BOATS){assert.equal('range'in b,false);assert.equal('level'in b,false);assert.ok(b.size>0&&b.speed>0);if(b.id){assert.ok(b.speed>BOATS[b.id-1].speed);assert.ok(b.size>BOATS[b.id-1].size);assert.ok(b.cost>BOATS[b.id-1].cost);}}
});
