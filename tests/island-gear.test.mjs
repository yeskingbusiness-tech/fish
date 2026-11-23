import test from 'node:test';import assert from 'node:assert/strict';
import{RODS,LINES,BAITS,GEAR_ISLAND_STEPS,GEAR_SOURCE_INDICES}from'../game-data.mjs';import{ISLANDS,BOATS,gearIsland,localGearPriceCeiling}from'../archipelago.mjs';
test('equipment is reduced to twelve curated tiers with clear specialist milestones',()=>{
 assert.deepEqual([RODS.length,LINES.length,BAITS.length],[12,12,12]);assert.equal(new Set(GEAR_SOURCE_INDICES).size,12);
 assert.deepEqual(GEAR_ISLAND_STEPS,[0,0,3,5,7,9,10,12,14,16,17,19]);
 for(let n=0;n<12;n++){assert.equal(gearIsland(n),GEAR_ISLAND_STEPS[n]);for(const list of [RODS,LINES,BAITS])assert.equal(list[n].island,gearIsland(n));}
});
test('each tier makes a noticeable improvement while authored names and identities stay distinct',()=>{
 for(const list of [RODS,LINES,BAITS])assert.equal(new Set(list.map(g=>g.id)).size,list.length);
 for(let n=1;n<12;n++){
  assert.ok(RODS[n].cast>RODS[n-1].cast);assert.ok(RODS[n].power>RODS[n-1].power);assert.ok(RODS[n].reel>RODS[n-1].reel);
  assert.ok(LINES[n].rating>LINES[n-1].rating);assert.ok(LINES[n].control>LINES[n-1].control);
  assert.ok(RODS[n].tension>0&&LINES[n].strain>0);
 }
});
test('gear prices rise at curated milestones and remain independent of wallet and boat',()=>{
 for(const list of [RODS,LINES,BAITS]){assert.equal(list[0].cost,0);for(let n=1;n<12;n++){assert.ok(Number.isSafeInteger(list[n].cost));assert.ok(list[n].cost>list[n-1].cost);}}
 for(const i of ISLANDS){const prices=[RODS,LINES,BAITS].flatMap(list=>list.filter(g=>g.island===i.id).map(g=>g.cost));assert.equal(localGearPriceCeiling(i.id),prices.length?Math.max(...prices):0);}
 assert.equal(BOATS.length,8);assert.equal(BOATS[0].cost,0);
});
test('eight optional vessels vary only in speed, size, styling and price—not access',()=>{
 for(const b of BOATS){assert.equal('range'in b,false);assert.equal('level'in b,false);assert.ok(b.size>0&&b.speed>0);if(b.id){assert.ok(b.speed>BOATS[b.id-1].speed);assert.ok(b.size>BOATS[b.id-1].size);assert.ok(b.cost>BOATS[b.id-1].cost);}}
});
