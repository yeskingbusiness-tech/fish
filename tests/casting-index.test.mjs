import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, BAITS, RARITY, sortFishIndex, castLuckModifier, effectiveLuck, eligibleSpecies, pickSpecies, rollWeight } from '../game-data.mjs';
import { expectedCatchIncome } from '../scripts/economy.mjs';

const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const chance = (sp,bait,luck) => sp.weight*Math.pow(1+luck*2,RARITY[sp.rarity].tier-bait.lo);

test('the index groups islands, then sorts common to mythic with stable original numbers', () => {
  const original=SPECIES.map(sp=>[sp.id,sp.number,sp.island,sp.rarity]);
  const sorted=sortFishIndex();
  assert.notEqual(sorted,SPECIES);assert.equal(sorted.length,120);
  assert.equal(new Set(sorted.map(sp=>sp.id)).size,120);
  for(let i=1;i<sorted.length;i++){
    const a=sorted[i-1],b=sorted[i];
    assert.ok(a.island<=b.island);
    if(a.island===b.island){
      assert.ok(RARITY[a.rarity].tier<=RARITY[b.rarity].tier);
      if(a.rarity===b.rarity)assert.ok(a.number<b.number);
    }
  }
  for(let island=0;island<6;island++)assert.equal(sorted.slice(island*20,island*20+20).every(sp=>sp.island===island),true);
  assert.deepEqual(SPECIES.map(sp=>[sp.id,sp.number,sp.island,sp.rarity]),original,'index sorting must not renumber or mutate the species data');
  assert.deepEqual(sortFishIndex([...SPECIES].reverse()),sorted,'ties use stable entry numbers, not input order');
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
  close(effectiveLuck(23,1),1.23);
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
      assert.ok(waitFactor>=.44&&waitFactor<=1.05);
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
