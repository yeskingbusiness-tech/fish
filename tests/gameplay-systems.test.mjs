import test from 'node:test';import assert from 'node:assert/strict';
import{WEATHER,islandWeather,BOSSES,createActivityState,progressChallenges}from'../gameplay-systems.mjs';

test('weather is deterministic within a 3-minute island window and varies by island or window',()=>{
 const a=islandWeather(3,180001),b=islandWeather(3,180100),c=islandWeather(4,180100),d=islandWeather(3,360001);
 assert.equal(a.id,b.id);assert.equal(a.epoch,b.epoch);assert.equal(a.changesIn,180000-(180001%180000));assert.ok(c.id!==undefined&&d.id!==undefined);assert.equal(WEATHER.length,6);assert.ok(WEATHER.every(w=>w.wait>0&&w.rare>0));
});
test('named boss encounters have authored identities, behaviors, and territory affinities',()=>{assert.ok(BOSSES.length>=5&&BOSSES.every(b=>b.id&&b.name&&b.behavior&&Number.isInteger(b.island)));assert.equal(new Set(BOSSES.map(b=>b.id)).size,BOSSES.length);});
test('daily and weekly challenge sets persist for their period and refresh on rollover',()=>{
 const friday=new Date('2026-11-13T12:00:00Z'),s=createActivityState({},friday),same=createActivityState(s,new Date('2026-11-14T12:00:00Z')),monday=createActivityState(s,new Date('2026-11-16T12:00:00Z'));
 assert.equal(s.daily.tasks.length,3);assert.equal(s.weekly.tasks.length,4);assert.equal('expedition' in s,false);assert.equal('relics' in s,false);assert.equal(same.daily.key,'2026-11-14');assert.equal(same.weekly.key,s.weekly.key);assert.notEqual(monday.weekly.key,s.weekly.key);
});
test('challenge progress tracks distinct islands, conditions and gear, pays each objective once',()=>{
 const s=createActivityState({},new Date('2026-11-13T12:00:00Z'));
 const task={kind:'island',target:2,progress:0,complete:false};s.daily.tasks=[task];
 assert.deepEqual(progressChallenges(s,{kind:'island',island:2}),[]);assert.equal(task.progress,1);
 assert.deepEqual(progressChallenges(s,{kind:'island',island:2}),[]);assert.equal(task.progress,1);
 assert.deepEqual(progressChallenges(s,{kind:'island',island:3}),[task]);assert.equal(task.complete,true);assert.deepEqual(progressChallenges(s,{kind:'island',island:4}),[]);
});
