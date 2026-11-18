import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, fishValue } from '../game-data.mjs';
import { ISLANDS, ISLAND_COLLECTION_BONUS, islandCollectionProgress, collectionCoinBonus, fishSaleValue } from '../archipelago.mjs';
import { normalizeSave, SAVE_VERSION } from '../save-state.mjs';

const discoveriesFor = islands => Object.fromEntries(SPECIES.filter(sp=>islands.includes(sp.island))
  .map(sp=>[sp.id,{count:1,best:sp.minW,first:'2026-11-13'}]));

test('each island requires all twenty distinct landed species, not twenty catches or a nearly full index', () => {
  assert.equal(ISLAND_COLLECTION_BONUS,5);
  assert.equal(collectionCoinBonus(),0);
  for(const island of ISLANDS){
    const fish=SPECIES.filter(sp=>sp.island===island.id),discoveries={};
    for(let n=0;n<fish.length;n++){
      const progress=islandCollectionProgress(discoveries)[island.id];
      assert.deepEqual(progress,{island:island.id,found:n,total:20,complete:false});
      assert.equal(collectionCoinBonus(discoveries),0);
      discoveries[fish[n].id]={count:100,best:fish[n].minW,first:''};
    }
    assert.equal(islandCollectionProgress(discoveries)[island.id].complete,true);
    assert.equal(collectionCoinBonus(discoveries),5);
  }
});

test('all 64 island combinations stack additively in five-point steps, capped at thirty percent', () => {
  for(let mask=0;mask<64;mask++){
    const islands=ISLANDS.filter(i=>mask&(1<<i.id)).map(i=>i.id);
    const discoveries=discoveriesFor(islands);
    assert.equal(collectionCoinBonus(discoveries),islands.length*5);
    assert.deepEqual(islandCollectionProgress(discoveries).filter(p=>p.complete).map(p=>p.island),islands);
  }
  assert.equal(collectionCoinBonus(discoveriesFor(ISLANDS.map(i=>i.id))),30);
});

test('the bonus applies once to every species at any market, using whole-coin prices per fish', () => {
  for(let completed=0;completed<=6;completed++){
    const discoveries=discoveriesFor(ISLANDS.slice(0,completed).map(i=>i.id));
    for(const sp of SPECIES)for(const weight of [sp.minW,(sp.minW+sp.maxW)/2,sp.maxW]){
      const base=fishValue(sp,weight),sale=fishSaleValue(sp,weight,discoveries);
      assert.equal(sale,Math.round(base*(100+completed*5)/100));
      assert.ok(Number.isInteger(sale)&&sale>=base);
      if(!completed)assert.equal(sale,base);
    }
  }
  // A late-island collection also boosts starter fish; it is not a location bonus.
  const sp=SPECIES[0];
  assert.equal(fishSaleValue(sp,sp.maxW,discoveriesFor([5])),fishSaleValue(sp,sp.maxW,discoveriesFor([0])));
});

test('repeated catches, price previews and completion checks cannot award the same island twice', () => {
  const discoveries=discoveriesFor([0,2,5]),original=structuredClone(discoveries);
  const sp=SPECIES[0],expected=fishSaleValue(sp,sp.maxW,discoveries);
  for(let i=0;i<100;i++){
    assert.equal(collectionCoinBonus(discoveries),15);
    assert.equal(fishSaleValue(sp,sp.maxW,discoveries),expected);
  }
  assert.deepEqual(discoveries,original,'reward calculation must not mutate saved progress');
  discoveries[sp.id].count+=1000;
  assert.equal(collectionCoinBonus(discoveries),15);
});

test('existing v8 discoveries automatically retain their bonus through selling, log trimming and reloads', () => {
  const discoveries=discoveriesFor([0,3,5]);
  const old={version:SAVE_VERSION,coins:4321,xp:12345,caught:600,discoveries,
    bag:[{n:'Bluegill',w:'1.2'}],log:[{n:'Bluegill',w:'1.2'}]};
  const restored=normalizeSave(old);
  assert.equal(collectionCoinBonus(restored.discoveries),15);
  assert.equal(restored.coins,4321,'a boost must not multiply the existing wallet');
  assert.equal(restored.xp,12345);
  for(const zone of ISLANDS.map(i=>i.id)){
    const reloaded=normalizeSave({...old,zone,bag:[],log:[],discoveries:restored.discoveries});
    assert.equal(collectionCoinBonus(reloaded.discoveries),15);
    assert.deepEqual(reloaded.discoveries,restored.discoveries);
  }
});

test('older saves reconstructed from caught fish qualify without a new reward flag or save reset', () => {
  const fish=SPECIES.filter(sp=>sp.island===0).map(sp=>({n:sp.name,w:sp.minW}));
  for(const [version,legacy] of [[6,true],[7,false],[8,false]]){
    const restored=normalizeSave({version,coins:8000,caught:20,log:fish,bag:fish},legacy);
    assert.equal(collectionCoinBonus(restored.discoveries),5);
    assert.equal(restored.coins,8000);
    assert.equal(restored.bag.length,20);
  }
});

test('unknown species, invalid counts and fabricated reward fields cannot complete an index', () => {
  const first=SPECIES[0].id;
  for(const count of [undefined,null,0,-1,.5,NaN,Infinity,-Infinity,'not a count']){
    const discoveries=discoveriesFor([0]);
    discoveries[first]={count};
    discoveries['not-a-fish']={count:10000};
    assert.equal(collectionCoinBonus(discoveries),0);
    const restored=normalizeSave({version:SAVE_VERSION,discoveries,coinBonus:30,completedIslands:[0,1,2,3,4,5]});
    assert.equal(collectionCoinBonus(restored.discoveries),0);
  }
  for(const invalid of [null,undefined,[],42])assert.equal(collectionCoinBonus(invalid),0);
});

test('a deliberate fresh-game reset removes discoveries and their rewards, but ordinary saving never does', () => {
  const completed=normalizeSave({version:SAVE_VERSION,discoveries:discoveriesFor(ISLANDS.map(i=>i.id))});
  assert.equal(collectionCoinBonus(completed.discoveries),30);
  const fresh=normalizeSave({version:SAVE_VERSION});
  assert.deepEqual(fresh.discoveries,{});
  assert.equal(collectionCoinBonus(fresh.discoveries),0);
  assert.equal(fresh.coins,0);
});
