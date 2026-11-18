import { RODS, LINES, BAITS } from './game-data.mjs?v=30';

// The archipelago is deliberately data-driven: six islands, twenty species and
// four gear tiers per island. No distance roll can bypass an island's fish pool.
// Wider license milestones: 9 / 15 / 20 / 20 / 25 levels between destinations.
export const ISLANDS = [
  { id:0, name:'Reedhaven', short:'Reedhaven', level:1, x:0, z:0, theme:'harbor', color:'#65b987', accent:0xf2bd62,
    land:0x70b96b, sand:0xe8cf9b, rock:0x7c9288, water:0x36a4af, sky:0x9bd9ed,
    tagline:'Every great voyage starts with a little bite.',
    description:'A sunny fishing village with reed beds, a striped lighthouse and a very patient harbormaster.',
    landmark:'The Old Lighthouse', stock:'Bamboo & twine', waters:'Panfish, bass & carp' },
  { id:1, name:'Pinewater Isle', short:'Pinewater', level:10, x:-145, z:-155, theme:'forest', color:'#4b9779', accent:0xc6a974,
    land:0x548f6b, sand:0xb7b194, rock:0x637f79, water:0x438b8f, sky:0xb1d9d5,
    tagline:'Tall pines. Still water. Serious fish.',
    description:'Mossy stone terraces, towering spruce trees and a timber waterwheel beside the cold-water docks.',
    landmark:'The Timber Mill', stock:'Carbon & fluoro', waters:'Trout, salmon & catfish' },
  { id:2, name:'Sunscar Atoll', short:'Sunscar', level:25, x:130, z:-280, theme:'tropical', color:'#dfaf68', accent:0xf69e70,
    land:0x95bc70, sand:0xf0d49a, rock:0xbfa477, water:0x32b7b4, sky:0xb1e8ec,
    tagline:'Golden sand. Ancient giants.',
    description:'A palm-lined lagoon with coral gardens, a weathered sandstone arch and sun-bleached market awnings.',
    landmark:'The Sun Gate', stock:'Tournament tackle', waters:'River monsters & golden legends' },
  { id:3, name:'Frostfall Isle', short:'Frostfall', level:45, x:-120, z:-435, theme:'ice', color:'#89bdd6', accent:0xc3eaff,
    land:0xe1eff0, sand:0xb3d9df, rock:0x7a9ea8, water:0x538fac, sky:0xc8deed,
    tagline:'Where the water keeps its oldest secrets.',
    description:'Snow-capped pines, stacked blue icebergs and a frozen watchtower overlooking the deep shelf.',
    landmark:'The Icewatch', stock:'Titanium & moonsilver', waters:'Ocean giants & first mythics' },
  { id:4, name:'Emberforge', short:'Emberforge', level:65, x:145, z:-590, theme:'volcanic', color:'#cb806c', accent:0xffad65,
    land:0x645e66, sand:0x81736b, rock:0x454858, water:0x4a6f80, sky:0xd6c2bb,
    tagline:'Forged in fire. Fished from the abyss.',
    description:'Basalt columns, glowing lava seams and a smoking cube volcano. The tackle here is built for monsters.',
    landmark:'The Cinder Peak', stock:'Abyssal & leviathan', waters:'Trench beasts & ancient leviathans' },
  { id:5, name:'Moontide Sanctum', short:'Moontide', level:90, x:0, z:-800, theme:'lunar', color:'#a69bd3', accent:0xc3bbff,
    land:0x817ca6, sand:0xaba5c4, rock:0x615e84, water:0x6e79a5, sky:0xada9d0,
    tagline:'The last island. Not the last mystery.',
    description:'A quiet sanctuary of amethyst cubes, luminous trees and an ancient moon gate above the farthest water.',
    landmark:'The Moon Gate', stock:'Celestial & mythril', waters:'The final twenty legends' },
];

export function localGearPriceCeiling(island){
  if(!Number.isInteger(island) || !ISLANDS[island]) return 0;
  const from = island * 4;
  return Math.max(...[RODS, LINES, BAITS].flatMap(list => list.slice(from, from + 4).map(item => item.cost)));
}
function boatPrice(destination, savingGoal){
  // The next voyage is always more expensive than ALL local rod/line/bait stock.
  // Derive the floor from shared item prices, so future gear rebalances respect it.
  const price = Math.max(savingGoal, localGearPriceCeiling(destination - 1) * 1.25);
  const step = price < 1000 ? 50 : price < 10000 ? 250 : price < 100000 ? 500 : 5000;
  return Math.ceil(price / step) * step;
}
// Fixed saving goals, calibrated against the island an angler is LEAVING:
// about 12 / 21 / 29 / 36 / 44 landed fish using that departure island's top bait.
// The 25% local-gear premium is a minimum; prices never depend on a player's wallet.
// Boat licenses share their destination's level so the two gates cannot drift.
export const BOATS = [
  { id:0, name:'Harbor Skiff', range:0, level:ISLANDS[0].level, cost:0, speed:30, color:0xb78755, stripe:0xeee2b5, description:'Your trusty starter. Built for the home harbor.' },
  { id:1, name:'Pinewood Dinghy', range:1, level:ISLANDS[1].level, cost:boatPrice(1,550), speed:35, color:0x527f6b, stripe:0xe9d4a1, description:'A wooden runabout for your first crossing.' },
  { id:2, name:'Sunrunner', range:2, level:ISLANDS[2].level, cost:boatPrice(2,4500), speed:44, color:0xd69b52, stripe:0x68c3c5, description:'A shaded cabin and a hull made for warm seas.' },
  { id:3, name:'Frostbreaker', range:3, level:ISLANDS[3].level, cost:boatPrice(3,22500), speed:52, color:0x7eb3c7, stripe:0xe7f3f3, description:'Reinforced blue steel for the frozen shelf.' },
  { id:4, name:'Cinderwake', range:4, level:ISLANDS[4].level, cost:boatPrice(4,130000), speed:60, color:0x59606b, stripe:0xf4a15e, description:'An ironclad cruiser for rough volcanic waters.' },
  { id:5, name:'Astral Voyager', range:5, level:ISLANDS[5].level, cost:boatPrice(5,320000), speed:72, color:0x8a7fbc, stripe:0xd1e4ff, description:'A moonlit expedition vessel. No water is beyond you.' },
];

export const MAX_LEVEL = 99;
export function xpForLevel(level){
  const n = Math.max(0, Math.min(MAX_LEVEL - 1, Math.floor(level) - 1));
  return 90 * n + 22 * n * n;
}
export function levelForXp(xp){
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return Math.min(MAX_LEVEL, Math.floor((-90 + Math.sqrt(8100 + 88 * safe)) / 44) + 1);
}
export function levelProgress(xp){
  const level = levelForXp(xp);
  const start = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, current:xp - start, needed:next - start, ratio:level === MAX_LEVEL ? 1 : (xp - start) / (next - start) };
}
export function catchXP(sp, weight, isNew = false){
  const tiers = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5 };
  const base = 20 + sp.island * 22 + tiers[sp.rarity] * 6 + 8 * Math.min(1, weight / sp.maxW);
  return Math.round(base * (isNew ? 1.5 : 1));
}
export const gearIsland = tier => Math.floor(tier / 4);
// Saved licenses keep earned access when a later update raises the milestones.
export function hasIslandLicense(target, xp, licenses=[]){
  const island = ISLANDS[target];
  return !!island && (levelForXp(xp) >= island.level || (Array.isArray(licenses) && licenses.includes(island.id)));
}
export function travelRequirement(target, xp, boat, licenses=[]){
  const island = ISLANDS[target];
  if(!island) return 'Unknown destination.';
  if(!hasIslandLicense(target, xp, licenses)) return `Reach level ${island.level} to visit ${island.name}.`;
  const vessel = BOATS[boat];
  if(!vessel || vessel.range < target) return `Requires the ${BOATS[target].name} or better. Visit the boat shop.`;
  return null;
}
