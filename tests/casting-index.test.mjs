import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, BAITS, RARITY, sortFishIndex, castLuckModifier, effectiveLuck, eligibleSpecies, pickSpecies, rollWeight } from '../game-data.mjs';
import { normalizeSave, SAVE_VERSION } from '../save-state.mjs';
import { expectedCatchIncome } from '../scripts/economy.mjs';

const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const chance = (sp,bait,luck) => sp.weight*Math.pow(1+luck*2,RARITY[sp.rarity].tier-bait.lo);

test('the index numbers run 001–120 in island/rarity order without reordering the spawn roster', () => {
  const original=SPECIES.map(sp=>[sp.id,sp.number,sp.island,sp.rarity]);
  const sorted=sortFishIndex();
  assert.notEqual(sorted,SPECIES);assert.equal(sorted.length,120);
  assert.equal(new Set(sorted.map(sp=>sp.id)).size,120);
  assert.deepEqual(sorted.map(sp=>sp.number),Array.from({length:120},(_,i)=>i+1));
  for(let i=1;i<sorted.length;i++){
    const a=sorted[i-1],b=sorted[i];
    assert.ok(a.island<=b.island);
    if(a.island===b.island){
      assert.ok(RARITY[a.rarity].tier<=RARITY[b.rarity].tier);
      if(a.rarity===b.rarity)assert.ok(SPECIES.indexOf(a)<SPECIES.indexOf(b),'rarity ties keep the original roster order');
    }
  }
  for(let island=0;island<6;island++){
    const local=sortFishIndex(SPECIES.filter(sp=>sp.island===island));
    assert.deepEqual(local.map(sp=>sp.number),Array.from({length:20},(_,i)=>island*20+i+1));
  }
  assert.equal(SPECIES[13].id,'yellow-bass');assert.equal(SPECIES[13].number,10);
  assert.equal(SPECIES[9].id,'brown-bullhead');assert.equal(SPECIES[9].number,15);
  assert.deepEqual(SPECIES.map(sp=>[sp.id,sp.number,sp.island,sp.rarity]),original,'rendering must not mutate the roster or change its assigned numbers');
  assert.deepEqual(sortFishIndex([...SPECIES].reverse()),sorted,'ties use authored species order, not input order');
});

test('fresh index ordering is independent of missing, duplicate or obsolete index numbers', () => {
  const expected=sortFishIndex().map(sp=>sp.id);
  const unnumbered=SPECIES.map(({number,...sp})=>sp).reverse();
  assert.deepEqual(sortFishIndex(unnumbered).map(sp=>sp.id),expected);
  for(const numbers of [SPECIES.map((_,i)=>120-i),SPECIES.map(()=>1),SPECIES.map((_,i)=>i+1000)]){
    const old=SPECIES.map((sp,i)=>({...sp,number:numbers[i]})).reverse();
    assert.deepEqual(sortFishIndex(old).map(sp=>sp.id),expected);
  }
});

test('island/discovery filters preserve index ordering without dropping or renumbering fish', () => {
  const all=sortFishIndex();
  for(let island=-1;island<6;island++)for(const filter of ['all','found','missing']){
    const include=sp=>(island<0||sp.island===island)&&(filter==='all'||(filter==='found'?sp.number%3===0:sp.number%3!==0));
    const input=SPECIES.filter(include),numbers=input.map(sp=>sp.number);
    const sorted=sortFishIndex(input);
    assert.deepEqual(sorted,all.filter(include));
    assert.deepEqual(input.map(sp=>sp.number),numbers);
  }
  assert.deepEqual(sortFishIndex([]),[]);
});

test('renumbering keeps all saved discoveries and catches attached to the same species', () => {
  const discoveries=Object.fromEntries(SPECIES.map((sp,i)=>[sp.id,{count:i+1,best:sp.maxW,first:'2026-11-13'}]));
  const fish=SPECIES.map(sp=>({n:sp.name,w:sp.minW}));
  const old={version:SAVE_VERSION,coins:4321,xp:1234,caught:7260,discoveries,bag:fish,log:fish,best:{name:'Yellow Bass',weight:'2.8'}};
  const restored=normalizeSave(old);
  assert.deepEqual(restored.discoveries,discoveries);
  assert.deepEqual(restored.best,old.best);
  for(const key of ['coins','xp','caught'])assert.equal(restored[key],old[key]);
  for(const key of ['bag','log']){
    assert.deepEqual(restored[key].map(e=>[e.sp.id,e.sp.name,e.weight]),SPECIES.map(sp=>[sp.id,sp.name,sp.minW]));
    assert.equal(restored[key].find(e=>e.sp.id==='yellow-bass').sp.number,10);
    assert.equal(restored[key].find(e=>e.sp.id==='brown-bullhead').sp.number,15);
  }
});

test('the published fish roster matches the index numbers, rarity order and weight ranges', () => {
  const roster=readFileSync(new URL('../FISH_ROSTER.md',import.meta.url),'utf8');
  const rows=roster.split('\n').filter(line=>/^\| \d{3} \|/.test(line));
  assert.deepEqual(rows,sortFishIndex().map(sp=>`| ${String(sp.number).padStart(3,'0')} | ${sp.name} | ${sp.rarity} | ${sp.minW}–${sp.maxW} lb |`));
});

test('cast luck is linear from minus ten to plus ten points, with a neutral halfway default', () => {
  for(const [power,bonus] of [[0,-.1],[.25,-.05],[.5,0],[.75,.05],[1,.1]])close(castLuckModifier(power),bonus);
  close(castLuckModifier(),0);
  close(castLuckModifier(-50),-.1);close(castLuckModifier(50),.1);
  for(const invalid of [NaN,Infinity,-Infinity,null,'1'])close(castLuckModifier(invalid),0);
  let previous=-Infinity;
  for(let i=0;i<=1000;i++){
    const bonus=castLuckModifier(i/1000);
    assert.ok(bonus>=-.1&&bonus<=.1&&bonus>previous);previous=bonus;
  }
});

test('the cast modifier adds to bait luck once, works for starter worms, and never mutates bait stats', () => {
  const original=BAITS.map(b=>({...b}));
  for(let bait=0;bait<BAITS.length;bait++){
    close(effectiveLuck(bait,0),BAITS[bait].luck-.1);
    close(effectiveLuck(bait,.5),BAITS[bait].luck);
    close(effectiveLuck(bait,1),BAITS[bait].luck+.1);
    close(effectiveLuck(bait),effectiveLuck(bait,.5));
    // Repeated full casts never stack a permanent luck upgrade.
    close(effectiveLuck(bait,1),BAITS[bait].luck+.1);
  }
  close(effectiveLuck(0,0),-.1);close(effectiveLuck(0,1),.1);
  close(effectiveLuck(23,1),1.63);
  assert.deepEqual(BAITS,original);
});

test('minimum, neutral and maximum casts retain every strict island and bait gate', () => {
  for(let island=0;island<6;island++)for(let bait=0;bait<BAITS.length;bait++){
    const pool=eligibleSpecies(island,bait);
    for(const power of [0,.5,1])for(let q=0;q<100;q++){
      const sp=pickSpecies(island,bait,()=>(q+.5)/100,power);
      if(!pool.length){assert.equal(sp,null);continue;}
      assert.ok(pool.includes(sp));assert.equal(sp.island,island);
      assert.ok(RARITY[sp.rarity].tier>=BAITS[bait].lo&&RARITY[sp.rarity].tier<=BAITS[bait].hi);
      assert.ok(sp.maxW>=BAITS[bait].minSize);
    }
  }
});

test('cast power reweights actual rare-fish odds without adding species, even with zero-luck starter bait', () => {
  for(const [island,baitIndex] of [[0,0],[1,7],[2,11],[3,15],[4,19],[5,23]]){
    const pool=eligibleSpecies(island,baitIndex),bait=BAITS[baitIndex];
    const highest=Math.max(...pool.map(sp=>RARITY[sp.rarity].tier));
    let previous=0;
    for(const power of [0,.5,1]){
      const weights=pool.map(sp=>chance(sp,bait,effectiveLuck(baitIndex,power)));
      const total=weights.reduce((sum,w)=>sum+w,0);
      const top=weights.reduce((sum,w,n)=>sum+(RARITY[pool[n].rarity].tier===highest?w:0),0)/total;
      assert.ok(top>previous&&top<1);previous=top;
      let start=0;
      for(let n=0;n<pool.length;n++){
        assert.ok(weights[n]>0&&Number.isFinite(weights[n]));
        assert.equal(pickSpecies(island,baitIndex,()=>(start+weights[n]/2)/total,power),pool[n]);
        start+=weights[n];
      }
    }
  }
});

test('cast-adjusted weights and bite waits remain valid, while neutral casts preserve the old behavior', () => {
  for(const sp of SPECIES)for(let bait=0;bait<BAITS.length;bait++)for(const q of [0,.1,.5,.99,1]){
    let previous=0;
    for(const power of [0,.5,1]){
      const weight=rollWeight(sp,bait,()=>q,power);
      assert.ok(Number.isFinite(weight)&&weight>=sp.minW&&weight<=sp.maxW);
      assert.ok(weight>=previous-1e-9);previous=weight;
      const waitFactor=1-effectiveLuck(bait,power)*.45;
      assert.ok(waitFactor>=.26&&waitFactor<=1.05);
    }
    assert.equal(rollWeight(sp,bait,()=>q),rollWeight(sp,bait,()=>q,.5));
    assert.equal(pickSpecies(sp.island,bait,()=>q),pickSpecies(sp.island,bait,()=>q,.5));
  }
});

test('the income audit uses cast-adjusted rarity and weight, with separate cached estimates for each charge', () => {
  for(const [island,bait] of [[0,0],[5,23]]){
    const high=expectedCatchIncome(island,bait,128,1);
    const low=expectedCatchIncome(island,bait,128,0);
    const mid=expectedCatchIncome(island,bait,128,.5);
    assert.ok(low<mid&&mid<high);
    assert.equal(expectedCatchIncome(island,bait,128),mid);
    assert.equal(expectedCatchIncome(island,bait,128,1),high);
  }
});
