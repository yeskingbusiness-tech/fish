import test from'node:test';import assert from'node:assert/strict';
import{SPECIES,BAITS,RARITY,eligibleSpecies,pickSpecies}from'../game-data.mjs';
import{ISLANDS}from'../archipelago.mjs';
test('every one of 800 island/bait pools is exactly island plus rarity, with no size gate',()=>{
 for(const i of ISLANDS)for(const [n,b]of BAITS.entries())assert.deepEqual(eligibleSpecies(i.id,n),SPECIES.filter(s=>s.island===i.id&&RARITY[s.rarity].tier>=b.lo&&RARITY[s.rarity].tier<=b.hi));
});
test('local premium bait never loses smaller species or rarities',()=>{
 for(const i of ISLANDS){const a=eligibleSpecies(i.id,i.id*2),b=eligibleSpecies(i.id,i.id*2+1);assert.equal(a.length,20);assert.deepEqual(a,b);assert.ok(!('minSize'in BAITS[i.id*2]));}
});
test('strict early/late bait exclusivity is never bypassed by cast power or shore luck',()=>{
 for(const power of [0,.5,1])for(const penalty of [-.95,-.5,0])for(const q of [0,.25,.5,.999999,1]){
 assert.equal(pickSpecies(19,0,()=>q,power,penalty),null);assert.equal(pickSpecies(0,39,()=>q,power,penalty),null);
 }
});
test('picker draws only eligible fish for every valid combination, including tiny high-rarity fish',()=>{
 for(const i of ISLANDS)for(let b=0;b<BAITS.length;b++){const list=eligibleSpecies(i.id,b);for(const power of [0,1])for(const penalty of [-.95,0])for(const q of [.001,.5,.9999]){const s=pickSpecies(i.id,b,()=>q,power,penalty);assert.ok(list.length?list.includes(s):s===null);}}
 assert.ok(eligibleSpecies(19,39).some(s=>s.maxW<.01));
});
test('invalid territories and tackle return an empty pool, never a fallback catch',()=>{
 for(const i of [-1,20,NaN,'0',null])assert.deepEqual(eligibleSpecies(i,0),[]);
 for(const b of [-1,40,NaN])assert.equal(pickSpecies(0,b),null);
});
