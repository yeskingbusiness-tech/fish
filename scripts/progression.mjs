import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { BAITS,GEAR_ISLAND_STEPS,eligibleSpecies,speciesChance,rollWeight,roundWeight } from '../game-data.mjs';
import { ISLANDS,MAX_LEVEL,xpForLevel,catchXP } from '../archipelago.mjs';
const cache=new Map();
export function expectedCatchXP(island,baitIndex,{samples=256,castPower=.5,shorePenalty=0}={}){
  if(!Number.isInteger(samples)||samples<1)throw new RangeError('Use at least one quantile');
  const key=[island,baitIndex,samples,castPower,shorePenalty].join(':');if(cache.has(key))return cache.get(key);
  let chances=0,total=0;
  for(const sp of eligibleSpecies(island,baitIndex)){
    const chance=speciesChance(sp,baitIndex,castPower,shorePenalty);let xp=0;
    for(let n=0;n<samples;n++)xp+=catchXP(sp,roundWeight(rollWeight(sp,baitIndex,()=>(n+.5)/samples,castPower,shorePenalty)),false);
    chances+=chance;total+=chance*xp/samples;
  }
  const result=chances?total/chances:0;cache.set(key,result);return result;
}
export function islandProgressionRows(options={}){return ISLANDS.map(i=>{
  const fromLevel=i.level,toLevel=ISLANDS[i.id+1]?.level??MAX_LEVEL,xpNeeded=xpForLevel(toLevel)-xpForLevel(fromLevel);
  const available=BAITS.map((_,n)=>n).filter(n=>GEAR_ISLAND_STEPS[n]<=i.id&&eligibleSpecies(i.id,n).length);
  const setup=baitIndex=>{const xp=expectedCatchXP(i.id,baitIndex,options);return {baitIndex,bait:BAITS[baitIndex]?.name||'No local bait yet',xp,catches:xp?xpNeeded/xp:null};};
  const local=available.at(-1)??0,arrival=available.at(-2)??local;
  return {id:i.id,island:i.short,fromLevel,toLevel,xpNeeded,arrival:setup(arrival),local:setup(local)};
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('Future catches: ×0.90 base XP ×1.20 leveling boost. Neutral offshore repeats only; no discoveries, no boat travel time.');
  console.table(islandProgressionRows().map(r=>({island:r.island,levels:`${r.fromLevel} → ${r.toLevel}`,xp:r.xpNeeded,'arrival catches':r.arrival.catches?.toFixed(1)??'new bait required','premium catches':r.local.catches?.toFixed(1)})));
}
