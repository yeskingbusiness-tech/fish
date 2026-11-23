import test from 'node:test';
import assert from 'node:assert/strict';
import {PERSONAL_CAPACITY,BOAT_CAPACITY,capacities,rollMutation,merchantVisit,SECRET_FISHING_SITES,createCollectionState,ACHIEVEMENTS,achievementProgress} from '../collection-systems.mjs';

test('personal and per-boat storage capacities are bounded and meaningfully distinct',()=>{
 assert.equal(PERSONAL_CAPACITY,20);assert.equal(BOAT_CAPACITY.length,8);assert.deepEqual(BOAT_CAPACITY,[8,12,16,22,28,36,46,60]);
 assert.ok(capacities(0).boat<capacities(7).boat);assert.equal(capacities(0,2).boat,24);
});
test('mutation rolls are rare and deterministically distinguish shiny and huge',()=>{
 assert.equal(rollMutation(()=>.001,0),'shiny');assert.equal(rollMutation(()=>.5,1),null);let calls=0;assert.equal(rollMutation(()=>{calls++;return calls===1?.5:.01},.95),'huge');
});
test('secret fishing locations define a distinct signature species and reward',()=>{assert.equal(SECRET_FISHING_SITES.length,3);assert.equal(new Set(SECRET_FISHING_SITES.map(x=>x.fishId)).size,3);assert.ok(SECRET_FISHING_SITES.every(x=>x.name&&x.reward>0&&x.xp>0));});
test('traveling merchant visits rotate locations and stock window every fifteen minutes',()=>{
 const a=merchantVisit(0),b=merchantVisit(900000);assert.notEqual(a.slot,b.slot);assert.equal(a.endsAt,900000);assert.ok(a.island>=0&&a.island<20);
});
test('collection saves preserve fish stores, aquarium, upgrades and achievement timestamps',()=>{
 const saved={storage:{2:[{id:'fish',weight:1}]},aquarium:[{id:'fish'}],fieldNotes:['ironwood-waterfall','invalid-cache'],secrets:['cache-0'],achievements:{'first-cast':123},storageUpgrade:2,boatStorageUpgrade:{2:1},mutations:{shiny:2}};
 const state=createCollectionState(saved);assert.equal(state.storage[2].length,1);assert.equal(state.aquarium.length,1);assert.deepEqual(state.fieldNotes,['ironwood-waterfall']);assert.equal('secrets' in state,false);assert.equal(state.achievements['first-cast'],123);assert.equal(state.storageUpgrade,2);assert.equal(state.boatStorageUpgrade[2],1);
});
test('achievement progress tracks catches, islands, boats, levels and milestones',()=>{
 const game={caught:25,visited:Array(20).fill(0),ownedBoats:Array(8).fill(0),level:20,mutated:1,bosses:1,quests:5,aquarium:12,completedIslands:1,heavy:true};
 assert.equal(achievementProgress('angler-25',{game,secrets:[]}),25);assert.equal(achievementProgress('world-tour',{game,secrets:[]}),20);assert.equal(achievementProgress('fleet',{game,secrets:[]}),8);assert.equal(achievementProgress('mutation',{game}),1);assert.equal(achievementProgress('quest-five',{game}),5);assert.equal(achievementProgress('aquarium-12',{game}),12);assert.equal(ACHIEVEMENTS.length,12);
});
