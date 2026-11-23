import test from'node:test';import assert from'node:assert/strict';
import{BAITS,SPECIES,RARITY,eligibleSpecies,effectiveLuck,speciesChance,pickSpecies,castLuckModifier}from'../game-data.mjs';
test('the twelve meaningful bait tiers increase luck without repeated micro-upgrades',()=>{
 assert.equal(BAITS.length,12);for(let i=1;i<BAITS.length;i++)assert.ok(BAITS[i].luck>BAITS[i-1].luck);
});
test('cast power adds minus/plus ten percentage points offshore exactly once',()=>{
 assert.equal(castLuckModifier(0),-.1);assert.equal(castLuckModifier(.5),0);assert.equal(castLuckModifier(1),.1);
 for(let i=0;i<BAITS.length;i++)for(const power of [0,.5,1])assert.ok(Math.abs(effectiveLuck(i,power)-(BAITS[i].luck+castLuckModifier(power)))<1e-12);
});
test('shore penalty suppresses the whole luck multiplier, including endgame bait',()=>{
 for(let i=0;i<BAITS.length;i++)for(const power of [0,.5,1])assert.ok(Math.abs((1+effectiveLuck(i,power,-.95))/(1+effectiveLuck(i,power))-.05)<1e-12);
 assert.ok(effectiveLuck(BAITS.length-1,1,-.95)<-.7);
});
test('shore luck reduces the chance of the highest eligible rarity where a bait has a pool',()=>{
 let checked=0;for(let island=0;island<20;island++)for(let b=0;b<BAITS.length;b++){
 const pool=eligibleSpecies(island,b);if(!pool.length)continue;checked++;const top=Math.max(...pool.map(s=>RARITY[s.rarity].tier));
 const chance=penalty=>{const weights=pool.map(s=>speciesChance(s,b,.5,penalty)),total=weights.reduce((a,b)=>a+b,0);assert.ok(weights.every(w=>Number.isFinite(w)&&w>0));return weights.reduce((n,w,i)=>n+(RARITY[pool[i].rarity].tier===top?w/total:0),0);};
 if(new Set(pool.map(s=>s.rarity)).size>1)assert.ok(chance(-.95)<=chance(0));else assert.ok(Math.abs(chance(-.95)-1)<1e-10);
 }assert.ok(checked>20);
});
test('real picker agrees with every eligible weighted probability interval',()=>{
 for(let island=0;island<20;island++)for(let b=0;b<BAITS.length;b++){const pool=eligibleSpecies(island,b);if(!pool.length)continue;const weights=pool.map(s=>speciesChance(s,b,1,0)),total=weights.reduce((a,b)=>a+b,0);let sum=0;
 for(let n=0;n<pool.length;n++){const p=weights[n]/total;if(p>1e-12)assert.equal(pickSpecies(island,b,()=>sum+p/2,1,0),pool[n]);sum+=p;}}
});
test('luck changes no fish definitions, weights, or eligibility',()=>{
 const before=JSON.stringify({SPECIES,BAITS});for(let i=0;i<20;i++)for(let n=0;n<5;n++)pickSpecies(i,n%BAITS.length,()=>n/5,1,-.95);assert.equal(JSON.stringify({SPECIES,BAITS}),before);
});
