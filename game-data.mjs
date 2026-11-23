// Pure collection, equipment and fishing rules. No size is derived from rarity.
import { COLLECTION_ROSTER } from './collection-roster.mjs?v=44';
import { ISLANDS, GEAR_PER_ISLAND } from './island-data.mjs?v=44';
import { fishAppearance } from './fish-appearance.mjs?v=44';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SALE_MULTIPLIER=.85;
export const RARITY_ORDER=Object.freeze(['common','uncommon','rare','epic','legendary','mythic','exotic','divine','ancient','celestial','transcendent','unfathomable']);
const colours=['#858b91','#32905e','#347fd0','#8854bc','#db802b','#c83f49','#d855a2','#b68a10','#876047','#75c9ed','rainbow','#13151b'];
export const RARITY=Object.freeze(Object.fromEntries(RARITY_ORDER.map((key,tier)=>[key,Object.freeze({tier,label:key.toUpperCase(),color:colours[tier],value:[24,65,180,520,1500,4600,12000,32000,85000,220000,580000,1500000][tier],spawn:26*.55**tier})])));
export const ISLAND_RARITIES=Object.freeze(ISLANDS.map(i=>{
  const tiers=COLLECTION_ROSTER.filter(s=>s.island===i.id).map(s=>RARITY[s.rarity].tier);
  return Object.freeze([Math.min(...tiers),Math.max(...tiers)]);
}));
export const SPECIES=Object.freeze(COLLECTION_ROSTER.map(row=>{
  const a=fishAppearance(row),relative=RARITY[row.rarity].tier-ISLAND_RARITIES[row.island][0];
  return Object.freeze({...row,color:a.tones[1],belly:a.tones[2],pattern:a.marks,
    desc:`${row.name} · ${ISLANDS[row.island].environment}. ${['A familiar inhabitant of these waters.','A distinctive catch from this territory.','A prized entry in the local field guide.'][Math.min(2,relative)]}`,
    strength:.24+row.island*.05+relative*.11,difficulty:(.7+relative*.17)*1.55**row.island,
    size:row.displaySpan,pts:Math.round(20*(1+row.island)*1.4**relative),weight:RARITY[row.rarity].spawn});
}));
const order=new Map(SPECIES.map((sp,i)=>[sp.id,i]));
export function sortFishIndex(items=SPECIES){return [...items].sort((a,b)=>a.island-b.island||RARITY[a.rarity].tier-RARITY[b.rarity].tier||order.get(a.id)-order.get(b.id));}

// Historical 40-tier definitions are retained as a migration/catalog source;
// the live shops expose only the curated twelve-tier progression below.
const entry=[0,500,1300,3200,7500,17000,38000,83000,180000,390000,830000,1750000,3650000,7600000,15800000,32800000,68000000,141000000,292000000,605000000];
export const GEAR_ENTRY_PRICES=Object.freeze(entry);
const round=n=>Math.round(n/10)*10;
const price=(island,rung,kind)=>island===0?(rung?round([100,80,140][kind]*1.45):0):round((rung?entry[island]*[1.6,1.45,1.8][kind]:entry[island])*1.28);
export const LEGACY_RODS=Object.freeze([...ISLANDS.flatMap(i=>[0,1].map(r=>Object.freeze({id:'rod'+(i.id*2+r),island:i.id,
  name:i.id===0?['Bamboo Pole','Willow Rod'][r]:`${i.stock} ${r?'Master Rod':'Rod'}`,color:i.accent,cost:price(i.id,r,0),
  cast:12+i.id*5+r*2,power:1.55**i.id*1.18**r,tension:1.55/Math.sqrt(1.55**i.id*1.18**r),reel:+(.75+i.id*.09+r*.035).toFixed(3)}))),Object.freeze({id:'rod-reedhaven-elite',island:0,name:'Reedhaven River Rod',color:ISLANDS[0].accent,cost:320,cast:19,power:1.55**.0*1.18**2.2,tension:1.55/Math.sqrt(1.18**2.2),reel:.87})]);
export const LEGACY_LINES=Object.freeze([...ISLANDS.flatMap(i=>[0,1].map(r=>Object.freeze({id:'line'+(i.id*2+r),island:i.id,
  name:i.id===0?['Cotton Twine','Reinforced Mono'][r]:`${i.stock} ${r?'Braided':'Woven'} Line`,color:i.accent,cost:price(i.id,r,1),
  rating:Math.round(3*2.18**i.id*1.8**r),control:1.55**i.id*1.18**r,strain:1.6/Math.sqrt(1.55**i.id*1.18**r)}))),Object.freeze({id:'line-reedhaven-elite',island:0,name:'Reedhaven Braided Line',color:ISLANDS[0].accent,cost:290,rating:18,control:1.55**2.2,strain:1.6/Math.sqrt(1.55**2.2)})]);
export const LEGACY_BAITS=Object.freeze([...ISLANDS.flatMap(i=>[0,1].map(r=>{
  const [lo,hi]=ISLAND_RARITIES[i.id];
  // Both local baits cover every local rarity; premium bait improves luck
  // and weight without losing any eligible small species.
  return Object.freeze({id:'bait'+(i.id*2+r),island:i.id,name:i.id===0?['Garden Worm','Golden Corn'][r]:`${i.stock} ${r?'Lure':'Bait'}`,
    color:i.accent,cost:price(i.id,r,2),lo,hi,luck:+(i.id*.22+r*.08).toFixed(2),weightBonus:+((i.id*2+r)*.005).toFixed(3)});
})),Object.freeze({id:'bait-reedhaven-elite',island:0,name:'Reedhaven Minnow Lure',color:ISLANDS[0].accent,cost:380,lo:ISLAND_RARITIES[0][0],hi:ISLAND_RARITIES[0][1],luck:.16,weightBonus:.2})]);

// Curated, memorable kit milestones replace the former 40-step ladders. Each
// category uses the same twelve island gates so saves, vendors, and progression
// stay aligned while every displayed upgrade makes a substantial jump.
export const GEAR_SOURCE_INDICES=Object.freeze([0,40,7,11,15,19,21,25,29,33,35,39]);
export const GEAR_ISLAND_STEPS=Object.freeze([0,0,3,5,7,9,10,12,14,16,17,19]);
const curate=list=>Object.freeze(GEAR_SOURCE_INDICES.map((source,index)=>Object.freeze({...list[source],tier:index,cost:source===0?0:source===40?Math.round(list[source].cost*.45/10)*10:Math.round(list[source].cost*.5/10)*10})));
export const RODS=curate(LEGACY_RODS);
export const LINES=curate(LEGACY_LINES);
export const BAITS=Object.freeze(GEAR_SOURCE_INDICES.map((source,tier)=>Object.freeze({...LEGACY_BAITS[source],tier,cost:source===0?0:Math.round(LEGACY_BAITS[source].cost*(source===40?.5:.5)/10)*10,weightBonus:+(tier*.012).toFixed(3)})));

// Rare tiny animals are still valuable. This is an economy scale, not a mass
// scale. The explicit 15% reduction applies once before collection rewards.
const saleScales=ISLANDS.map(i=>i.id===0?.52:(entry[i.id]/(i.id===19?32:22+i.id*1.4))/RARITY[RARITY_ORDER[ISLAND_RARITIES[i.id][0]]].value);
export function fishBaseValue(sp,weight){
  const rel=clamp((Number(weight)-sp.minW)/Math.max(.000001,sp.maxW-sp.minW),0,1);
  if(sp.legacy){
    const bulk=.6+.4*Math.pow(Math.max(.5,Number(weight))/50,.35);
    return Math.max(6,Math.round(RARITY[sp.rarity].value*(.5+.5*rel)*bulk*(1+sp.legacyIsland*.15)));
  }
  return Math.max(6,Math.round(RARITY[sp.rarity].value*saleScales[sp.island]*(.5+.5*rel)));
}
export function fishValue(sp,weight){return Math.max(1,Math.round(fishBaseValue(sp,weight)*SALE_MULTIPLIER));}
export function baitWindow(index){const b=BAITS[index]||BAITS[0];return [b.lo,b.hi];}
export function eligibleSpecies(island,index){
  const b=BAITS[index];if(!b||!Number.isInteger(island)||!ISLANDS[island])return [];
  return SPECIES.filter(s=>s.island===island&&RARITY[s.rarity].tier>=b.lo&&RARITY[s.rarity].tier<=b.hi);
}
export function castLuckModifier(power=.5){return ((Number.isFinite(power)?clamp(power,0,1):.5)*2-1)*.1;}
// Shore suppresses the whole luck multiplier, not an unsafe negative spawn
// weight. -95% cannot be cancelled by buying endgame bait and standing on a dock.
export function effectiveLuck(index=0,power=.5,shorePenalty=0){
  return Math.max(-.98,(1+(BAITS[index]||BAITS[0]).luck+castLuckModifier(power))*(1+clamp(shorePenalty,-.95,0))-1);
}
export function speciesChance(sp,index=0,power=.5,shorePenalty=0){
  const b=BAITS[index]||BAITS[0],luck=effectiveLuck(index,power,shorePenalty);
  return sp.weight*Math.pow(Math.max(.02,1+luck*2),RARITY[sp.rarity].tier-b.lo);
}
export function pickSpecies(island,index,random=Math.random,power=.5,shorePenalty=0){
  const list=eligibleSpecies(island,index);if(!list.length)return null;
  const weights=list.map(sp=>speciesChance(sp,index,power,shorePenalty));let r=clamp(random(),0,1)*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<list.length;i++){r-=weights[i];if(r<=0)return list[i];}return list.at(-1);
}
export function rollWeight(sp,index=0,random=Math.random,power=.5,shorePenalty=0){
  const bait=BAITS[index]||BAITS[0],luck=effectiveLuck(index,power,shorePenalty);
  const t=Math.pow(clamp(random(),0,1),1/Math.max(.16,1+luck*1.8));
  const weight=clamp(sp.minW+(sp.maxW-sp.minW)*t,sp.minW,sp.maxW),bonus=weight*bait.weightBonus,room=sp.maxW-weight;
  return !bonus||!room?weight:Math.min(sp.maxW,weight+bonus*room/(bonus+room));
}
// Six decimal places retain millipound species and their specimen differences.
export const roundWeight=weight=>Math.round(Number(weight)*1e6)/1e6;
export function formatWeight(weight){const w=Number(weight);return Number.isFinite(w)?w.toLocaleString('en-US',{minimumFractionDigits:w>=1?1:0,maximumFractionDigits:w>=1?2:w>=.1?3:6}):'—';}
export function formatCatchMass(weight){const w=Number(weight);if(!Number.isFinite(w)||w<0)return '—';if(w<1)return `${(w*16).toLocaleString('en-US',{maximumFractionDigits:2})} oz`;if(w>=2000)return `${(w/2000).toLocaleString('en-US',{maximumFractionDigits:1})} tons`;return `${w.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:2})} lb`;}
export { GEAR_PER_ISLAND };
