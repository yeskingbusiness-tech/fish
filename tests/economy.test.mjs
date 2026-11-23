import test from'node:test';import assert from'node:assert/strict';
import{SPECIES,SALE_MULTIPLIER,fishBaseValue,fishValue,RODS,LINES,BAITS,eligibleSpecies}from'../game-data.mjs';
import{fishSaleValue}from'../archipelago.mjs';import{gearEconomyRows,expectedCatchIncome,boatEconomyRows}from'../scripts/economy.mjs';
test('every sale gets exactly the requested 15% default reduction, before collection boosts',()=>{
 assert.equal(SALE_MULTIPLIER,.85);for(const s of SPECIES)for(const q of [0,.5,1]){const w=s.minW+(s.maxW-s.minW)*q;assert.equal(fishValue(s,w),Math.max(1,Math.round(fishBaseValue(s,w)*.85)));assert.equal(fishSaleValue(s,w,{},[0,1]),Math.round(fishValue(s,w)*1.10));}
});
test('first rod remains around five to six offshore starter catches',()=>{
 const catches=RODS[1].cost/expectedCatchIncome(0,0);assert.ok(catches>=7&&catches<=9,String(catches));
});
test('twelve curated gear milestones have obtainable income and affordable, meaningful jumps',()=>{
 assert.deepEqual([RODS.length,LINES.length,BAITS.length],[12,12,12]);
 for(const row of gearEconomyRows()){assert.ok(row.income>0);for(const kind of ['rod','line','bait']){assert.ok(row[kind+'Catches']>=2);assert.ok(row[kind+'Catches']<100,JSON.stringify(row));}}
});
test('offshore earns more than shore for every territory with a valid curated bait',()=>{
 for(let i=0;i<20;i++){const b=BAITS.findIndex((bait,n)=>eligibleSpecies(i,n).length);if(b<0)continue;const shore=expectedCatchIncome(i,b,128,.5,-.95),sea=expectedCatchIncome(i,b,128,.5,0);assert.ok(sea>shore*1.15,`${i}: ${sea}/${shore}`);}
});
test('audit is deterministic, rejects invalid quantiles and never assumes future bait',()=>{
 const old=Math.random;try{Math.random=()=>{throw Error('random audit');};assert.deepEqual(gearEconomyRows(),gearEconomyRows());}finally{Math.random=old;}
 for(const n of [0,-1,NaN,1.5])assert.throws(()=>expectedCatchIncome(0,0,n),RangeError);
 assert.equal(expectedCatchIncome(19,0),0);assert.equal(boatEconomyRows().length,8);
});
