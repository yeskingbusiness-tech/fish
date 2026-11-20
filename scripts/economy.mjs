// Deterministic real-pool audit, including six-decimal catch precision.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { RODS,LINES,BAITS,eligibleSpecies,speciesChance,fishValue,rollWeight,roundWeight } from '../game-data.mjs';
import { ISLANDS,BOATS,gearIsland } from '../archipelago.mjs';
const cache=new Map();
export function expectedCatchIncome(island,baitIndex,samples=256,castPower=.5,shorePenalty=0){
  if(!Number.isInteger(samples)||samples<1)throw new RangeError('Use at least one quantile');
  const key=[island,baitIndex,samples,castPower,shorePenalty].join(':');if(cache.has(key))return cache.get(key);
  let chances=0,total=0;
  for(const sp of eligibleSpecies(island,baitIndex)){
    const chance=speciesChance(sp,baitIndex,castPower,shorePenalty);let sales=0;
    for(let n=0;n<samples;n++)sales+=fishValue(sp,roundWeight(rollWeight(sp,baitIndex,()=>(n+.5)/samples,castPower,shorePenalty)));
    chances+=chance;total+=chance*sales/samples;
  }
  const result=chances?total/chances:0;cache.set(key,result);return result;
}
export function gearEconomyRows(){return RODS.slice(1,40).map((rod,n)=>{
  const tier=n+1,island=gearIsland(tier),previous=Math.max(0,tier-1);
  // Final island's new rarity needs its entry bait. Save for it before departure.
  const income=expectedCatchIncome(island,previous)||expectedCatchIncome(Math.max(0,island-1),previous);
  return {tier:tier+1,island:ISLANDS[island].short,income,rod:rod.cost,line:LINES[tier].cost,bait:BAITS[tier].cost,rodCatches:rod.cost/income,lineCatches:LINES[tier].cost/income,baitCatches:BAITS[tier].cost/income};
});}
export function islandEntryRows(){return ISLANDS.slice(1).map(i=>({island:i.short,rod:RODS[i.id*2].cost,line:LINES[i.id*2].cost,bait:BAITS[i.id*2].cost}));}
export function boatEconomyRows(){return BOATS.map(b=>({boat:b.name,cost:b.cost,speed:b.speed,size:b.size,access:'ALL level-unlocked territories'}));}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('Offshore, neutral charge, no collection bonuses. Default sale reduction ×0.85 is included.');
  console.table(gearEconomyRows().map(r=>({...r,income:+r.income.toFixed(1),rodCatches:+r.rodCatches.toFixed(1),lineCatches:+r.lineCatches.toFixed(1),baitCatches:+r.baitCatches.toFixed(1)})));
  console.table(boatEconomyRows());console.log('Optional boats have no access premium. Shore penalty and return trips add effort; rewards are paid on land at a market.');
}
