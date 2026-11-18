import { SPECIES, RODS, LINES, BAITS } from './game-data.mjs?v=34';
import { BOATS, ISLANDS, gearIsland, xpForLevel, levelForXp, legacyCatchXP, hasIslandLicense } from './archipelago.mjs?v=34';

export const SAVE_VERSION = 8;
export const SAVE_KEY = 'reel-deal-save-v8';
export const LEGACY_KEYS = ['reel-deal-save-v7', 'reel-deal-save-v6', 'reel-life-3d-save-v6'];
// Never use the new gates to infer which licenses an old save already earned.
const PREVIOUS_ISLAND_LEVELS = [1,5,12,22,35,50];

const finite = (n, fallback=0) => Number.isFinite(Number(n)) ? Math.max(0,Number(n)) : fallback;
const integer = n => Math.min(Number.MAX_SAFE_INTEGER,Math.floor(finite(n)));
const ids = (items, max) => [...new Set([0,...(Array.isArray(items)?items:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<max)])];
const speciesByName = new Map(SPECIES.map(s=>[s.name,s]));
export function decodeFish(items){
  if(!Array.isArray(items)) return [];
  return items.flatMap(e=>{
    const sp=e && speciesByName.get(e.n), w=Number(e?.w);
    return sp && Number.isFinite(w) && w>0 ? [{sp,weight:+Math.min(sp.maxW,w).toFixed(1)}] : [];
  });
}

// Both v6 names migrate. A veteran keeps their coins/gear/fish and receives the
// island license + boat appropriate to their best already-owned gear chunk.
// v7 retains its exact XP; previously earned licenses migrate independently.
export function normalizeSave(d={}, legacy=false){
  if(!d || typeof d!=='object' || Array.isArray(d)) d={};
  const owned={},gear={};
  for(const [kind,list] of Object.entries({rod:RODS,line:LINES,bait:BAITS})){
    owned[kind]=ids(d.owned?.[kind],list.length);
    gear[kind]=owned[kind].includes(d.gear?.[kind])?d.gear[kind]:0;
  }
  const bag=decodeFish(d.bag),log=decodeFish(d.log);
  const discoveries={};
  for(const sp of SPECIES){
    const entry=d.discoveries?.[sp.id];
    if(entry && integer(entry.count)>0) discoveries[sp.id]={count:integer(entry.count),best:Math.min(sp.maxW,finite(entry.best)),first:typeof entry.first==='string'?entry.first:''};
  }
  // log and bag overlap; count from the log, and only supplement absent entries.
  const fromLog={};
  for(const e of log){
    const r=fromLog[e.sp.id]||(fromLog[e.sp.id]={count:0,best:0,first:''});
    r.count++;r.best=Math.max(r.best,e.weight);
  }
  for(const [id,r] of Object.entries(fromLog)){
    if(!discoveries[id]) discoveries[id]=r;
    else discoveries[id].best=Math.max(discoveries[id].best,r.best);
  }
  for(const e of bag){
    if(!discoveries[e.sp.id]) discoveries[e.sp.id]={count:1,best:e.weight,first:''};
    else discoveries[e.sp.id].best=Math.max(discoveries[e.sp.id].best,e.weight);
  }
  const bestSpecies=speciesByName.get(d.best?.name);
  let best=bestSpecies && finite(d.best.weight)>0 ? {name:bestSpecies.name,weight:Math.min(bestSpecies.maxW,finite(d.best.weight)).toFixed(1)} : null;
  if(best && !discoveries[bestSpecies.id]) discoveries[bestSpecies.id]={count:1,best:Number(best.weight),first:''};
  if(!best){for(const e of [...log,...bag])if(!best||e.weight>Number(best.weight))best={name:e.sp.name,weight:e.weight.toFixed(1)};}
  const caught=Math.max(integer(d.caught),log.length,Object.keys(discoveries).length);
  let xp=integer(d.xp),ownedBoats=ids(d.ownedBoats,BOATS.length),boat=ownedBoats.includes(d.boat)?d.boat:0;
  if(legacy){
    const rank=Math.max(...Object.values(owned).flat().map(gearIsland));
    // New catch rewards must not retroactively inflate old v6 XP or licenses.
    const loggedXp=log.reduce((a,e)=>a+legacyCatchXP(e.sp,e.weight),0);
    xp=Math.max(caught*28,loggedXp,xpForLevel(PREVIOUS_ISLAND_LEVELS[rank]));
    ownedBoats=[...new Set([0,rank])]; boat=rank;
  }
  let licenses=ids(d.licenses,ISLANDS.length);
  if(legacy || integer(d.version)<SAVE_VERSION){
    // Includes earned-but-unvisited destinations, without granting any new ones.
    licenses=ISLANDS.filter(i=>levelForXp(xp)>=PREVIOUS_ISLAND_LEVELS[i.id]).map(i=>i.id);
  }
  licenses=ISLANDS.filter(i=>hasIslandLicense(i.id,xp,licenses)).map(i=>i.id);
  const wanted=Number.isInteger(d.zone)&&ISLANDS[d.zone]?d.zone:0;
  const zone=hasIslandLicense(wanted,xp,licenses)&&BOATS[boat].range>=wanted?wanted:0;
  const visited=ids(d.visited,ISLANDS.length).filter(i=>hasIslandLicense(i,xp,licenses));
  if(!visited.includes(zone))visited.push(zone);
  return {version:SAVE_VERSION,score:integer(d.score),caught,best,coins:integer(d.coins),xp,licenses,zone,visited,owned,gear,ownedBoats,boat,discoveries,bag,log:log.slice(0,200)};
}
