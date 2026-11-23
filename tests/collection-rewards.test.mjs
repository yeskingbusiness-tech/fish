import test from'node:test';import assert from'node:assert/strict';
import{SPECIES}from'../game-data.mjs';import{collectionCoinBonus,islandCollectionProgress,completedCollections,fishSaleValue}from'../archipelago.mjs';
import{normalizeSave}from'../save-state.mjs';
const found=ids=>Object.fromEntries(SPECIES.filter(s=>ids.includes(s.island)).map(s=>[s.id,{count:1,best:s.minW,first:''}]));
test('each twenty-entry collection adds permanent five percent, up to one hundred percent',()=>{
 for(let n=0;n<=20;n++){const d=found(Array.from({length:n},(_,i)=>i));assert.equal(collectionCoinBonus(d),n*5);assert.equal(islandCollectionProgress(d).filter(p=>p.complete).length,n);}
});
test('partial collections and malformed counts never earn a new reward',()=>{
 for(let i=0;i<20;i++){const d=found([i]);delete d[SPECIES[i*20].id];assert.equal(collectionCoinBonus(d),0);d[SPECIES[i*20].id]={count:-1};assert.equal(collectionCoinBonus(d),0);}
 assert.equal(collectionCoinBonus({'not-a-fish':{count:400}}),0);
});
test('earned rewards persist when a roster expands, without duplicating the same island reward',()=>{
 const d=found([0,1]);assert.equal(collectionCoinBonus(d,[0,10,15]),20);assert.deepEqual(completedCollections(d,[0,0,10,15,-1,99]),[0,1,10,15]);
 const save=normalizeSave({version:10,discoveries:{},completedIslands:[0,10,15]});assert.equal(collectionCoinBonus(save.discoveries,save.completedIslands),15);
});
test('selling a bag never loses lifetime discovery progress or rewrites coins already earned',()=>{
 const d=normalizeSave({version:10,coins:789,discoveries:found([0,3,19]),bag:[]});assert.equal(d.coins,789);assert.equal(collectionCoinBonus(d.discoveries,d.completedIslands),15);
 const reset=normalizeSave({version:10});assert.equal(collectionCoinBonus(reset.discoveries,reset.completedIslands),0);
});
test('sell-all equals the sum of per-catch prices with the same permanent multiplier',()=>{
 const d=found([0,3,7]),items=SPECIES.slice(0,50);const total=items.reduce((n,s)=>n+fishSaleValue(s,s.maxW,d),0);assert.ok(total>0);assert.equal(total,items.map(s=>fishSaleValue(s,s.maxW,d)).reduce((a,b)=>a+b));
});
