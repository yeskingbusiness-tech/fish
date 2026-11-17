import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,RARITY,RODS,LINES,BAITS,eligibleSpecies,pickSpecies,fishValue,rollWeight} from '../game-data.mjs';
import {ISLANDS,BOATS,xpForLevel,levelForXp,levelProgress,catchXP,gearIsland,travelRequirement} from '../archipelago.mjs';
import {normalizeSave} from '../save-state.mjs';

function rng(seed=52){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

test('six unique islands each own exactly twenty species and four tiers per ladder',()=>{
  assert.equal(SPECIES.length,120);
  assert.equal(new Set(SPECIES.map(s=>s.id)).size,120);
  assert.deepEqual(ISLANDS.map(i=>i.level),[1,5,12,22,35,50]);
  for(const zone of ISLANDS){
    assert.equal(SPECIES.filter(s=>s.island===zone.id).length,20);
    for(const list of [RODS,LINES,BAITS])assert.equal(list.filter((_,i)=>gearIsland(i)===zone.id).length,4);
  }
});

test('144,000 weighted draws obey both island and strict bait limits',()=>{
  const random=rng();
  for(const zone of ISLANDS)for(let b=0;b<BAITS.length;b++){
    const bait=BAITS[b],pool=eligibleSpecies(zone.id,b);
    for(let k=0;k<1000;k++){
      const sp=pickSpecies(zone.id,b,random);
      if(!pool.length){assert.equal(sp,null);continue;}
      assert.ok(pool.includes(sp));assert.equal(sp.island,zone.id);
      assert.ok(RARITY[sp.rarity].tier>=bait.lo&&RARITY[sp.rarity].tier<=bait.hi);
      assert.ok(sp.maxW>=bait.minSize);
    }
  }
});

test('all 120 species are reachable, and every local bait has a valid local pool',()=>{
  for(const sp of SPECIES)assert.ok(BAITS.some((_,b)=>eligibleSpecies(sp.island,b).some(s=>s.id===sp.id)),sp.name);
  for(const zone of ISLANDS)for(let b=zone.id*4;b<zone.id*4+4;b++)assert.ok(eligibleSpecies(zone.id,b).length,`${zone.name} bait ${b}`);
  // The previous island's best bait must work on arrival, so no player is stranded.
  for(const zone of ISLANDS.slice(1))assert.ok(eligibleSpecies(zone.id,zone.id*4-1).length,zone.name);
  assert.equal(pickSpecies(0,23),null,'moonbait must not fall back to a starter fish');
  assert.equal(pickSpecies(5,0),null,'starter worms cannot summon final-island mythics');
  assert.equal(pickSpecies(-1,0),null);assert.equal(pickSpecies(0,999),null);
});

test('gear costs are exact, strictly increasing and stats improve every rung',()=>{
  for(const list of [RODS,LINES,BAITS]){
    assert.equal(list.length,24);assert.equal(list[0].cost,0);
    for(let i=1;i<24;i++)assert.ok(list[i].cost>list[i-1].cost);
  }
  for(let i=1;i<24;i++){
    assert.ok(RODS[i].cast>RODS[i-1].cast);assert.ok(RODS[i].reel>RODS[i-1].reel);assert.ok(RODS[i].tension<RODS[i-1].tension);
    assert.ok(LINES[i].rating>LINES[i-1].rating);assert.ok(LINES[i].strain<LINES[i-1].strain);
  }
  assert.equal(RODS[1].cost,100);assert.equal(LINES[1].cost,80);assert.equal(BAITS[1].cost,140);
});

test('higher islands have progressively better median catch values',()=>{
  let last=0;
  for(const island of ISLANDS){
    const values=SPECIES.filter(sp=>sp.island===island.id).map(sp=>fishValue(sp,(sp.minW+sp.maxW)/2)).sort((a,b)=>a-b);
    const median=(values[9]+values[10])/2;
    assert.ok(median>last,`${island.name}: ${median} <= ${last}`);last=median;
  }
  const random=rng(44);
  for(const sp of SPECIES)for(let b=0;b<24;b++){
    const weight=rollWeight(sp,b,random),value=fishValue(sp,weight);
    assert.ok(weight>=sp.minW&&weight<=sp.maxW);assert.ok(Number.isInteger(value)&&value>0);
  }
});

test('XP boundaries, discovery bonus and maximum level are consistent',()=>{
  for(let level=1;level<=99;level++){
    const xp=xpForLevel(level);
    assert.equal(levelForXp(xp),level);
    if(level>1)assert.equal(levelForXp(xp-1),level-1);
    const p=levelProgress(xp);assert.ok(p.ratio>=0&&p.ratio<=1);
  }
  assert.equal(levelForXp(-50),1);assert.equal(levelForXp(NaN),1);assert.equal(levelForXp(1e10),99);
  for(const sp of SPECIES){assert.ok(catchXP(sp,sp.minW)>0);assert.ok(catchXP(sp,sp.maxW,true)>catchXP(sp,sp.maxW));}
});

test('levels and boat range both gate voyages, with return trips always possible',()=>{
  for(const zone of ISLANDS.slice(1)){
    assert.match(travelRequirement(zone.id,xpForLevel(zone.level)-1,5),/Reach level/);
    assert.match(travelRequirement(zone.id,xpForLevel(zone.level),zone.id-1),/Requires/);
    assert.equal(travelRequirement(zone.id,xpForLevel(zone.level),zone.id),null);
    assert.equal(travelRequirement(0,xpForLevel(zone.level),0),null);
  }
  assert.ok(travelRequirement(999,0,0));
  for(let i=1;i<BOATS.length;i++)assert.ok(BOATS[i].cost>BOATS[i-1].cost&&BOATS[i].speed>BOATS[i-1].speed);
});

test('legacy saves retain coins, owned gear, bag, catches and reveal only known species',()=>{
  const old={coins:4321,caught:42,score:9800,owned:{rod:[0,14],line:[0,12],bait:[0,10]},gear:{rod:14,line:12,bait:10},best:{name:'Rainbow Trout',weight:'4.2'},log:[{n:'Bluegill',w:'1.2'},{n:'Bluegill',w:'1.4'}],bag:[{n:'Bluegill',w:'1.4'},{n:'Pumpkinseed',w:1.1}]};
  const d=normalizeSave(old,true);
  assert.equal(d.coins,4321);assert.equal(d.caught,42);assert.equal(d.score,9800);
  assert.deepEqual(d.gear,old.gear);assert.equal(d.bag.length,2);assert.equal(d.log.length,2);
  assert.ok(levelForXp(d.xp)>=22);assert.equal(d.boat,3);assert.ok(d.ownedBoats.includes(3));
  assert.equal(d.discoveries.bluegill.count,2);assert.equal(d.discoveries.bluegill.best,1.4);
  assert.ok(d.discoveries.pumpkinseed);assert.ok(d.discoveries['rainbow-trout']);
  assert.equal(Object.keys(d.discoveries).length,3);
});

test('discoveries survive selling, log truncation and repeated save loads',()=>{
  const sp=SPECIES[119];
  const data={coins:12000,xp:xpForLevel(50),zone:5,boat:5,ownedBoats:[0,1,5],visited:[0,1,5],discoveries:{[sp.id]:{count:8,best:sp.maxW,first:'2026-11-13'}},bag:[],log:[]};
  const d=normalizeSave(data);
  assert.equal(d.zone,5);assert.equal(d.discoveries[sp.id].count,8);assert.equal(d.bag.length,0);
  const twice=normalizeSave({...data,discoveries:d.discoveries});
  assert.deepEqual(twice.discoveries,d.discoveries);
});

test('malformed saves cannot create invalid gear, fish or locked-island spawns',()=>{
  const d=normalizeSave({coins:-5,xp:'NaN',zone:5,boat:999,ownedBoats:[-1,999],owned:{rod:[-5,99],line:[],bait:['2']},gear:{rod:99,line:30,bait:2},bag:[{n:'Bluegill',w:'NaN'},{n:'not a fish',w:1},null],log:'broken',discoveries:{bluegill:{count:-20,best:Infinity}}});
  assert.deepEqual(d.gear,{rod:0,line:0,bait:0});assert.equal(d.zone,0);assert.equal(d.coins,0);assert.equal(d.xp,0);assert.equal(d.bag.length,0);assert.equal(Object.keys(d.discoveries).length,0);
  for(const input of [null,[],42])assert.equal(normalizeSave(input).zone,0);
});
