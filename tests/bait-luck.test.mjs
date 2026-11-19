import test from'node:test';import assert from'node:assert/strict';
import{BAITS,SPECIES,RARITY,eligibleSpecies,effectiveLuck,speciesChance,pickSpecies,castLuckModifier}from'../game-data.mjs';
test('fewer bait upgrades have larger luck gaps, especially at island boundaries',()=>{
 for(let i=1;i<40;i++){const gap=BAITS[i].luck-BAITS[i-1].luck;assert.ok(Math.abs(gap-(i%2?.08:.14))<1e-10);assert.ok(BAITS[i].luck>BAITS[i-1].luck);}
});
test('cast power adds minus/plus ten percentage points offshore exactly once',()=>{
 assert.equal(castLuckModifier(0),-.1);assert.equal(castLuckModifier(.5),0);assert.equal(castLuckModifier(1),.1);
 for(let i=0;i<40;i++)for(const power of [0,.5,1])assert.ok(Math.abs(effectiveLuck(i,power)-(BAITS[i].luck+castLuckModifier(power)))<1e-12);
});
test('shore penalty suppresses the whole luck multiplier, even on endgame bait',()=>{
 for(let i=0;i<40;i++)for(const power of [0,.5,1])assert.ok(Math.abs((1+effectiveLuck(i,power,-.95))/(1+effectiveLuck(i,power))-.05)<1e-12);
 assert.ok(effectiveLuck(39,1,-.95)<-.7);
});
test('negative shore luck produces finite positive probabilities and favors common local catches',()=>{
 for(let island=0;island<20;island++){
 const b=island*2,pool=eligibleSpecies(island,b),top=Math.max(...pool.map(s=>RARITY[s.rarity].tier));
 const chance=penalty=>{const weights=pool.map(s=>speciesChance(s,b,.5,penalty)),total=weights.reduce((a,b)=>a+b,0);assert.ok(weights.every(w=>Number.isFinite(w)&&w>0));return weights.reduce((n,w,i)=>n+(RARITY[pool[i].rarity].tier===top?w/total:0),0);};
 if(island<19)assert.ok(chance(-.95)<chance(0));else assert.ok(Math.abs(chance(-.95)-1)<1e-10);
 }
});
test('real picker agrees with each weighted probability interval',()=>{
 for(let island=0;island<20;island++)for(const penalty of [-.95,0]){const b=island*2+1,pool=eligibleSpecies(island,b),weights=pool.map(s=>speciesChance(s,b,1,penalty)),total=weights.reduce((a,b)=>a+b,0);let sum=0;
 for(let n=0;n<pool.length;n++){const p=weights[n]/total;if(p>1e-12)assert.equal(pickSpecies(island,b,()=>sum+p/2,1,penalty),pool[n]);sum+=p;}}
});
test('luck changes no species weights, base definitions, or eligibility',()=>{
 const before=JSON.stringify({SPECIES,BAITS});for(let i=0;i<20;i++)for(let n=0;n<5;n++)pickSpecies(i,i*2,()=>n/5,1,-.95);assert.equal(JSON.stringify({SPECIES,BAITS}),before);
});
