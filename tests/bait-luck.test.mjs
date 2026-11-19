import test from 'node:test';
import assert from 'node:assert/strict';
import { BAITS, RARITY, eligibleSpecies, pickSpecies } from '../game-data.mjs';

// Published v28 luck percentages; local gaps keep v29's +1 point improvement.
// v37 adds a distinct island-boundary bonus without changing eligible fish.
const PREVIOUS = [0,2,5,8,11,14,18,22,25,29,33,37,41,45,50,54,58,63,67,72,76,81,85,90];
const WINDOWS = [[0,1],[0,1],[0,2],[1,2],[1,2],[1,3],[1,3],[2,3],[2,3],[2,4],[2,4],[2,4],
  [3,4],[3,4],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5],[4,5],[4,5],[4,5]];
function probabilities(pool,bait,luck){
  const weights=pool.map(sp=>sp.weight*Math.pow(1+luck*2,RARITY[sp.rarity].tier-bait.lo));
  const total=weights.reduce((sum,w)=>sum+w,0);
  return weights.map(w=>w/total);
}

test('bait luck keeps small local upgrades and makes each island boundary a 12–13 point jump', () => {
  const current=BAITS.map(b=>Math.round(b.luck*100));
  assert.deepEqual(current,[0,3,7,11,23,27,32,37,49,54,59,64,77,82,88,93,106,112,117,123,136,142,147,153]);
  for(let i=1;i<BAITS.length;i++){
    assert.equal(current[i],PREVIOUS[i]+i+8*Math.floor(i/4));
    assert.ok(current[i]>PREVIOUS[i]);
    const gap=current[i]-current[i-1];
    if(i%4===0){assert.ok(gap>=12&&gap<=13);assert.ok(gap>=2*(current[i-1]-current[i-2]));}
    else{assert.equal(gap,PREVIOUS[i]-PREVIOUS[i-1]+1);assert.ok(gap>=3&&gap<=6);}
  }
});

test('bait keeps its strict rarity windows and weight bonuses, without a hidden size gate', () => {
  assert.deepEqual(BAITS.map(b=>[b.lo,b.hi]),WINDOWS);
  for(let i=0;i<BAITS.length;i++){
    assert.equal('minSize' in BAITS[i],false);
    assert.equal(BAITS[i].weightBonus,+(i*.005).toFixed(3));
  }
  assert.equal(pickSpecies(0,23),null);
  assert.equal(pickSpecies(5,0),null);
});

test('higher luck actually improves the rarest eligible fish odds instead of only changing a displayed number', () => {
  let improved=0;
  for(let island=0;island<6;island++)for(let i=0;i<BAITS.length;i++){
    const pool=eligibleSpecies(island,i);
    if(!pool.length)continue;
    const bait=BAITS[i],tiers=pool.map(sp=>RARITY[sp.rarity].tier),top=Math.max(...tiers);
    const old=probabilities(pool,bait,PREVIOUS[i]/100),current=probabilities(pool,bait,bait.luck);
    const topChance=p=>p.reduce((sum,chance,n)=>sum+(tiers[n]===top?chance:0),0);
    if(i&&new Set(tiers).size>1){
      assert.ok(topChance(current)>topChance(old),`${island}/${i}: no actual rarity improvement`);
      assert.ok(current.reduce((sum,p,n)=>sum+p*tiers[n],0)>old.reduce((sum,p,n)=>sum+p*tiers[n],0));
      improved++;
    }else{
      current.forEach((p,n)=>assert.ok(Math.abs(p-old[n])<1e-12));
    }
  }
  assert.ok(improved>20,'exercise a broad range of island/bait combinations');
});

test('the real fish picker uses the new luck weighting throughout every valid pool', () => {
  for(let island=0;island<6;island++)for(let i=0;i<BAITS.length;i++){
    const pool=eligibleSpecies(island,i);
    if(!pool.length){assert.equal(pickSpecies(island,i,()=>.5),null);continue;}
    const chances=probabilities(pool,BAITS[i],BAITS[i].luck);
    let start=0;
    for(let n=0;n<pool.length;n++){
      const chance=chances[n];
      assert.ok(Number.isFinite(chance)&&chance>0);
      // Sample near both ends as well as the middle of each fish's weighted interval.
      for(const fraction of [.01,.5,.99]){
        assert.equal(pickSpecies(island,i,()=>start+chance*fraction).id,pool[n].id);
      }
      start+=chance;
    }
    assert.ok(Math.abs(start-1)<1e-12);
  }
});

test('luck above 100% stays a bounded modifier, not a guaranteed mythic or a zero-length bite wait', () => {
  const i=BAITS.length-1,bait=BAITS[i],pool=eligibleSpecies(5,i);
  assert.ok(bait.luck>1);
  const chances=probabilities(pool,bait,bait.luck),rarities=new Set();
  let start=0;
  for(let n=0;n<pool.length;n++){
    rarities.add(pickSpecies(5,i,()=>start+chances[n]/2).rarity);
    start+=chances[n];
  }
  assert.deepEqual([...rarities].sort(),['legendary','mythic']);
  // main.js applies this multiplier to the existing 2.4–5.8 second bite interval.
  for(const b of BAITS)for(const charge of [-.1,0,.1]){
    const multiplier=1-(b.luck+charge)*.45;
    assert.ok(multiplier>=.26&&multiplier<=1.05);
    assert.ok(2.4*multiplier>.6,'even full-power top bait keeps a positive, readable bite wait');
  }
});
