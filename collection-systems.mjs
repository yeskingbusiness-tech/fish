// Lightweight deterministic content rules for storage, mutations, merchants and achievements.
export const PERSONAL_CAPACITY=20;
export const BOAT_CAPACITY=Object.freeze([8,12,16,22,28,36,46,60]);
export const STORAGE_UPGRADE_COST=Object.freeze([0,1800,4200,8000]);
export const MUTATIONS=Object.freeze({shiny:{name:'Shiny',multiplier:2.5},huge:{name:'Huge',multiplier:1.8}});
export function rollMutation(random=Math.random,weightRatio=0){if(random()<.012)return 'shiny';if(weightRatio>.90&&random()<.08)return 'huge';return null;}
export function capacities(boat=0,upgrade=0){return {personal:PERSONAL_CAPACITY,boat:(BOAT_CAPACITY[boat]||BOAT_CAPACITY[0]+Math.max(0,boat-7)*8)+upgrade*8};}
export function merchantVisit(now=Date.now()) {const slot=Math.floor(now/900000),seed=(slot*48271+17)%2147483647;return {slot,island:seed%20,stockSeed:Math.floor(seed/20)%997,endsAt:(slot+1)*900000};}
export const SECRET_FISHING_SITES=Object.freeze([
 {id:'ironwood-waterfall',island:2,name:'Ironwood Falls Pool',fishId:'river-colossus',reward:900,xp:180,discover:'on-foot'},
 {id:'sunscar-shoal',island:4,name:'Sunscar Blue Shoal',fishId:'sunscar-dragonfish',reward:1400,xp:260,discover:'sailing'},
 {id:'frostfall-blue',island:10,name:'Frostfall Blue Hole',fishId:'the-frozen-king',reward:2200,xp:420,discover:'sailing'}
]);
export const ACHIEVEMENTS=Object.freeze([
 {id:'first-cast',title:'First Fish',desc:'Land your first catch.',goal:1,kind:'catch',reward:250,tier:'Bronze'},
 {id:'angler-25',title:'Regular Angler',desc:'Land 25 fish.',goal:25,kind:'catch',reward:900,tier:'Bronze'},
 {id:'angler-250',title:'Master Angler',desc:'Land 250 fish.',goal:250,kind:'catch',reward:5000,tier:'Gold'},
 {id:'discover-island',title:'Local Naturalist',desc:'Discover every fish on an island.',goal:1,kind:'island-index',reward:1800,tier:'Silver'},
 {id:'heavyweight',title:'Heavyweight',desc:'Land a fish weighing at least 100 pounds.',goal:1,kind:'heavy',reward:2500,tier:'Gold'},
 {id:'mutation',title:'Something Different',desc:'Catch a mutated fish.',goal:1,kind:'mutation',reward:1200,tier:'Silver'},
 {id:'boss-1',title:'Apex Angler',desc:'Defeat a boss fish.',goal:1,kind:'boss',reward:2200,tier:'Gold'},
 {id:'quest-five',title:'Trusted Regular',desc:'Complete five NPC quests.',goal:5,kind:'quests',reward:1600,tier:'Silver'},
 {id:'aquarium-12',title:'Living Gallery',desc:'Display twelve fish in Reedhaven Aquarium.',goal:12,kind:'aquarium',reward:1000,tier:'Bronze'},
 {id:'world-tour',title:'Around the Archipelago',desc:'Visit all 20 islands.',goal:20,kind:'islands',reward:6000,tier:'Platinum'},
 {id:'fleet',title:'Fleet Owner',desc:'Purchase every boat.',goal:8,kind:'boats',reward:4000,tier:'Gold'},
 {id:'level-20',title:'Seasoned Captain',desc:'Reach level 20.',goal:20,kind:'level',reward:2000,tier:'Silver'}
]);
export function createCollectionState(saved={}){const boatStorageUpgrade={};for(const [id,n]of Object.entries(saved.boatStorageUpgrade||{})){const boat=Number(id),level=Math.max(0,Math.min(3,Math.floor(Number(n)||0)));if(Number.isInteger(boat)&&boat>=0&&boat<BOAT_CAPACITY.length&&level)boatStorageUpgrade[boat]=level;}return {storage:{...(saved.storage||{})},aquarium:Array.isArray(saved.aquarium)?saved.aquarium:[],mutations:saved.mutations&&typeof saved.mutations==='object'?saved.mutations:{},mutationBySpecies:saved.mutationBySpecies&&typeof saved.mutationBySpecies==='object'?saved.mutationBySpecies:{},fieldNotes:Array.isArray(saved.fieldNotes)?[...new Set(saved.fieldNotes.filter(x=>SECRET_FISHING_SITES.some(site=>site.id===x)))]:[],achievements:saved.achievements&&typeof saved.achievements==='object'?Object.fromEntries(Object.entries(saved.achievements).filter(([id])=>ACHIEVEMENTS.some(a=>a.id===id))):{},merchantBuys:saved.merchantBuys&&typeof saved.merchantBuys==='object'?saved.merchantBuys:{},storageUpgrade:Math.max(0,Math.min(3,Math.floor(Number(saved.storageUpgrade)||0))),boatStorageUpgrade,aquariumUpgrade:Math.max(0,Math.min(3,Math.floor(Number(saved.aquariumUpgrade)||0))),};}
export function achievementProgress(id,state){const a=ACHIEVEMENTS.find(x=>x.id===id);if(!a)return 0;const g=state.game||{};switch(a.kind){case'catch':return Math.min(a.goal,g.caught||0);case'islands':return Math.min(a.goal,(g.visited||[]).length);case'boats':return Math.min(a.goal,(g.ownedBoats||[]).length);case'level':return Math.min(a.goal,g.level||0);case'mutation':return Math.min(a.goal,g.mutated||0);case'boss':return Math.min(a.goal,g.bosses||0);case'quests':return Math.min(a.goal,g.quests||0);case'aquarium':return Math.min(a.goal,g.aquarium||0);case'heavy':return Math.min(a.goal,g.heavy?1:0);case'island-index':return Math.min(a.goal,g.completedIslands?1:0);default:return 0;}}
