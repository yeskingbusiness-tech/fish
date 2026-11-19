import { SPECIES, RODS, LINES, BAITS, RARITY, RARITY_ORDER, ISLAND_RARITIES, fishValue } from './game-data.mjs?v=41';
import { ISLANDS, MAX_LEVEL, GEAR_PER_ISLAND } from './island-data.mjs?v=41';
export { ISLANDS, MAX_LEVEL, GEAR_PER_ISLAND };
const ISLAND_SPECIES=ISLANDS.map(i=>SPECIES.filter(s=>s.island===i.id));
export const ISLAND_COLLECTION_BONUS=5;
export function islandCollectionProgress(discoveries={}){
  return ISLAND_SPECIES.map((fish,island)=>{const found=fish.filter(sp=>Number(discoveries?.[sp.id]?.count)>=1).length;return {island,found,total:fish.length,complete:found===fish.length};});
}
export function completedCollections(discoveries={},earned=[]){
  return [...new Set([...(Array.isArray(earned)?earned:[]).filter(n=>Number.isInteger(n)&&ISLANDS[n]),...islandCollectionProgress(discoveries).filter(p=>p.complete).map(p=>p.island)])].sort((a,b)=>a-b);
}
export function collectionCoinBonus(discoveries={},earned=[]){return completedCollections(discoveries,earned).length*ISLAND_COLLECTION_BONUS;}
export function fishSaleValue(sp,weight,discoveries={},earned=[]){return Math.round(fishValue(sp,weight)*(100+collectionCoinBonus(discoveries,earned))/100);}
export const gearIsland=tier=>Math.floor(tier/GEAR_PER_ISLAND);
export function localGearPriceCeiling(island){return !Number.isInteger(island)||!ISLANDS[island]?0:Math.max(...[RODS,LINES,BAITS].flatMap(list=>list.filter(g=>g.island===island).map(g=>g.cost)));}

// Optional vessels: no boat has a territory range or license requirement.
// All eight can reach all twenty territories. Only speed and physical size vary.
const boats=[
  ['Harbor Skiff',0,14,.85,0xb78755,0xeee2b5],
  ['Pinewood Dinghy',1000,18,1,0x527f6b,0xe9d4a1],
  ['Sunrunner',18000,23,1.16,0xd69b52,0x68c3c5],
  ['Frostbreaker',160000,28,1.32,0x7eb3c7,0xe7f3f3],
  ['Cinderwake',1500000,34,1.5,0x59606b,0xf4a15e],
  ['Astral Voyager',12000000,40,1.7,0x8a7fbc,0xd1e4ff],
  ['Horizon Cruiser',80000000,47,1.9,0x627c98,0xe5ca90],
  ['Origin Ark',420000000,55,2.15,0x7eaaa4,0xf5e8bc],
];
export const BOATS=Object.freeze(boats.map(([name,cost,speed,size,color,stripe],id)=>Object.freeze({id,name,cost,speed,size,color,stripe,description:id?'A larger hull and a faster cruise. No island-access advantage.':'Your free starter boat. Every unlocked territory is within reach.'})));
export function xpForLevel(level){const n=Math.max(0,Math.min(MAX_LEVEL-1,Math.floor(Number(level)||1)-1));return 90*n+22*n*n;}
export function levelForXp(xp){const n=Number.isFinite(xp)?Math.max(0,xp):0;return Math.min(MAX_LEVEL,Math.floor((-90+Math.sqrt(8100+88*n))/44)+1);}
export function levelProgress(xp){const level=levelForXp(xp),start=xpForLevel(level),next=xpForLevel(level+1);return {level,current:Math.max(0,xp-start),needed:next-start,ratio:level===MAX_LEVEL?1:(xp-start)/(next-start)};}
export const CATCH_XP_MULTIPLIER=.90;
export const CATCH_XP_BY_RARITY=Object.freeze(Object.fromEntries(RARITY_ORDER.map((key,tier)=>[key,[20,30,45,68,103,155,233,350,525,788,1182,1773][tier]])));
export const ISLAND_XP_MULTIPLIERS=Object.freeze(ISLANDS.map((i,n)=>n===0?1:Math.max(.1,(xpForLevel(ISLANDS[n+1]?.level||MAX_LEVEL)-xpForLevel(i.level)||900000)/(80*1.8*CATCH_XP_BY_RARITY[RARITY_ORDER[ISLAND_RARITIES[n][0]]]))));
export function catchXP(sp,weight,isNew=false){
  const ratio=Number(weight)/sp.maxW,size=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;
  const base=CATCH_XP_BY_RARITY[sp.rarity]*ISLAND_XP_MULTIPLIERS[sp.island];
  return Math.max(1,Math.round(base*(1+.4*size)*(isNew?1.5:1)*CATCH_XP_MULTIPLIER));
}
// Frozen reward for v6 inference ONLY; caller supplies frozen legacy species.
export function legacyCatchXP(sp,weight,isNew=false){return Math.round((20+sp.island*22+RARITY[sp.rarity].tier*6+8*Math.min(1,weight/sp.maxW))*(isNew?1.5:1));}
export function hasIslandLicense(target,xp,licenses=[]){const island=ISLANDS[target];return !!island&&(levelForXp(xp)>=island.level||(Array.isArray(licenses)&&licenses.includes(island.id)));}
// Kept as a pure access guard for chart + physics. Boat is intentionally ignored.
export function travelRequirement(target,xp,_boat,licenses=[]){const i=ISLANDS[target];return !i?'Unknown destination.':!hasIslandLicense(target,xp,licenses)?`Reach level ${i.level} to enter ${i.name}.`:null;}
