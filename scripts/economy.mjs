// Deterministic balance audit, not a runtime/player-specific price adjustment.
// Integrate each eligible species' weight distribution at fixed quantiles, then
// apply its actual bait-weighted spawn chance. Catch weights are rounded to one
// decimal just as they are in hookFish(); market values include that rounding.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { RODS, LINES, BAITS, RARITY, eligibleSpecies, effectiveLuck, fishValue, rollWeight } from '../game-data.mjs';
import { ISLANDS, BOATS, gearIsland, localGearPriceCeiling } from '../archipelago.mjs';

const cache = new Map();
export function expectedCatchIncome(island, baitIndex, samples = 1024, castPower = 0.5){
  const key = `${island}:${baitIndex}:${samples}:${castPower}`;
  if(cache.has(key)) return cache.get(key);
  const bait = BAITS[baitIndex], pool = eligibleSpecies(island, baitIndex);
  if(!bait || !pool.length) return 0;
  const luck = effectiveLuck(baitIndex, castPower);
  let chanceTotal = 0, saleTotal = 0;
  for(const sp of pool){
    const chance = sp.weight * Math.pow(1 + luck * 2, RARITY[sp.rarity].tier - bait.lo);
    let sales = 0;
    for(let q = 0; q < samples; q++){
      const weight = +rollWeight(sp, baitIndex, () => (q + 0.5) / samples, castPower).toFixed(1);
      sales += fishValue(sp, weight);
    }
    chanceTotal += chance;
    saleTotal += chance * sales / samples;
  }
  const result = saleTotal / chanceTotal;
  cache.set(key, result);
  return result;
}

export function gearEconomyRows(){
  return RODS.slice(1).map((rod, offset) => {
    const index = offset + 1, island = gearIsland(index);
    const income = expectedCatchIncome(island, index - 1);
    return {
      tier:index + 1, island:ISLANDS[island].short, income,
      rod:rod.cost, line:LINES[index].cost, bait:BAITS[index].cost,
      rodCatches:rod.cost / income, lineCatches:LINES[index].cost / income,
      baitCatches:BAITS[index].cost / income,
    };
  });
}
export function boatEconomyRows(){
  return BOATS.slice(1).map(boat => {
    const departure = boat.range - 1;
    const income = expectedCatchIncome(departure, departure * 4 + 3);
    const gearCeiling = localGearPriceCeiling(departure);
    return { boat:boat.name, departure:ISLANDS[departure].short, gearCeiling, premium:boat.cost / gearCeiling - 1, cost:boat.cost, income, catches:boat.cost / income };
  });
}
function report(){
  console.log('Saving goals assume a neutral 50% cast. Low/full charge applies -10/+10 luck points.');
  console.log('Base saving goals exclude collection rewards: each completed island adds +5% sale coins, up to +30%.');
  console.log('Gear: income from the previous bait in the shop\'s own island.');
  console.table(gearEconomyRows().map(r => ({
    tier:r.tier, island:r.island, 'coins/catch':r.income.toFixed(1),
    rod:r.rod, line:r.line, bait:r.bait,
    'rod catches':r.rodCatches.toFixed(1), 'line catches':r.lineCatches.toFixed(1), 'bait catches':r.baitCatches.toFixed(1),
  })));
  console.log('Boats: income from the departure island\'s best local bait, never destination fish.');
  console.table(boatEconomyRows().map(r => ({
    boat:r.boat, leaving:r.departure, 'local gear max':r.gearCeiling, cost:r.cost,
    'above local gear':(r.premium * 100).toFixed(1) + '%',
    'coins/catch':r.income.toFixed(1), 'landed catches':r.catches.toFixed(1),
  })));
  console.log('These are expected landed-and-sold catches, not guarantees or catch attempts.');
  console.log('Boat prices must exceed local gear by at least 25%; current bait luck and weight bonuses are included.');
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) report();
