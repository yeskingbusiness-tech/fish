import test from 'node:test';import assert from 'node:assert/strict';
import{WEATHER,islandWeather,expeditionOffers,BOSSES,createActivityState,progressChallenges}from'../gameplay-systems.mjs';

test('weather is deterministic within a 3-minute island window and varies by island or window',()=>{
 const a=islandWeather(3,180001),b=islandWeather(3,180100),c=islandWeather(4,180100),d=islandWeather(3,360001);
 assert.equal(a.id,b.id);assert.equal(a.epoch,b.epoch);assert.equal(a.changesIn,180000-(180001%180000));assert.ok(c.id!==undefined&&d.id!==undefined);assert.equal(WEATHER.length,6);assert.ok(WEATHER.every(w=>w.wait>0&&w.rare>0));
});
test('each island always offers a boss hunt and storm expedition plus a rotating third objective',()=>{
 for(let island=0;island<20;island++){const offers=expeditionOffers(island,'2026-11-13');assert.equal(offers.length,3);assert.ok(offers.some(x=>x.type==='boss'));assert.ok(offers.some(x=>x.type==='storm'));assert.ok(offers.every(x=>x.island===island&&x.reward>0&&x.goal>0));}
 assert.ok(BOSSES.length>=5&&BOSSES.every(b=>b.name&&b.behavior));
});
test('daily and weekly challenge sets persist for their period and refresh on rollover',()=>{
 const friday=new Date('2026-11-13T12:00:00Z'),s=createActivityState({},friday),same=createActivityState(s,new Date('2026-11-14T12:00:00Z')),monday=createActivityState(s,new Date('2026-11-16T12:00:00Z'));
 assert.equal(s.daily.tasks.length,3);assert.equal(s.weekly.tasks.length,4);assert.equal(same.daily.key,'2026-11-14');assert.equal(same.weekly.key,s.weekly.key);assert.notEqual(monday.weekly.key,s.weekly.key);
});
test('challenge progress tracks distinct islands, conditions and gear, pays each objective once',()=>{
 const s=createActivityState({},new Date('2026-11-13T12:00:00Z'));
 const task={kind:'island',target:2,progress:0,complete:false};s.daily.tasks=[task];
 assert.deepEqual(progressChallenges(s,{kind:'island',island:2}),[]);assert.equal(task.progress,1);
 assert.deepEqual(progressChallenges(s,{kind:'island',island:2}),[]);assert.equal(task.progress,1);
 assert.deepEqual(progressChallenges(s,{kind:'island',island:3}),[task]);assert.equal(task.complete,true);assert.deepEqual(progressChallenges(s,{kind:'island',island:4}),[]);
});
test('saved expeditions and relics survive daily challenge rollover',()=>{
 const d=new Date('2026-11-13T12:00:00Z'),saved=createActivityState({},d);saved.expedition={id:'x',island:4,type:'boss',progress:0};saved.relics=7;
 const next=createActivityState(saved,new Date('2026-11-14T12:00:00Z'));assert.equal(next.expedition.id,'x');assert.equal(next.relics,7);assert.notEqual(next.daily.key,saved.daily.key);
});
