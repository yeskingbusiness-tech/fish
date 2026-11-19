import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, RARITY, BAITS, eligibleSpecies, pickSpecies, rollWeight, effectiveLuck } from '../game-data.mjs';

const pinewater=1;
const baitNamed=name=>BAITS.findIndex(b=>b.name===name);
const ids=fish=>fish.map(sp=>sp.id);
const rarityMatch=(sp,bait)=>RARITY[sp.rarity].tier>=bait.lo&&RARITY[sp.rarity].tier<=bait.hi;
const finalPinewater=SPECIES.find(sp=>sp.number===40);

test('every listed rarity admits every matching local species, regardless of its size',()=>{
  for(let island=0;island<6;island++)for(let bait=0;bait<24;bait++){
    const expected=SPECIES.filter(sp=>sp.island===island&&rarityMatch(sp,BAITS[bait]));
    assert.deepEqual(ids(eligibleSpecies(island,bait)),ids(expected),`${island}/${BAITS[bait].name}`);
  }
  for(const island of [-1,6,NaN,'1'])assert.deepEqual(eligibleSpecies(island,9),[]);
  for(const bait of [-1,24,NaN])assert.deepEqual(eligibleSpecies(1,bait),[]);
});

test('a later bait with the same or wider rarity range can never silently lose eligible species',()=>{
  for(let island=0;island<6;island++)for(let a=0;a<24;a++)for(let b=a+1;b<24;b++){
    if(BAITS[b].lo>BAITS[a].lo||BAITS[b].hi<BAITS[a].hi)continue; // Dropping lower rarities is explicit.
    const old=eligibleSpecies(island,a),next=new Set(eligibleSpecies(island,b));
    for(const sp of old)assert.ok(next.has(sp),`${BAITS[a].name} → ${BAITS[b].name} lost ${sp.id}`);
  }
});

test('Pinewater shows 14 species for Salmon Egg and 15 for every Rare–Legendary Sunscar bait',()=>{
  const salmon=eligibleSpecies(pinewater,baitNamed('Salmon Egg'));
  assert.equal(salmon.length,14);
  for(const name of ['Cheese Cube','Powerbait','Live Minnow']){
    const pool=eligibleSpecies(pinewater,baitNamed(name));
    assert.equal(pool.length,15,name);
    assert.deepEqual(ids(pool.filter(sp=>!salmon.includes(sp))),[finalPinewater.id]);
    for(const sp of salmon)assert.ok(pool.includes(sp),`${name} lost an existing Rare/Epic fish`);
    assert.ok(pool.some(sp=>sp.id==='brown-trout'));
    assert.ok(pool.some(sp=>sp.id==='walleye'));
  }
});

test('#040 stays a return-trip catch: no Pinewater bait or Rare–Epic Dough Ball can hook it',()=>{
  assert.equal(finalPinewater.island,pinewater);assert.equal(finalPinewater.rarity,'legendary');
  for(let bait=0;bait<=8;bait++){
    assert.equal(eligibleSpecies(pinewater,bait).includes(finalPinewater),false);
    for(const power of [0,.5,1])for(const q of [0,.25,.5,.75,.99999])assert.notEqual(pickSpecies(pinewater,bait,()=>q,power),finalPinewater);
  }
  for(const name of ['Cheese Cube','Powerbait','Live Minnow']){
    const bait=baitNamed(name);
    for(const power of [0,.5,1])assert.equal(pickSpecies(pinewater,bait,()=>.99999,power),finalPinewater);
    assert.equal(eligibleSpecies(2,bait).includes(finalPinewater),false,'you must return to Pinewater, not cast in Sunscar');
  }
});

test('all three next-area baits actually draw #040 at finite rare odds, not zero or guaranteed odds',()=>{
  const samples=8192;
  for(const name of ['Cheese Cube','Powerbait','Live Minnow']){
    const bait=baitNamed(name),pool=eligibleSpecies(pinewater,bait),data=BAITS[bait];
    let previous=0;
    for(const power of [0,.5,1]){
      const luck=effectiveLuck(bait,power),weights=pool.map(sp=>sp.weight*(1+luck*2)**(RARITY[sp.rarity].tier-data.lo));
      const expected=weights[pool.indexOf(finalPinewater)]/weights.reduce((a,b)=>a+b,0);
      let catches=0;
      for(let n=0;n<samples;n++)if(pickSpecies(pinewater,bait,()=>(n+.5)/samples,power)===finalPinewater)catches++;
      assert.ok(catches>0&&catches<samples);
      assert.ok(Math.abs(catches/samples-expected)<=1/samples);
      assert.ok(expected>.049&&expected<.08,`${name} at ${power}: ${expected}`);
      assert.ok(expected>previous,'cast luck improves odds without changing eligibility');previous=expected;
    }
  }
});

test('rarity exclusivity and all natural fish weight bounds still hold',()=>{
  assert.equal(pickSpecies(0,23,()=>.999),null,'late Legendary–Mythic bait cannot catch starter Common/Rare fish');
  assert.equal(pickSpecies(5,0,()=>.999),null,'starter Common–Uncommon bait cannot catch endgame Mythics');
  const before=structuredClone(SPECIES);
  for(const sp of SPECIES)for(let bait=0;bait<24;bait++){
    if(!rarityMatch(sp,BAITS[bait]))continue;
    assert.ok(eligibleSpecies(sp.island,bait).includes(sp));
    for(const q of [0,.1,.5,.9,1]){
      const weight=rollWeight(sp,bait,()=>q);
      assert.ok(weight>=sp.minW&&weight<=sp.maxW);
    }
  }
  assert.deepEqual(SPECIES,before,'the eligibility fix must not inflate, renumber or rewrite fish');
});

test('arrival and local-bait pools keep their existing economy and XP pacing',()=>{
  // Frozen v37 rule, only for this regression comparison. All fixed pools used
  // by the price/XP audits already passed that old filter; return-trip bait did not.
  for(let island=0;island<6;island++)for(let bait=Math.max(0,island*4-1);bait<island*4+4;bait++){
    const oldMinimum=Math.round(.9*1.3**bait-.9);
    const old=SPECIES.filter(sp=>sp.island===island&&rarityMatch(sp,BAITS[bait])&&sp.maxW>=oldMinimum);
    assert.deepEqual(ids(eligibleSpecies(island,bait)),ids(old));
  }
});
