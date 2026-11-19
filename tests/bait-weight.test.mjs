import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, BAITS, rollWeight, eligibleSpecies, pickSpecies } from '../game-data.mjs';
import { SAVE_VERSION, normalizeSave } from '../save-state.mjs';

const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
// Current luck-based roll, before applying the independent weight bonus.
const unboostedWeight = (sp,bait,q) => clamp(sp.minW+(sp.maxW-sp.minW)*Math.pow(q,1/(1+BAITS[bait].luck*1.8)),sp.minW,sp.maxW);

test('bait weight bonuses grow gently and strictly by half a percentage point per tier', () => {
  assert.equal(BAITS[0].weightBonus,0);
  assert.equal(BAITS.at(-1).weightBonus,.115);
  for(let i=1;i<BAITS.length;i++){
    assert.equal(BAITS[i].weightBonus,+(i*.005).toFixed(3));
    assert.ok(BAITS[i].weightBonus>BAITS[i-1].weightBonus);
  }
});

test('starter weights stay unchanged and each roll still consumes exactly one random draw', () => {
  for(const sp of SPECIES)for(const q of [0,.01,.1,.5,.9,.99,1]){
    for(const bait of [0,-1,999])assert.equal(rollWeight(sp,bait,()=>q),unboostedWeight(sp,0,q));
    for(let bait=0;bait<BAITS.length;bait++){
      let calls=0;
      rollWeight(sp,bait,()=>{calls++;return q;});
      assert.equal(calls,1,'weight bonuses must not reroll species or change RNG consumption');
    }
  }
});

test('all species and tiers get a bounded weight boost without exceeding their natural maximum or piling up at it', () => {
  for(const sp of SPECIES)for(const q of [0,.001,.01,.1,.25,.5,.75,.9,.99,.999,1]){
    let last=0;
    for(let bait=0;bait<BAITS.length;bait++){
      const weight=rollWeight(sp,bait,()=>q),old=unboostedWeight(sp,bait,q);
      assert.ok(Number.isFinite(weight)&&weight>=sp.minW&&weight<=sp.maxW,`${sp.name}: invalid weight`);
      assert.ok(weight>=old-1e-9,'the weight bonus must never reduce a luck-based roll');
      assert.ok(weight<=old*(1+BAITS[bait].weightBonus)+1e-9,'the displayed maximum bonus must be truthful');
      assert.ok(weight>=last,'a higher tier cannot roll lighter at the same quantile');
      if(q<1){
        assert.ok(weight<sp.maxW,'nonmaximum rolls must not be hard-clamped to max size');
        if(bait){assert.ok(weight>old);assert.ok(weight>last);}
      }else assert.ok(Math.abs(weight-sp.maxW)<1e-9,'the upper endpoint should remain the species maximum');
      last=weight;
    }
  }
});

test('higher bait tiers increase average displayed catch weight, while individual fish still vary', () => {
  const samples=512;
  for(const sp of SPECIES){
    let previousMean=0;
    for(let bait=0;bait<BAITS.length;bait++){
      let total=0;
      for(let n=0;n<samples;n++)total+=+rollWeight(sp,bait,()=>(n+.5)/samples).toFixed(1);
      const mean=total/samples;
      if(bait){
        assert.ok(mean>previousMean,`${sp.name}, bait ${bait}: no visible average improvement`);
        assert.ok(mean/previousMean<(bait%4===0?1.10:1.06),'island luck improves weights, but never makes a giant weight jump');
      }
      previousMean=mean;
    }
    assert.ok(rollWeight(sp,23,()=>.1)<rollWeight(sp,0,()=>.9),'better bait must not guarantee a larger fish every time');
  }
});

test('weight bonuses never bypass the island, rarity or species-size gates', () => {
  assert.equal(pickSpecies(0,23,()=>.999),null);
  assert.equal(pickSpecies(5,0,()=>.999),null);
  for(let island=0;island<6;island++)for(let bait=0;bait<BAITS.length;bait++){
    const pool=eligibleSpecies(island,bait);
    for(const q of [0,.1,.5,.9,.999]){
      const sp=pickSpecies(island,bait,()=>q);
      if(!pool.length){assert.equal(sp,null);continue;}
      assert.ok(pool.includes(sp));assert.equal(sp.island,island);
      const weight=rollWeight(sp,bait,()=>q);
      assert.ok(weight>=sp.minW&&weight<=sp.maxW);
    }
  }
});

test('a weight upgrade never modifies fish that have already been caught or saved', () => {
  const old={version:SAVE_VERSION,coins:4321,xp:712,caught:2,
    owned:{rod:[0],line:[0],bait:[0,23]},gear:{rod:0,line:0,bait:23},
    bag:[{n:'Bluegill',w:1.2}],log:[{n:'Bluegill',w:1.2}],
    best:{name:'Bluegill',weight:'1.2'},discoveries:{bluegill:{count:2,best:1.2,first:'2026-11-13'}}};
  const saved=normalizeSave(old);
  assert.equal(saved.bag[0].weight,1.2);assert.equal(saved.log[0].weight,1.2);
  assert.equal(saved.best.weight,'1.2');assert.equal(saved.discoveries.bluegill.best,1.2);
  assert.equal(saved.coins,4321);assert.equal(saved.xp,712);assert.equal(saved.caught,2);
});
