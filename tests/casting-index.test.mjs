import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{SPECIES,BAITS,RARITY,formatWeight,formatCatchMass,sortFishIndex,castLuckModifier,pickSpecies,eligibleSpecies}from'../game-data.mjs';
test('catch mass uses ounces for tiny fish, pounds for normal fish and tons for whales',()=>{assert.equal(formatCatchMass(.03),'0.48 oz');assert.equal(formatCatchMass(2.4),'2.4 lb');assert.equal(formatCatchMass(100000),'50 tons');});
test('index is exactly 001–400 island first/commonest first without modifying authored identities',()=>{
 const copy=JSON.stringify(SPECIES),sorted=sortFishIndex();assert.notEqual(sorted,SPECIES);assert.deepEqual(sorted.map(s=>s.number),Array.from({length:400},(_,i)=>i+1));
 for(let n=1;n<400;n++)assert.ok(sorted[n].island>sorted[n-1].island||RARITY[sorted[n].rarity].tier>=RARITY[sorted[n-1].rarity].tier);assert.equal(JSON.stringify(SPECIES),copy);
});
test('index sorting never depends on supplied number labels or filtered discovery state',()=>{
 for(const numbers of [SPECIES.map(()=>1),SPECIES.map((_,n)=>400-n)]){
 const changed=SPECIES.map((s,n)=>({...s,number:numbers[n]}));assert.deepEqual(sortFishIndex(changed.reverse()).map(s=>s.id),SPECIES.map(s=>s.id));}
 for(let i=0;i<20;i++)assert.deepEqual(sortFishIndex(SPECIES.filter(s=>s.island===i)).map(s=>s.number),Array.from({length:20},(_,n)=>i*20+n+1));
});
test('cast modifiers clamp invalid and extreme inputs without touching eligibility',()=>{
 assert.equal(castLuckModifier(NaN),0);assert.equal(castLuckModifier(-100),-.1);assert.equal(castLuckModifier(100),.1);
 for(let i=0;i<20;i++)for(const power of [0,.5,1]){const b=eligibleSpecies(i,0).length?0:eligibleSpecies(i,BAITS.length-1).length?BAITS.length-1:BAITS.findIndex((_,n)=>eligibleSpecies(i,n).length);if(b>=0)assert.ok(eligibleSpecies(i,b).includes(pickSpecies(i,b,()=>.6,power)));}
});
test('fight progress remains independent of distance, charge and shoreline luck',()=>{
 const text=readFileSync(new URL('../main.js',import.meta.url),'utf8');const start=text.indexOf('// Green progress depends'),end=text.indexOf('G.progress = clamp',start),rule=text.slice(start,end);
 assert.match(rule,/dt \* 20 \* 0\.85 \* r2\.reel \/ 1\.45/);assert.doesNotMatch(rule,/castDist|castPower|shorePenalty|shoreLuck/);
 assert.match(text,/G\.castShorePenalty=shoreLuckPenalty\(G\.px,G\.pz\)/);assert.doesNotMatch(text,/function sailTo|function tickVoyage|skipVoyage/);
});

test('published field guide matches every authored number, name, rarity and weight range',()=>{
 const text=readFileSync(new URL('../FISH_ROSTER.md',import.meta.url),'utf8');const rows=text.split('\n').filter(line=>/^\| \d{3} \|/.test(line));assert.equal(rows.length,400);
 for(const [n,sp]of SPECIES.entries())assert.equal(rows[n],`| ${String(sp.number).padStart(3,'0')} | ${sp.name} | ${sp.rarity} | ${formatWeight(sp.minW)}–${formatWeight(sp.maxW)} lb |`);
});
