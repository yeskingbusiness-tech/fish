// Historical catches retain their original weight, name and identity. They are
// displayable/sellable/holdable, but never enter the new 400-entry spawn pool.
import { LEGACY_V8_SPECIES } from './legacy-v8-data.mjs?v=43';
import { SPECIES } from './game-data.mjs?v=43';
export const LEGACY_ISLAND_MAP=Object.freeze([0,1,4,10,9,15]);
const renamed={'great-white':'Great White Shark','megamouth':'Megamouth Shark','goonch':'Goonch Catfish'};
export function replacementFor(old){
  const name=renamed[old.id]||old.name,choices=SPECIES.filter(s=>s.name===name);
  return choices.find(s=>s.island===LEGACY_ISLAND_MAP[old.island])||choices[0]||null;
}
export const LEGACY_SPECIES=Object.freeze(LEGACY_V8_SPECIES.map(old=>{
  const replacement=replacementFor(old);
  return Object.freeze({...old,id:'legacy-'+old.id,number:null,legacy:true,legacyIsland:old.island,island:LEGACY_ISLAND_MAP[old.island],
    displaySpan:replacement?.displaySpan??(old.id==='pale-sun'?1.2:Math.min(32,.45+.65*Math.sqrt(old.maxW))),
    desc:old.desc+' Historical catch from the original collection; its recorded weight is preserved.'});
}));
export const ALL_CATCH_SPECIES=Object.freeze([...SPECIES,...LEGACY_SPECIES]);
