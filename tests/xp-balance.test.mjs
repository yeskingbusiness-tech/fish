import test from'node:test';import assert from'node:assert/strict';
import{SPECIES,RARITY_ORDER,RARITY}from'../game-data.mjs';
import{ISLANDS,CATCH_XP_BY_RARITY,ISLAND_XP_MULTIPLIERS,CATCH_XP_MULTIPLIER,LEVELING_SPEED_MULTIPLIER,catchXP,legacyCatchXP,xpForLevel}from'../archipelago.mjs';
import{expectedCatchXP,islandProgressionRows}from'../scripts/progression.mjs';import{normalizeSave}from'../save-state.mjs';import{LEGACY_V8_SPECIES}from'../legacy-v8-data.mjs';
test('future catch XP applies the requested 20% level-speed boost on top of the existing 10% reduction',()=>{
 assert.equal(CATCH_XP_MULTIPLIER,.9);
 assert.equal(LEVELING_SPEED_MULTIPLIER,1.2);
 for(const s of SPECIES)for(const q of [0,.1,.5,1]){const weight=s.maxW*q,base=CATCH_XP_BY_RARITY[s.rarity]*ISLAND_XP_MULTIPLIERS[s.island]*(1+.4*q);assert.equal(catchXP(s,weight),Math.round(base*.9*1.2));assert.equal(catchXP(s,weight,true),Math.round(base*1.5*.9*1.2));}
});
test('better rarity gives better XP even when its animal is physically tiny',()=>{
 for(const i of ISLANDS){const groups=RARITY_ORDER.map(r=>SPECIES.filter(s=>s.island===i.id&&s.rarity===r)).filter(g=>g.length);
 for(let n=1;n<groups.length;n++)assert.ok(Math.min(...groups[n].map(s=>catchXP(s,s.minW)))>Math.max(...groups[n-1].map(s=>catchXP(s,s.maxW))));}
});
test('all nineteen level stretches have bounded repeat-catch budgets without discovery jackpots',()=>{
 for(const row of islandProgressionRows().slice(0,-1)){assert.ok(row.local.catches>=35&&row.local.catches<110,JSON.stringify(row));assert.ok(row.arrival.catches<115);}
 assert.equal(islandProgressionRows().at(-1).xpNeeded,0);
});
test('higher bait/cast luck increases repeat XP offshore; shore is slower',()=>{
 for(let i=0;i<20;i++){const a=expectedCatchXP(i,i*2),b=expectedCatchXP(i,i*2+1);assert.ok(b>a);assert.ok(expectedCatchXP(i,i*2+1,{shorePenalty:-.95})<b);assert.ok(expectedCatchXP(i,i*2+1,{castPower:1})>expectedCatchXP(i,i*2+1,{castPower:0}));}
});
test('invalid rewards and audit inputs stay bounded',()=>{
 for(const s of SPECIES){assert.equal(catchXP(s,s.maxW*2),catchXP(s,s.maxW));for(const w of [-1,NaN,Infinity])assert.ok(catchXP(s,w)>0);}
 for(const samples of [0,-1,NaN,1.5])assert.throws(()=>expectedCatchXP(0,0,{samples}),RangeError);assert.equal(expectedCatchXP(19,0),0);
});
test('saved XP and coins remain exact at all 99 old levels; no rewards are applied retroactively',()=>{
 for(let n=1;n<=99;n++){const raw={version:8,xp:xpForLevel(n)+37,coins:12345,caught:200};const d=normalizeSave(raw);assert.equal(d.xp,raw.xp);assert.equal(d.coins,raw.coins);assert.equal(d.caught,raw.caught);assert.deepEqual(normalizeSave(d),d);}
});
test('v6 inference uses the frozen original 120 fish and old formula, not the expansion',()=>{
 const log=LEGACY_V8_SPECIES.map(s=>({n:s.name,w:s.maxW}));
 const expected=LEGACY_V8_SPECIES.reduce((n,s)=>n+Math.round(20+s.island*22+RARITY[s.rarity].tier*6+8),0);
 assert.equal(normalizeSave({log,caught:120,coins:600},true).xp,expected);
 for(const s of LEGACY_V8_SPECIES)assert.equal(legacyCatchXP(s,s.maxW),20+s.island*22+RARITY[s.rarity].tier*6+8);
});
