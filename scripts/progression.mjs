// Deterministic XP pacing audit. Use the fish a player can actually hook with
// arrival/local bait, not the full roster, guaranteed rare rolls or discoveries.
// Integrate actual weight rolls and one-decimal gameplay rounding at fixed quantiles.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { BAITS, RARITY, eligibleSpecies, effectiveLuck, rollWeight } from '../game-data.mjs';
import { ISLANDS, MAX_LEVEL, xpForLevel, catchXP, legacyCatchXP } from '../archipelago.mjs';

const cache = new Map();
export function expectedCatchXP(island, baitIndex, { samples = 1024, castPower = 0.5, legacy = false } = {}){
  if(!Number.isInteger(samples) || samples < 1) throw new RangeError('Use at least one weight quantile.');
  const key = `${island}:${baitIndex}:${samples}:${castPower}:${legacy}`;
  if(cache.has(key)) return cache.get(key);
  const bait = BAITS[baitIndex], pool = eligibleSpecies(island, baitIndex);
  if(!bait || !pool.length) return 0;
  const reward = legacy ? legacyCatchXP : catchXP;
  const luck = effectiveLuck(baitIndex, castPower);
  let chanceTotal = 0, xpTotal = 0;
  for(const sp of pool){
    const chance = sp.weight * Math.pow(1 + luck * 2, RARITY[sp.rarity].tier - bait.lo);
    let xp = 0;
    for(let q = 0; q < samples; q++){
      const weight = +rollWeight(sp, baitIndex, () => (q + 0.5) / samples, castPower).toFixed(1);
      xp += reward(sp, weight, false); // Only repeat landings. Discovery is a one-time extra.
    }
    chanceTotal += chance;
    xpTotal += chance * xp / samples;
  }
  const result = xpTotal / chanceTotal;
  cache.set(key, result);
  return result;
}

export function islandProgressionRows({ samples = 1024, castPower = 0.5 } = {}){
  return ISLANDS.map(island => {
    const fromLevel = island.level, toLevel = ISLANDS[island.id + 1]?.level ?? MAX_LEVEL;
    const xpNeeded = xpForLevel(toLevel) - xpForLevel(fromLevel);
    function setup(baitIndex){
      const xp = expectedCatchXP(island.id, baitIndex, { samples, castPower });
      const oldXP = expectedCatchXP(island.id, baitIndex, { samples, castPower, legacy:true });
      return { baitIndex, bait:BAITS[baitIndex].name, xp, oldXP, catches:xpNeeded / xp, oldCatches:xpNeeded / oldXP };
    }
    return {
      id:island.id, island:island.short, fromLevel, toLevel, xpNeeded,
      arrival:setup(Math.max(0, island.id * 4 - 1)), // Previous island's best bait (starter worms at home).
      local:setup(island.id * 4 + 3),
    };
  });
}

function report(){
  console.log('XP pacing: actual eligible fish, 1,024 weight quantiles, neutral 50% cast, no discovery bonuses.');
  console.log('Arrival uses the previous island\'s top bait; local uses this island\'s top bait.');
  console.table(islandProgressionRows().map(r => ({
    island:r.island, levels:`${r.fromLevel} → ${r.toLevel}`, 'XP needed':r.xpNeeded,
    'XP/catch arrival':r.arrival.xp.toFixed(1), 'XP/catch local':r.local.xp.toFixed(1),
    'arrival catches old → new':`${r.arrival.oldCatches.toFixed(1)} → ${r.arrival.catches.toFixed(1)}`,
    'local catches old → new':`${r.local.oldCatches.toFixed(1)} → ${r.local.catches.toFixed(1)}`,
  })));
  console.log('Pinewater from level 15: no destination fish or later-island bait counted.');
  console.table([3,4,5,6,7].map(bait => {
    const xp = expectedCatchXP(1, bait);
    return { bait:BAITS[bait].name, 'XP/catch':xp.toFixed(1), '15 → 25 catches':((xpForLevel(25) - xpForLevel(15)) / xp).toFixed(1) };
  }));
  console.log('These are expected successful landings, not catch attempts or elapsed-time promises.');
  console.log('New-species discoveries add +50% once. Larger fish and better cast luck can improve the pace.');
  console.log('Level gates, the XP curve, saved XP/licenses and per-fish sale/XP formulas are unchanged.');
  console.log('Current equipment luck affects this audit; v37 rebalances gear prices and island-boundary stats.');
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) report();
