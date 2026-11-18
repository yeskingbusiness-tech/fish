import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, RARITY, BAITS, eligibleSpecies, pickSpecies, rollWeight } from '../game-data.mjs';
import {
  ISLANDS, MAX_LEVEL, CATCH_XP_BY_RARITY, ISLAND_XP_MULTIPLIERS,
  catchXP, legacyCatchXP, xpForLevel, levelForXp,
} from '../archipelago.mjs';
import { SAVE_VERSION, SAVE_KEY, normalizeSave } from '../save-state.mjs';
import { expectedCatchXP, islandProgressionRows } from '../scripts/progression.mjs';

const rarityBase = { common:20, uncommon:28, rare:42, epic:64, legendary:100, mythic:155 };
const islandScale = [1,4,5,6,7,9];
const oldGates = [1,5,12,22,35,50];
const originalXP = (sp, weight, isNew=false) => Math.round((20 + 22 * sp.island + 6 * RARITY[sp.rarity].tier + 8 * Math.min(1,weight/sp.maxW)) * (isNew?1.5:1));

test('catch XP scales by rarity and island, with a bounded size bonus and one final rounding', () => {
  assert.deepEqual(CATCH_XP_BY_RARITY,rarityBase);
  assert.deepEqual(ISLAND_XP_MULTIPLIERS,islandScale);
  assert.ok(Object.isFrozen(CATCH_XP_BY_RARITY));assert.ok(Object.isFrozen(ISLAND_XP_MULTIPLIERS));
  for(const sp of SPECIES){
    let last = 0;
    for(let q=0;q<=128;q++){
      const weight = +(sp.minW+(sp.maxW-sp.minW)*q/128).toFixed(1);
      const rarityXP = rarityBase[sp.rarity] * islandScale[sp.island];
      const base = rarityXP + rarityXP * .4 * (weight/sp.maxW);
      const xp = catchXP(sp,weight);
      assert.equal(xp,Math.round(base),sp.name);
      assert.equal(catchXP(sp,weight,true),Math.round(base*1.5),`${sp.name}: discovery rounds once`);
      assert.ok(Number.isInteger(xp) && xp>0 && xp>=last,`${sp.name}: monotonic weight reward`);
      assert.ok(xp>=originalXP(sp,weight),`${sp.name}: no catch reward is nerfed`);
      last = xp;
    }
    assert.ok(catchXP(sp,sp.maxW)>catchXP(sp,sp.minW),sp.name);
    assert.equal(catchXP(sp,sp.maxW*2),catchXP(sp,sp.maxW),'size bonus caps at the species maximum');
    for(const invalid of [-1,NaN,Infinity])assert.equal(catchXP(sp,invalid),rarityBase[sp.rarity]*islandScale[sp.island]);
  }
});

test('higher rarity is worth a substantial upgrade even for a small specimen', () => {
  for(const island of ISLANDS){
    const groups = Object.keys(rarityBase).map(rarity=>SPECIES.filter(sp=>sp.island===island.id&&sp.rarity===rarity)).filter(group=>group.length);
    for(let i=1;i<groups.length;i++){
      const bestLower = Math.max(...groups[i-1].map(sp=>catchXP(sp,sp.maxW)));
      const smallestHigher = Math.min(...groups[i].map(sp=>catchXP(sp,sp.minW)));
      assert.ok(smallestHigher>bestLower,`${island.short}: rarity must matter, not just add six XP`);
    }
    for(const rarity of Object.keys(rarityBase).slice(1)){
      const lower = Object.keys(rarityBase)[RARITY[rarity].tier-1];
      const fish = {island:island.id,rarity,maxW:100};
      assert.ok(catchXP(fish,50)>=1.35*catchXP({...fish,rarity:lower},50));
    }
  }
});

test('starter common XP is unchanged, later island rewards grow, and the level curve/gates stay fixed', () => {
  for(const sp of SPECIES.filter(sp=>sp.island===0&&sp.rarity==='common')){
    for(const weight of [sp.minW,(sp.minW+sp.maxW)/2,sp.maxW])for(const isNew of [false,true]){
      assert.equal(catchXP(sp,weight,isNew),originalXP(sp,weight,isNew));
    }
  }
  for(const rarity of Object.keys(rarityBase))for(let island=1;island<6;island++){
    const sp={rarity,island,maxW:100};
    assert.ok(catchXP(sp,50)>catchXP({...sp,island:island-1},50));
  }
  assert.deepEqual(ISLANDS.map(i=>i.level),[1,10,25,45,65,90]);assert.equal(MAX_LEVEL,99);
  for(let level=1;level<=MAX_LEVEL;level++){
    assert.equal(xpForLevel(level),90*(level-1)+22*(level-1)**2);
    assert.equal(levelForXp(xpForLevel(level)),level);
  }
});

test('Pinewater gains 3–4x repeat XP and level 15 → 25 takes about 37–53 landed catches', () => {
  const row=islandProgressionRows()[1];
  assert.equal(row.xpNeeded,12240);
  assert.ok(row.arrival.xp>=175&&row.arrival.xp<=180);
  assert.ok(row.local.xp>=245&&row.local.xp<=250);
  assert.ok(row.arrival.xp/row.arrival.oldXP>=3);
  assert.ok(row.local.xp/row.local.oldXP>=4);
  const remaining=xpForLevel(25)-xpForLevel(15);
  for(let bait=3;bait<=7;bait++){
    const catches=remaining/expectedCatchXP(1,bait);
    assert.ok(catches>=37&&catches<=53,`${BAITS[bait].name}: ${catches}`);
    assert.ok(eligibleSpecies(1,bait).every(sp=>sp.rarity!=='legendary'),'no inaccessible Golden Koi in the budget');
  }
});

test('every island has a repeat-catch budget without requiring discoveries or future bait', () => {
  const rows=islandProgressionRows();
  assert.deepEqual(rows.map(r=>r.xpNeeded),[2592,12240,31720,49320,86400,37836]);
  for(const row of rows){
    assert.equal(row.arrival.baitIndex,Math.max(0,row.id*4-1));
    assert.equal(row.local.baitIndex,row.id*4+3);
    const [low,high]=row.id===0?[65,105]:row.id===5?[18,25]:[45,100];
    for(let bait=row.arrival.baitIndex;bait<=row.local.baitIndex;bait++){
      const catches=row.xpNeeded/expectedCatchXP(row.id,bait);
      assert.ok(catches>=low&&catches<=high,`${row.island}, ${BAITS[bait].name}: ${catches}`);
    }
    if(row.id>0&&row.id<5){
      assert.ok(row.local.catches<=75,`${row.island}: upgraded local bait stays rewarding`);
      assert.ok(row.arrival.catches<=rows[0].arrival.catches,'later levels do not become hundreds of catches');
    }
    const minimumBoost=[1,3,4,5,8,10][row.id];
    for(const setup of [row.arrival,row.local])assert.ok(setup.xp>=minimumBoost*setup.oldXP);
  }
});

test('all arrival and local bait stays within budget at minimum/full power; upgrades improve average XP', () => {
  for(const row of islandProgressionRows()){
    for(const power of [0,.5,1]){
      let previous=0;
      for(let bait=row.arrival.baitIndex;bait<=row.local.baitIndex;bait++){
        const xp=expectedCatchXP(row.id,bait,{castPower:power});
        assert.ok(xp>previous,`${row.island}: bait ${bait} must improve XP at ${power} power`);
        assert.ok(row.xpNeeded/xp<=(row.id===5?25:105),'even minimum charge avoids a progression wall');
        previous=xp;
      }
    }
    for(let bait=row.arrival.baitIndex;bait<=row.local.baitIndex;bait++){
      const [low,mid,high]=[0,.5,1].map(castPower=>expectedCatchXP(row.id,bait,{castPower}));
      assert.ok(low<mid&&mid<high);
    }
  }
});

test('XP audit agrees with the real picker and rounded weight rolls, not an unweighted roster average', () => {
  for(const [island,bait,castPower] of [[0,0,0],[1,3,.5],[1,7,1],[2,7,0],[3,15,.5],[4,19,1],[5,23,.5]]){
    const counts=new Map(),draws=8192,quantiles=128;
    for(let q=0;q<draws;q++){
      const sp=pickSpecies(island,bait,()=>(q+.5)/draws,castPower);
      counts.set(sp,(counts.get(sp)||0)+1);
    }
    let actual=0;
    for(const [sp,count] of counts){
      let xp=0;
      for(let q=0;q<quantiles;q++){
        const weight=+rollWeight(sp,bait,()=>(q+.5)/quantiles,castPower).toFixed(1);
        xp+=catchXP(sp,weight,false);
      }
      actual+=count/draws*xp/quantiles;
    }
    const audited=expectedCatchXP(island,bait,{castPower});
    assert.ok(Math.abs(audited-actual)/actual<.003,`island ${island}, bait ${bait}: ${audited} vs ${actual}`);
  }
});

test('XP audit is deterministic, rejects invalid quantiles and reports empty pools as empty', () => {
  const random=Math.random;
  try{
    Math.random=()=>{throw Error('Balance reports must not depend on lucky random runs');};
    assert.deepEqual(islandProgressionRows({samples:64}),islandProgressionRows({samples:64}));
  }finally{Math.random=random;}
  for(const [island,bait] of [[0,23],[5,0],[-1,0],[6,0],[0,999]])assert.equal(expectedCatchXP(island,bait),0);
  for(const samples of [0,-1,NaN,1.5])assert.throws(()=>expectedCatchXP(0,0,{samples}),RangeError);
});

test('existing v8 saves retain exact XP and earned licenses at all 99 levels, regardless of old catches', () => {
  assert.equal(SAVE_VERSION,8,'reward tuning needs no save migration');
  assert.equal(SAVE_KEY,'reel-deal-save-v8');
  const log=SPECIES.map(sp=>({n:sp.name,w:sp.maxW}));
  for(let level=1;level<=MAX_LEVEL;level++){
    const licenses=ISLANDS.filter(i=>level>=oldGates[i.id]).map(i=>i.id),zone=licenses.at(-1);
    const raw={version:8,xp:xpForLevel(level)+37,coins:23456,caught:400,licenses,zone,
      boat:zone,ownedBoats:[...new Set([0,zone])],visited:licenses,
      owned:{rod:[0,3],line:[0,3],bait:[0,3]},gear:{rod:3,line:3,bait:3},log,bag:log.slice(0,4)};
    const normalized=normalizeSave(raw);
    for(const key of ['xp','coins','caught','licenses','zone','boat','ownedBoats','owned','gear','visited']){
      assert.deepEqual(normalized[key],raw[key],`level ${level}: keep ${key}`);
    }
    const roundTrip=normalizeSave({...normalized,log:raw.log,bag:raw.bag});
    assert.deepEqual(roundTrip,normalized,'reloading cannot re-award XP from stored fish');
  }
});

test('v6 XP reconstruction uses the frozen old rewards, not inflated future catch payouts', () => {
  const log=SPECIES.map(sp=>({n:sp.name,w:sp.maxW}));
  for(const sp of SPECIES)for(const weight of [sp.minW,sp.maxW])for(const isNew of [false,true]){
    assert.equal(legacyCatchXP(sp,weight,isNew),originalXP(sp,weight,isNew));
  }
  const inferred=SPECIES.reduce((total,sp)=>total+originalXP(sp,sp.maxW),0);
  const normalized=normalizeSave({coins:4321,caught:120,log},true);
  assert.equal(normalized.xp,inferred);
  assert.equal(normalized.coins,4321);
  assert.deepEqual(normalized.licenses,ISLANDS.filter(i=>levelForXp(inferred)>=oldGates[i.id]).map(i=>i.id));
  assert.ok(SPECIES.reduce((sum,sp)=>sum+catchXP(sp,sp.maxW),0)>inferred*3,'fixture detects an accidental legacy reward rewrite');
});
