import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTS,QUEST_GIVERS,createQuestState,acceptQuest,applyQuestEvent,questProgress} from '../quest-system.mjs';

test('NPC quest catalogue is authored, bounded, and uses known givers',()=>{
 assert.ok(QUEST_GIVERS.length>=5);assert.ok(QUESTS.length>=5);
 for(const q of QUESTS){assert.ok(QUEST_GIVERS.some(g=>g.id===q.giver));assert.ok(q.objective.count>0);}
});
test('quest state sanitizes saves and acceptance rejects unknown or completed quests',()=>{
 const s=createQuestState({progress:{'first-catch':{accepted:true,count:99,seen:['x','x'],complete:true},invalid:{accepted:true}}});
 assert.deepEqual(questProgress(s,'first-catch'),{count:1,goal:1,accepted:true,complete:true});assert.equal(acceptQuest(s,'not-a-quest'),false);assert.equal(acceptQuest(s,'first-catch'),false);
});
test('catch quests progress only from relevant events and pay completion once',()=>{
 const s=createQuestState();assert.equal(acceptQuest(s,'first-catch'),true);assert.deepEqual(applyQuestEvent(s,{type:'visit',island:1}),[]);
 const done=applyQuestEvent(s,{type:'catch',island:0,speciesId:'fish-a',rarityTier:0});assert.equal(done[0].id,'first-catch');assert.equal(applyQuestEvent(s,{type:'catch',speciesId:'fish-b'}).length,0);
});
test('unique-species, unique-island, and rarity objectives track their authored criteria',()=>{
 const s=createQuestState();for(const id of ['river-study','new-horizon','rare-water'])acceptQuest(s,id);
 const ev=(speciesId,island,rarityTier=0)=>applyQuestEvent(s,{type:'catch',speciesId,island,rarityTier});
 ev('a',2);ev('a',2);ev('b',2);assert.equal(questProgress(s,'river-study').count,2);ev('c',2);assert.equal(questProgress(s,'river-study').complete,true);
 applyQuestEvent(s,{type:'visit',island:0});applyQuestEvent(s,{type:'visit',island:0});applyQuestEvent(s,{type:'visit',island:2});applyQuestEvent(s,{type:'visit',island:3});assert.equal(questProgress(s,'new-horizon').complete,true);
 ev('legendary',2,4);assert.equal(questProgress(s,'rare-water').complete,true);
});
test('questlines continue at the same NPC and support mutations, purchases, and saved state',()=>{
 const s=createQuestState();acceptQuest(s,'first-catch');applyQuestEvent(s,{type:'catch',speciesId:'fish-a'});assert.equal(questProgress(s,'first-catch').complete,true);
 acceptQuest(s,'old-fisher-followup');applyQuestEvent(s,{type:'catch',rarityTier:2});applyQuestEvent(s,{type:'catch',rarityTier:3});applyQuestEvent(s,{type:'catch',rarityTier:4});assert.equal(questProgress(s,'old-fisher-followup').complete,true);
 acceptQuest(s,'rare-water');applyQuestEvent(s,{type:'catch',rarityTier:4});acceptQuest(s,'mysterious-followup');applyQuestEvent(s,{type:'catch',mutation:'shiny'});assert.equal(questProgress(s,'mysterious-followup').complete,true);
 acceptQuest(s,'fleet-ready');applyQuestEvent(s,{type:'boat-upgrade'});acceptQuest(s,'mechanic-followup');applyQuestEvent(s,{type:'boat-purchase',boat:0});assert.equal(questProgress(s,'mechanic-followup').complete,false);applyQuestEvent(s,{type:'boat-purchase',boat:2});assert.equal(questProgress(s,'mechanic-followup').complete,true);
 const restored=createQuestState(JSON.parse(JSON.stringify(s)));assert.equal(questProgress(restored,'mechanic-followup').complete,true);
});
