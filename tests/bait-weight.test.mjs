import test from'node:test';import assert from'node:assert/strict';
import{SPECIES,BAITS,rollWeight,roundWeight,formatWeight}from'../game-data.mjs';
import{heldFishSpan}from'../player-view.mjs';
test('all 400 species own positive natural weight and display ranges independent of rarity',()=>{
 for(const s of SPECIES){assert.ok(s.minW>0&&s.maxW>s.minW&&s.displaySpan>0);assert.equal(heldFishSpan(s,s.maxW),s.displaySpan);}
 assert.ok(SPECIES.find(s=>s.name==='Primordial Fry').maxW<.01);assert.ok(SPECIES.find(s=>s.name==='Sperm Whale').maxW>=90000);
 assert.ok(SPECIES.filter(s=>s.island===19&&s.maxW<2).length>=5);
});
test('bait weight caps rise gently, with no raised species maxima or mass eligibility',()=>{
 for(let n=0;n<BAITS.length;n++)assert.equal(BAITS[n].weightBonus,+(n*.012).toFixed(3));
 for(const s of SPECIES)for(const b of [0,1,Math.floor(BAITS.length/2),BAITS.length-1])for(const power of [0,1])for(const penalty of [-.95,0])for(const q of [0,.01,.5,.99,1]){
 const w=rollWeight(s,b,()=>q,power,penalty);assert.ok(w>=s.minW-1e-10&&w<=s.maxW+1e-10);assert.ok(Number.isFinite(w));if(q===1)assert.equal(w,s.maxW);
 }
});
test('better bait rolls slightly larger specimens but never collapses rolls into a hard max plateau',()=>{
 for(const s of SPECIES){let last=0;for(let b=0;b<BAITS.length;b++){const w=rollWeight(s,b,()=>.5);assert.ok(w>last);assert.ok(w<s.maxW);last=w;}assert.ok(rollWeight(s,BAITS.length-1,()=>.99999)<s.maxW);}
});
test('shore luck also reduces weight even for the all-Unfathomable final territory',()=>{
 for(const s of SPECIES.slice(380))assert.ok(rollWeight(s,BAITS.length-1,()=>.5,1,-.95)<rollWeight(s,BAITS.length-1,()=>.5,1));
});
test('millipound catches retain nonzero precision and readable labels',()=>{
 for(const s of SPECIES){const w=roundWeight(rollWeight(s,s.island*2,()=>.33));assert.ok(w>0);assert.ok(Math.abs(w-rollWeight(s,s.island*2,()=>.33))<=.000000501);assert.ok(!/^0(?:\.0+)?$/.test(formatWeight(w)));}
 assert.equal(formatWeight(.001),'0.001');assert.equal(roundWeight(.00123456),.001235);
});
