import { ISLAND_LAYOUTS } from './island-layout.mjs?v=43';
// Exact destination order/unlock levels from the 400-entry collection brief.
// Environments and landmark geometry are presentation data, not rarity/size rules.
const rows=[
  ['Reedhaven','Reedhaven',1,'Freshwater lake','harbor','The Old Lighthouse','Bamboo','Harbor Skiff',0x70b96b,0xe8cf9b,0x7c9288,0x36a4af,0x9bd9ed,0xf2bd62,'Reed beds and a sunny village around the home lake.'],
  ['Pinewater Isle','Pinewater',10,'Forest lakes and streams','forest','The Timber Mill','Pinewood','Pinewood Dinghy',0x548f6b,0xb7b194,0x637f79,0x438b8f,0xb1d9d5,0xc6a974,'Tall spruce trees, mossy terraces and a working timber waterwheel.'],
  ['Ironwood River','Ironwood',20,'Rivers and waterfalls','river','The Ironwood Falls','Ironwood','River Runner',0x638c61,0xbab091,0x6f8583,0x448eaa,0xb9dce0,0xb8ce9d,'A cascading river beneath an old stone aqueduct and ironwood groves.'],
  ['Brackwater Marsh','Brackwater',35,'Swamp','swamp','The Root Cathedral','Bogwood','Marsh Skimmer',0x64794c,0x8c8664,0x56645c,0x586c4c,0xa9b6a0,0xc4b277,'Twisted cypress roots, hanging moss and dark, still swamp water.'],
  ['Sunscar Atoll','Sunscar',50,'Tropical lagoons','tropical','The Sun Gate','Sunsteel','Sunrunner',0x95bc70,0xf0d49a,0xbfa477,0x32b7b4,0xb1e8ec,0xf69e70,'Warm lagoons, white sand, palm canopies and a weathered sandstone arch.'],
  ['Coralreach','Coralreach',65,'Coral reefs','coral','The Coral Crown','Reefglass','Reef Glider',0x83b6a0,0xe5dbc0,0xa0a0a2,0x38c1c1,0xa6e0ef,0xf1a49c,'Branching coral towers, turquoise channels and bright reef gardens.'],
  ['Breaker Coast','Breaker',80,'Rocky coastline','coast','The Broken Arch','Coastal','Coast Cutter',0x83947b,0xb9b7a2,0x6a7783,0x497f98,0xc4d3da,0xd9cfad,'Sea stacks, wind-shaped stone arches and wave-washed fishing ledges.'],
  ['Stormbreak Isles','Stormbreak',100,'Open ocean and storms','storm','The Storm Beacon','Stormforged','Stormrider',0x627879,0x9caaa5,0x4b5a6d,0x365d78,0x788caa,0xe6dba5,'Dark cloudbanks, a copper storm beacon and rain sweeping the open ocean.'],
  ['Thornwild Delta','Thornwild',120,'Jungle rivers','jungle','The Tangled Canopy','Junglewood','Delta Explorer',0x518b57,0xa8a774,0x667c61,0x4d8f77,0xa3c9ac,0xe6be7f,'Broad-leaf jungle, buttress roots and a stepped ruin above braided rivers.'],
  ['Emberforge','Emberforge',140,'Volcanic waters','volcanic','The Cinder Peak','Cindersteel','Cinderwake',0x645e66,0x81736b,0x454858,0x4a6f80,0xd6c2bb,0xffad65,'Basalt columns, luminous lava seams and a smoking cube volcano.'],
  ['Frostfall Isle','Frostfall',160,'Frozen freshwater','ice','The Icewatch','Froststeel','Frostbreaker',0xe1eff0,0xb3d9df,0x7a9ea8,0x538fac,0xc8deed,0xc3eaff,'Snow-laden pines, a frozen watchtower and blue freshwater ice shelves.'],
  ['Skyglass Fjord','Skyglass',180,'Glacial ocean','fjord','The Glass Glacier','Skyglass','Fjord Voyager',0xc9e4e6,0xaed0d8,0x7396a6,0x367e9e,0xb4d3e7,0xc5f3ff,'Tall glacial walls split around a narrow turquoise ocean passage.'],
  ['Shattered Shelf','Shattered',200,'Deep-sea canyon','canyon','The Fractured Spires','Abyssal','Shelf Diver',0x697986,0x83929a,0x455a70,0x274b68,0x859eaf,0x9ed4dc,'A dark canyon opens between jagged slate pillars and fractured ledges.'],
  ["Leviathan's Grave",'The Grave',225,'Shipwrecks and ancient bones','wreck','The Ribcage Wreck','Bonebound','Gravekeeper',0x787e76,0xb5afa0,0x5e676e,0x3b6570,0x9eafaf,0xdfd7b8,'A broken ship rests beneath ribs from something far older than the harbor.'],
  ['Ashen Trench','Ashen Trench',250,'Volcanic deep sea','vents','The Black Smokers','Ventforged','Trenchwalker',0x665e69,0x7c7276,0x393f51,0x344b62,0x998c9f,0xe4a26e,'Hydrothermal chimneys, sulphur crusts and amber light in the deep.'],
  ['Moontide Sanctum','Moontide',275,'Ancient underwater temples','lunar','The Moon Gate','Moonsilver','Astral Voyager',0x817ca6,0xaba5c4,0x615e84,0x6e79a5,0xada9d0,0xc3bbff,'Amethyst terraces and a luminous moon gate above an ancient temple.'],
  ['Starfall Basin','Starfall',300,'Celestial waters','celestial','The Fallen Orrery','Starwoven','Starfarer',0x7e8ca7,0xb3b9d5,0x535f87,0x557fa9,0xa2b9e0,0xc4e6ff,'Meteor crystals and a broken stellar orrery hang over luminous water.'],
  ['The Null Trench','Null Trench',325,'Otherworldly abyss','void','The Null Monolith','Voidbound','Null Navigator',0x4d5369,0x707487,0x303448,0x27384f,0x737c9b,0xa2a8dd,'Split obsidian monoliths surround a dark, silent rift in the water.'],
  ["Eternity's Reach",'Eternity',350,'Ancient cosmic ocean','time','The Hourglass Ruin','Epoch','Timekeeper',0x8d918c,0xc2bca4,0x686f81,0x65898f,0xb5b8cf,0xf0dca5,'An enormous hourglass ruin marks a coast worn smooth by impossible ages.'],
  ["Origin's End",'Origin',400,'Primordial ocean','origin','The First Spring','Genesis','Origin Ark',0x8faaa1,0xd2d1bb,0x687d83,0x5b9b9e,0xc3d9df,0xf2e4bc,'A white stone spring and concentric terraces rise from the primordial sea.'],
];
// Hand-authored outlying terrain: shape and elevation, not just palettes.
const landforms=[
 [[-33,38,12,26,2],[23,62,20,10,2]],
 [[-34,48,14,32,5],[25,68,24,22,7]],
 [[-34,35,13,46,10],[32,62,12,36,12],[-36,72,20,15,15]],
 [[-33,22,12,18,1],[32,42,14,18,1],[-22,65,18,16,1]],
 [[-35,42,16,28,1],[30,66,22,12,1]],
 [[-36,27,14,15,2],[32,44,18,18,2],[-27,67,15,12,3]],
 [[-35,36,12,30,12],[27,70,22,17,15]],
 [[-35,50,12,25,10],[32,64,17,19,13]],
 [[-35,38,16,30,4],[-28,65,20,16,6],[27,63,18,18,4]],
 [[-32,54,21,27,15],[20,73,29,20,21]],
 [[-34,36,14,32,3],[32,62,20,20,5]],
 [[-35,39,15,45,18],[31,54,12,36,23]],
 [[-36,40,12,42,22],[33,57,12,34,19]],
 [[-34,46,16,29,5],[30,66,17,17,6]],
 [[-34,38,14,31,13],[31,63,16,23,11]],
 [[-33,41,17,32,5],[24,69,25,19,8]],
 [[-33,50,15,26,11],[32,61,17,22,14]],
 [[-34,42,12,34,20],[33,63,13,28,24]],
 [[-35,45,17,30,8],[30,68,24,19,10]],
 [[-34,44,16,30,4],[32,45,16,30,4],[0,71,54,16,6]],
];
function waterObstacles(theme){
  if(theme==='ice')return Array.from({length:6},(_,i)=>({x:-20+i*6,z:-15-i%2*4,w:4-i*.35,d:3,h:2+i*.6}));
  if(theme==='fjord')return Array.from({length:7},(_,k)=>({x:-48+k*7,z:-15-k%2*5,w:3,d:3,h:2+k%3}));
  if(theme==='coast')return [{x:-14,z:-16,w:2,d:3,h:5},{x:-30,z:-14,w:3,d:4,h:7}];
  if(theme==='coral')return Array.from({length:16},(_,k)=>({x:-20+k*2,z:-8-k%3*2,w:1,d:1,h:.8+k%4*.6}));
  return [];
}
// Irregular, fixed positions selected with generous open-water corridors.
// Stable per world version: reloads never reshuffle the archipelago.
export const WORLD_LAYOUT_VERSION=2;
const centers=[[-390,25],[-320,-770],[-1470,-440],[-1370,-1220],[-1700,-2000],[-1640,-2880],[-1250,-3590],[-1000,-2500],[-590,-1620],[110,-1320],[890,-680],[1710,-890],[810,-1380],[1660,-2060],[840,-2260],[-50,-2290],[130,-3070],[820,-2950],[590,-3640],[1740,-3450]];
export const ISLANDS=Object.freeze(rows.map((r,id)=>{
  const [name,short,level,environment,theme,landmark,stock,boatName,land,sand,rock,water,sky,accent,description]=r;
  const layout=ISLAND_LAYOUTS[id],[cx,cz]=centers[id];
  const x=cx-[0,25,0,-25][layout.quarter],z=cz-[25,0,-25,0][layout.quarter];
  return Object.freeze({id,key:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),name,short,level,environment,theme,landmark,stock,boatName,
    x,z,layout,land,sand,rock,water,sky,accent,color:'#'+land.toString(16).padStart(6,'0'),
    waterObstacles:waterObstacles(theme).map(f=>Object.freeze({...f,x:f.x*layout.landmarkMirror})),landforms:landforms[id].map(([x,z,w,d,h])=>Object.freeze({x,z,w,d,h})),description,tagline:environment+' · '+landmark,waters:environment});
}));
export const ISLAND_COUNT=ISLANDS.length;
export const GEAR_PER_ISLAND=2;
export const MAX_LEVEL=400;
export const RARITY_AVAILABILITY=Object.freeze({common:[1,2],uncommon:[1,4],rare:[1,6],epic:[2,8],legendary:[4,9],mythic:[6,11],exotic:[8,13],divine:[10,15],ancient:[12,17],celestial:[14,19],transcendent:[16,19],unfathomable:[20,20]});
