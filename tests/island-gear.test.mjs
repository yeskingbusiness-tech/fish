import test from 'node:test';
import assert from 'node:assert/strict';
import { RODS, LINES, BAITS, BOAT_COST } from '../game-data.mjs';
import { BOATS, xpForLevel } from '../archipelago.mjs';
import { normalizeSave, SAVE_VERSION, SAVE_KEY } from '../save-state.mjs';

const boundaries=[4,8,12,16,20];
const rodPower=r=>Math.round(r.cast*(r.reel/r.tension)**.6);

test('the starter island keeps its exact prices and fishing stats',()=>{
  assert.deepEqual(RODS.slice(0,4).map(r=>[r.cost,r.cast,r.reel,r.tension]),[
    [0,12,.75,1.55],[100,16,.78,1.46],[160,19,.8,1.37],[260,23,.83,1.29],
  ]);
  assert.deepEqual(LINES.slice(0,4).map(l=>[l.cost,l.rating,l.strain]),[
    [0,3,1.6],[80,6,1.51],[130,10,1.43],[210,15,1.35],
  ]);
  assert.deepEqual(BAITS.slice(0,4).map(b=>[b.cost,b.luck,b.weightBonus]),[
    [0,0,0],[140,.03,.005],[220,.07,.01],[360,.11,.015],
  ]);
});

test('every island-entry rod jumps at least 65% in power and 25% in actual reel speed',()=>{
  for(const i of boundaries){
    const previous=RODS[i-1],next=RODS[i];
    assert.ok(next.cast/previous.cast>=1.30,`${next.name}: reach jump`);
    assert.ok(next.reel/previous.reel>=1.25,`${next.name}: reel jump`);
    assert.ok(next.tension/previous.tension<=.83,`${next.name}: more forgiving control`);
    assert.ok(rodPower(next)/rodPower(previous)>=1.65,`${next.name}: power jump`);
    assert.ok(next.reel/previous.reel>4*(previous.reel/RODS[i-2].reel-1)+1,'a new island must feel different from a local rung');
  }
  for(let i=1;i<24;i++)if(i%4){
    assert.ok(RODS[i].cast>RODS[i-1].cast&&RODS[i].cast-RODS[i-1].cast<=4);
    assert.ok(RODS[i].reel>RODS[i-1].reel&&RODS[i].reel/RODS[i-1].reel<1.06);
    assert.ok(RODS[i].tension<RODS[i-1].tension&&RODS[i].tension/RODS[i-1].tension>.90);
  }
});

test('island-entry lines jump 70–100% in weight rating and at least 16% in strain relief',()=>{
  for(const i of boundaries){
    const previous=LINES[i-1],next=LINES[i];
    assert.ok(next.rating/previous.rating>=1.7&&next.rating/previous.rating<=2);
    assert.ok(next.strain/previous.strain<=.84);
  }
  for(let i=5;i<24;i++)if(i%4){
    assert.ok(LINES[i].rating/LINES[i-1].rating<=1.25,'local line upgrades are smaller than island jumps');
  }
  for(const line of LINES.slice(1))assert.equal(Number(line.name.match(/^([0-9]+)lb /)[1]),line.rating,'line name and charged-for rating must agree');
});

test('the price ladder has one shared boat schedule and exact destination-entry prices',()=>{
  assert.deepEqual(BOATS.map(b=>b.cost),BOAT_COST);
  assert.ok(Object.isFrozen(BOAT_COST));
  for(const [island,entry] of [715,5850,29250,169000,416000].entries()){
    const tier=(island+1)*4;
    for(const list of [RODS,LINES,BAITS])assert.equal(list[tier].cost,entry);
  }
  for(const [kind,list] of [['rod',RODS],['line',LINES],['bait',BAITS]]){
    assert.equal(list.length,24);
    assert.deepEqual(list.map(g=>g.id),Array.from({length:24},(_,i)=>kind+i));
    for(let i=1;i<24;i++)assert.ok(Number.isSafeInteger(list[i].cost)&&list[i].cost>list[i-1].cost);
  }
});

test('already-owned gear gets its new stats without a repurchase, new save key or balance rewrite',()=>{
  const all=Array.from({length:24},(_,i)=>i),licenses=[0,1,2,3,4,5];
  assert.equal(SAVE_VERSION,8);assert.equal(SAVE_KEY,'reel-deal-save-v8');
  for(let tier=0;tier<24;tier++){
    const raw={version:8,coins:4321,xp:xpForLevel(90),caught:77,boat:5,ownedBoats:licenses,zone:5,licenses,
      gear:{rod:tier,line:tier,bait:tier},owned:{rod:all,line:all,bait:all},
      bag:[{n:'Bluegill',w:1.2}],log:[{n:'Bluegill',w:1.2}],best:{name:'Bluegill',weight:'1.2'}};
    const original=structuredClone(raw),saved=normalizeSave(raw);
    assert.deepEqual(raw,original,'normalizing must not rewrite the original save');
    for(const key of ['coins','xp','caught','boat','ownedBoats','zone','licenses','gear','owned','best'])assert.deepEqual(saved[key],raw[key],key);
    assert.equal(saved.bag[0].weight,1.2);assert.equal(saved.log[0].weight,1.2);
    assert.equal(RODS[saved.gear.rod].id,'rod'+tier);assert.equal(LINES[saved.gear.line].id,'line'+tier);assert.equal(BAITS[saved.gear.bait].id,'bait'+tier);
  }
});
