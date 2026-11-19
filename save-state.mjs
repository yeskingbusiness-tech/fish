import { SPECIES, RODS, LINES, BAITS, roundWeight } from './game-data.mjs?v=41';
import { BOATS, ISLANDS, xpForLevel, levelForXp, legacyCatchXP, hasIslandLicense, completedCollections } from './archipelago.mjs?v=41';
import { LEGACY_V8_SPECIES } from './legacy-v8-data.mjs?v=41';
import { ALL_CATCH_SPECIES, LEGACY_SPECIES, LEGACY_ISLAND_MAP, replacementFor } from './legacy-catalog.mjs?v=41';
import { boatMoveBlock } from './navigation.mjs?v=41';
export const SAVE_VERSION=9;
export const SAVE_KEY='reel-deal-save-v9';
export const LEGACY_KEYS=['reel-deal-save-v8','reel-deal-save-v7','reel-deal-save-v6','reel-life-3d-save-v6'];
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Math.max(0,Number(n)):fallback;
const integer=n=>Math.min(Number.MAX_SAFE_INTEGER,Math.floor(finite(n)));
const ids=(items,max)=>[...new Set([0,...(Array.isArray(items)?items:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<max)])].sort((a,b)=>a-b);
const byId=new Map(ALL_CATCH_SPECIES.map(s=>[s.id,s]));
const uniqueName=new Map(ALL_CATCH_SPECIES.map(s=>[s.name,ALL_CATCH_SPECIES.filter(f=>!f.legacy&&f.name===s.name).length===1?SPECIES.find(f=>f.name===s.name):null]));
export function decodeFish(items){
  if(!Array.isArray(items))return [];
  return items.flatMap(e=>{const sp=e&&(e.id?byId.get(e.id):uniqueName.get(e.n)),w=Number(e?.w);return sp&&Number.isFinite(w)&&w>0?[{sp,weight:sp.legacy?w:roundWeight(Math.max(sp.minW,Math.min(sp.maxW,w)))}]:[];});
}
const encode=list=>list.map(e=>({id:e.sp.id,n:e.sp.name,w:e.weight}));
export function migrateV8(d,legacyV6=false){
  const oldByName=new Map(LEGACY_V8_SPECIES.map((s,i)=>[s.name,{old:s,sp:LEGACY_SPECIES[i]}]));
  const convert=items=>Array.isArray(items)?items.flatMap(e=>{const match=oldByName.get(e?.n),w=Number(e?.w);return match&&Number.isFinite(w)&&w>0?[{id:match.sp.id,n:match.sp.name,w}]:[];}):[];
  const bag=convert(d.bag),log=convert(d.log),discoveries={},oldDiscoveries={};
  for(const old of LEGACY_V8_SPECIES){const r=d.discoveries?.[old.id];if(integer(r?.count)>0)oldDiscoveries[old.id]={count:integer(r.count),best:finite(r.best),first:typeof r.first==='string'?r.first:''};}
  const logCounts={};for(const e of log){const id=e.id.slice(7),r=logCounts[id]||(logCounts[id]={count:0,best:0,first:''});r.count++;r.best=Math.max(r.best,e.w);}
  for(const [id,r]of Object.entries(logCounts)){if(!oldDiscoveries[id])oldDiscoveries[id]=r;else oldDiscoveries[id].best=Math.max(oldDiscoveries[id].best,r.best);}
  for(const e of bag){const id=e.id.slice(7);if(!oldDiscoveries[id])oldDiscoveries[id]={count:1,best:e.w,first:''};}
  const historicBest=oldByName.get(d.best?.name);
  if(historicBest&&finite(d.best?.weight)>0&&!oldDiscoveries[historicBest.old.id])oldDiscoveries[historicBest.old.id]={count:1,best:Number(d.best.weight),first:''};
  const earned=[];
  for(let i=0;i<6;i++)if(LEGACY_V8_SPECIES.filter(s=>s.island===i).every(s=>oldDiscoveries[s.id]))earned.push(LEGACY_ISLAND_MAP[i]);
  for(const old of LEGACY_V8_SPECIES){const r=oldDiscoveries[old.id];if(!r)continue;discoveries['legacy-'+old.id]={...r};const next=replacementFor(old);if(next)discoveries[next.id]={...r};}
  const owned={},gear={},equipmentArchive={};
  for(const kind of ['rod','line','bait']){
    const list=ids(d.owned?.[kind],24),map=t=>LEGACY_ISLAND_MAP[Math.floor(t/4)]*2+(t%4>=2?1:0);
    owned[kind]=[...new Set(list.map(map))].sort((a,b)=>a-b);gear[kind]=list.includes(d.gear?.[kind])?map(d.gear[kind]):0;equipmentArchive[kind]=list;
  }
  let xp=integer(d.xp),oldBoats=ids(d.ownedBoats,6),boat=oldBoats.includes(d.boat)?d.boat:0;
  if(legacyV6){
    const rank=Math.max(...Object.values(equipmentArchive).flat().map(t=>Math.floor(t/4)));
    const inferred=log.reduce((sum,e)=>{const old=oldByName.get(e.n).old;return sum+legacyCatchXP(old,e.w);},0);
    xp=Math.max(integer(d.caught)*28,inferred,xpForLevel([1,5,12,22,35,50][rank]));oldBoats=ids([rank],6);boat=rank;
  }
  const gates=integer(d.version)>=8?[1,10,25,45,65,90]:[1,5,12,22,35,50];
  const oldLicenses=ids(d.licenses,6);
  for(let i=0;i<6;i++)if(levelForXp(xp)>=gates[i]&&!oldLicenses.includes(i))oldLicenses.push(i);
  const zone=LEGACY_ISLAND_MAP[Number.isInteger(d.zone)&&d.zone>=0&&d.zone<6?d.zone:0];
  const bestMatch=oldByName.get(d.best?.name);
  const best=bestMatch&&finite(d.best.weight)>0?{id:bestMatch.sp.id,name:bestMatch.sp.name,weight:Number(d.best.weight)}:null;
  return {...d,version:9,xp,zone,boat,ownedBoats:oldBoats,owned,gear,equipmentArchive,
    licenses:oldLicenses.map(i=>LEGACY_ISLAND_MAP[i]),visited:ids(d.visited,6).map(i=>LEGACY_ISLAND_MAP[i]),completedIslands:earned,discoveries,bag,log,best,sailing:null};
}
export function normalizeSave(raw={},legacyV6=false){
  let d=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  if(legacyV6||integer(d.version)<9)d=migrateV8(d,legacyV6);
  const owned={},gear={};for(const [kind,list]of Object.entries({rod:RODS,line:LINES,bait:BAITS})){owned[kind]=ids(d.owned?.[kind],list.length);gear[kind]=owned[kind].includes(d.gear?.[kind])?d.gear[kind]:0;}
  const bag=decodeFish(d.bag),log=decodeFish(d.log),discoveries={};
  for(const sp of ALL_CATCH_SPECIES){const r=d.discoveries?.[sp.id];if(integer(r?.count)>0)discoveries[sp.id]={count:integer(r.count),best:finite(r.best),first:typeof r.first==='string'?r.first:''};}
  const fromLog={};for(const e of log){const r=fromLog[e.sp.id]||(fromLog[e.sp.id]={count:0,best:0,first:''});r.count++;r.best=Math.max(r.best,e.weight);}
  for(const [id,r]of Object.entries(fromLog)){if(!discoveries[id])discoveries[id]=r;else discoveries[id].best=Math.max(discoveries[id].best,r.best);}
  for(const e of bag){if(!discoveries[e.sp.id])discoveries[e.sp.id]={count:1,best:e.weight,first:''};else discoveries[e.sp.id].best=Math.max(discoveries[e.sp.id].best,e.weight);}
  const bestSp=byId.get(d.best?.id)||uniqueName.get(d.best?.name);
  let best=bestSp&&finite(d.best?.weight)>0?{id:bestSp.id,name:bestSp.name,weight:finite(d.best.weight)}:null;
  for(const e of [...log,...bag])if(!best||e.weight>best.weight)best={id:e.sp.id,name:e.sp.name,weight:e.weight};
  const xp=integer(d.xp),licenses=ISLANDS.filter(i=>hasIslandLicense(i.id,xp,ids(d.licenses,ISLANDS.length))).map(i=>i.id);
  const ownedBoats=ids(d.ownedBoats,BOATS.length),boat=ownedBoats.includes(d.boat)?d.boat:0;
  const wanted=Number.isInteger(d.zone)&&ISLANDS[d.zone]?d.zone:0,zone=hasIslandLicense(wanted,xp,licenses)?wanted:0;
  const visited=ids(d.visited,ISLANDS.length).filter(i=>licenses.includes(i));if(!visited.includes(zone))visited.push(zone);
  const sailing=d.sailing&&['x','z','yaw'].every(k=>Number.isFinite(d.sailing[k]))&&!boatMoveBlock(d.sailing,d.sailing,{xp,licenses,radius:BOATS[boat].size*4})?{x:d.sailing.x,z:d.sailing.z,yaw:d.sailing.yaw}:null;
  const equipmentArchive={};for(const kind of ['rod','line','bait'])equipmentArchive[kind]=Array.isArray(d.equipmentArchive?.[kind])?[...new Set(d.equipmentArchive[kind].filter(n=>Number.isInteger(n)&&n>=0&&n<24))].sort((a,b)=>a-b):[];
  return {version:9,score:integer(d.score),caught:Math.max(integer(d.caught),log.length,bag.length),coins:integer(d.coins),xp,licenses,zone,visited,owned,gear,boat,ownedBoats,discoveries,completedIslands:completedCollections(discoveries,d.completedIslands),equipmentArchive,best,bag,log:log.slice(0,200),sailing};
}
export { encode as encodeFish };
