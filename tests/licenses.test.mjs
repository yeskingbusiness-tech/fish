import test from 'node:test';
import assert from 'node:assert/strict';
import { ISLANDS, BOATS, MAX_LEVEL, xpForLevel, hasIslandLicense, travelRequirement } from '../archipelago.mjs';
import { SAVE_VERSION, normalizeSave } from '../save-state.mjs';

const PREVIOUS_LEVELS = [1,5,12,22,35,50];

test('every island gap is wider, boats share the new milestones, and all gates fit below the level cap', () => {
  assert.deepEqual(ISLANDS.map(i=>i.level),[1,10,25,45,65,90]);
  for(const i of ISLANDS){
    assert.equal(BOATS[i.id].level,i.level);
    assert.equal(BOATS[i.id].range,i.id);
    if(i.id)assert.ok(i.level-ISLANDS[i.id-1].level>PREVIOUS_LEVELS[i.id]-PREVIOUS_LEVELS[i.id-1]);
  }
  assert.ok(ISLANDS.at(-1).level<MAX_LEVEL,'leave some levels to earn in the final waters');
});

test('fresh licenses reject the old thresholds and one XP short, then unlock exactly at the new level', () => {
  for(const island of ISLANDS.slice(1)){
    for(const xp of [xpForLevel(PREVIOUS_LEVELS[island.id]),xpForLevel(island.level)-1]){
      assert.equal(hasIslandLicense(island.id,xp,[0]),false);
      assert.match(travelRequirement(island.id,xp,5,[0]),new RegExp(`Reach level ${island.level}`));
    }
    const xp=xpForLevel(island.level);
    assert.equal(hasIslandLicense(island.id,xp,[0]),true);
    assert.equal(travelRequirement(island.id,xp,island.id,[0]),null);
    assert.match(travelRequirement(island.id,xp,island.id-1,[0]),/Requires/);
  }
});

test('v7 migration keeps exact XP, coins, ownership, location and every earned license at all 99 levels', () => {
  for(let level=1;level<=MAX_LEVEL;level++){
    const licenses=ISLANDS.filter(i=>level>=PREVIOUS_LEVELS[i.id]).map(i=>i.id);
    const rank=licenses.at(-1),ownedBoats=[...new Set([0,rank])];
    const old={version:7,coins:4321,xp:xpForLevel(level)+37,caught:42,score:9800,
      zone:rank,visited:ownedBoats,boat:rank,ownedBoats,
      owned:{rod:[...new Set([0,rank*4])],line:[0],bait:[0]},gear:{rod:rank*4,line:0,bait:0}};
    const d=normalizeSave(old);
    assert.equal(d.version,SAVE_VERSION);
    for(const key of ['xp','coins','caught','score','zone','boat'])assert.equal(d[key],old[key],`${key} at level ${level}`);
    for(const key of ['owned','gear','ownedBoats','visited'])assert.deepEqual(d[key],old[key]);
    assert.deepEqual(d.licenses,licenses);
    assert.deepEqual(normalizeSave(d),d,'a migrated save is idempotent');
    // Earned-but-unvisited destinations must be retained too, without marking them visited.
    const atHome=normalizeSave({...old,zone:0,visited:[0],boat:0});
    assert.deepEqual(atHome.licenses,licenses);assert.deepEqual(atHome.visited,[0]);
    for(const id of licenses)assert.equal(travelRequirement(id,d.xp,rank,d.licenses),null);
    if(rank<5)assert.match(travelRequirement(rank+1,d.xp,5,d.licenses),/Reach level/);
  }
});

test('retained licenses never waive boat range or grant unrelated destinations', () => {
  const d=normalizeSave({version:7,xp:xpForLevel(22),zone:3,visited:[0,2,3],boat:3,ownedBoats:[0,3]});
  assert.deepEqual(d.licenses,[0,1,2,3]);
  assert.equal(travelRequirement(3,d.xp,3,d.licenses),null);
  assert.match(travelRequirement(3,d.xp,2,d.licenses),/Requires/);
  assert.match(travelRequirement(4,d.xp,5,d.licenses),/Reach level 65/);
  assert.equal(travelRequirement(0,d.xp,0,d.licenses),null);
  assert.equal(hasIslandLicense(999,d.xp,[999]),false);
  assert.match(travelRequirement(999,d.xp,5,[999]),/Unknown destination/);
  assert.equal(normalizeSave({...d,boat:0}).zone,0,'an unsuitable equipped boat still invalidates the spawn');
});

test('migration happens only once: future unlocks and fresh v8 saves use the wider gates', () => {
  for(let id=1;id<ISLANDS.length;id++){
    const migrated=normalizeSave({version:7,xp:xpForLevel(PREVIOUS_LEVELS[id])-1});
    const next=normalizeSave({...migrated,xp:xpForLevel(PREVIOUS_LEVELS[id])});
    assert.equal(hasIslandLicense(id,next.xp,next.licenses),false,'reloading cannot grant a new old-level license');
    const fresh=normalizeSave({version:SAVE_VERSION,xp:next.xp});
    assert.equal(hasIslandLicense(id,fresh.xp,fresh.licenses),false);
    const earned=normalizeSave({...next,xp:xpForLevel(ISLANDS[id].level)});
    assert.equal(hasIslandLicense(id,earned.xp,earned.licenses),true);
    assert.ok(earned.licenses.includes(id));
  }
});

test('malformed license data, visited islands and boats cannot grant fresh access; reset clears retained licenses', () => {
  for(const version of [7,SAVE_VERSION]){
    const d=normalizeSave({version,xp:0,licenses:['5',-1,6,{},NaN],zone:5,visited:[0,5],boat:5,ownedBoats:[0,5]});
    assert.deepEqual(d.licenses,[0]);assert.equal(d.zone,0);assert.deepEqual(d.visited,[0]);
  }
  for(const licenses of [null,'all',{},123]){
    assert.deepEqual(normalizeSave({version:SAVE_VERSION,licenses}).licenses,[0]);
  }
  const reset=normalizeSave({version:SAVE_VERSION});
  assert.equal(reset.xp,0);assert.equal(reset.zone,0);assert.equal(reset.boat,0);
  assert.deepEqual(reset.licenses,[0]);
});
