// Persistent NPC quest definitions and deterministic progress rules.
// Quest progress is event-driven so it can share existing catches, visits, and gear purchases.
export const QUEST_GIVERS=Object.freeze([
  Object.freeze({id:'old-fisher',name:'Old Fisherman',role:'A weathered angler who knows the local waters.',island:0,icon:'🎣'}),
  Object.freeze({id:'marine-biologist',name:'Marine Biologist',role:'Cataloguing the archipelago’s unusual species.',island:0,icon:'🔬'}),
  Object.freeze({id:'boat-mechanic',name:'Boat Mechanic',role:'Keeps the fleet ready for long voyages.',island:0,icon:'⚙️'}),
  Object.freeze({id:'island-explorer',name:'Island Explorer',role:'Maps quiet shores and hard-to-find fishing grounds.',island:2,icon:'🧭'}),
  Object.freeze({id:'mysterious-angler',name:'Mysterious Angler',role:'A patient fisher with a taste for rare catches.',island:10,icon:'🌙'}),
  Object.freeze({id:'fish-collector',name:'Fish Collector',role:'Keeps a careful list of remarkable local catches.',island:0,icon:'🐟'})
]);
export const QUESTS=Object.freeze([
  Object.freeze({id:'first-catch',giver:'old-fisher',title:'A Line in the Water',description:'Land a fish anywhere in the archipelago.',objective:{type:'catch',count:1},reward:{coins:250,xp:40}}),
  Object.freeze({id:'river-study',giver:'marine-biologist',title:'River Field Notes',description:'Discover three different species in Ironwood River.',objective:{type:'unique-catch',island:2,count:3},reward:{coins:700,xp:120}}),
  Object.freeze({id:'new-horizon',giver:'island-explorer',title:'Beyond the Harbor',description:'Visit three different unlocked islands.',objective:{type:'visit',count:3},reward:{coins:600,xp:100}}),
  Object.freeze({id:'fleet-ready',giver:'boat-mechanic',title:'Ready to Range',description:'Purchase a boat upgrade.',objective:{type:'boat-upgrade',count:1},reward:{coins:500,xp:80}}),
  Object.freeze({id:'rare-water',giver:'mysterious-angler',title:'A Rare Ripple',description:'Land a Legendary-or-rarer fish to reveal the roaming bosses.',objective:{type:'rarity',tier:4,count:1},reward:{coins:1800,xp:350}}),
  Object.freeze({id:'old-fisher-followup',requires:'first-catch',giver:'old-fisher',title:'Read the Current',description:'Land three Rare-or-better fish offshore.',objective:{type:'rarity',tier:2,count:3},reward:{coins:900,xp:180}}),
  Object.freeze({id:'biologist-followup',requires:'river-study',giver:'marine-biologist',title:'A Wider Survey',description:'Discover three different species in Brackwater Marsh.',objective:{type:'unique-catch',island:3,count:3},reward:{coins:1200,xp:260}}),
  Object.freeze({id:'mechanic-followup',requires:'fleet-ready',giver:'boat-mechanic',title:'A Growing Fleet',description:'Purchase a boat other than your starter.',objective:{type:'boat-purchase',count:1},reward:{coins:1000,xp:200}}),
  Object.freeze({id:'explorer-followup',requires:'new-horizon',giver:'island-explorer',title:'Across the Archipelago',description:'Visit five different unlocked islands.',objective:{type:'visit',count:5},reward:{coins:1500,xp:300}}),
  Object.freeze({id:'mysterious-followup',requires:'rare-water',giver:'mysterious-angler',title:'The Unusual One',description:'Land a Shiny or Huge fish.',objective:{type:'mutation',count:1},reward:{coins:3000,xp:600}}),
  Object.freeze({id:'collector-first',giver:'fish-collector',title:'A First Record',description:'Land three fish for the archive.',objective:{type:'catch',count:3},reward:{coins:450,xp:70}}),
  Object.freeze({id:'collector-request',requires:'collector-first',giver:'fish-collector',title:'Marsh Specimens',description:'Discover three different fish in Brackwater Marsh.',objective:{type:'unique-catch',island:3,count:3},reward:{coins:900,xp:180}})
]);
const definitions=new Map(QUESTS.map(q=>[q.id,q]));
export function createQuestState(saved={}){
 const progress={};for(const q of QUESTS){const old=saved.progress?.[q.id];progress[q.id]={accepted:!!old?.accepted,complete:!!old?.complete,count:Math.min(q.objective.count,Math.max(0,Number(old?.count)||0)),seen:Array.isArray(old?.seen)?[...new Set(old.seen.filter(x=>typeof x==='string'))]:[]};}
 for(const q of QUESTS)if(q.requires&&!progress[q.requires]?.complete)progress[q.id].accepted=false;
 return {progress};
}
export function acceptQuest(state,id){const q=definitions.get(id),p=state?.progress?.[id];if(!q||!p||p.complete||(q.requires&&!state.progress[q.requires]?.complete))return false;p.accepted=true;return true;}
export function applyQuestEvent(state,event){const completed=[];if(!state?.progress)return completed;
 for(const q of QUESTS){const p=state.progress[q.id],o=q.objective;if(!p?.accepted||p.complete)continue;let amount=0;
  if(o.type==='catch'&&event.type==='catch')amount=1;
  if(o.type==='unique-catch'&&event.type==='catch'&&event.island===o.island&&typeof event.speciesId==='string'&&!p.seen.includes(event.speciesId)){p.seen.push(event.speciesId);amount=1;}
  if(o.type==='visit'&&event.type==='visit'&&Number.isInteger(event.island)&&!p.seen.includes(String(event.island))){p.seen.push(String(event.island));amount=1;}
  if(o.type==='boat-upgrade'&&event.type==='boat-upgrade')amount=1;
  if(o.type==='boat-purchase'&&event.type==='boat-purchase'&&event.boat>0)amount=1;
  if(o.type==='gear-tier'&&event.type==='gear-purchase'&&Number(event.tier)>=o.tier)amount=1;
  if(o.type==='mutation'&&event.type==='catch'&&['shiny','huge'].includes(event.mutation))amount=1;
  if(o.type==='rarity'&&event.type==='catch'&&Number(event.rarityTier)>=o.tier)amount=1;
  if(amount){p.count=Math.min(o.count,p.count+amount);if(p.count>=o.count){p.complete=true;completed.push(q);}}
 }
 return completed;
}
export function questProgress(state,id){const q=definitions.get(id),p=state?.progress?.[id];return q&&p?{count:p.count,goal:q.objective.count,accepted:p.accepted,complete:p.complete}:null;}
