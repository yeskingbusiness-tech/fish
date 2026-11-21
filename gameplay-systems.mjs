// Deterministic, save-friendly systems for weather, expeditions and rotating challenges.
export const WEATHER=Object.freeze([
 {id:'clear',name:'Clear Skies',icon:'☀',wait:1,rare:1,wind:0,description:'Calm water; an easy day to learn a new spot.'},
 {id:'rain',name:'Rain Squall',icon:'🌧',wait:.88,rare:1.12,wind:.2,description:'Rain stirs the shallows and brings fish to feed.'},
 {id:'storm',name:'Thunderstorm',icon:'⛈',wait:.78,rare:1.28,wind:.7,description:'Dangerous gusts, restless water and a chance at storm-only targets.'},
 {id:'fog',name:'Sea Fog',icon:'🌫',wait:1.08,rare:1.22,wind:.1,description:'Low visibility; elusive fish roam the fog banks.'},
 {id:'wind',name:'Crosswinds',icon:'🌬',wait:1.12,rare:.96,wind:.85,description:'Casting is tougher, but the wind can expose unexpected water.'},
 {id:'heat',name:'Heat Haze',icon:'☀',wait:1.04,rare:1.08,wind:.05,description:'Warm shallows are active while deep-water fish stay scarce.'}
]);
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function islandWeather(island,now=Date.now()){
 const epoch=Math.floor(now/180000),n=hash(`${island}:${epoch}`)%WEATHER.length,w=WEATHER[n];
 return {...w,epoch,changesIn:180000-(now%180000)};
}
const expeditionTypes=[
 {type:'storm',title:'Stormwatch Run',icon:'⛈',goal:2,objective:'Land 2 fish while Thunderstorm weather is active.',reward:1400,relics:1},
 {type:'treasure',title:'Lost Cache',icon:'🧭',goal:1,objective:'Search the island landmark for a hidden cache.',reward:1800,relics:2},
 {type:'legendary',title:'Apex Trail',icon:'✦',goal:1,objective:'Track the rarest native fish available in these waters.',reward:2600,relics:2},
 {type:'survey',title:'Living Field Notes',icon:'⌕',goal:3,objective:'Land 3 different species in this territory.',reward:1700,relics:1},
 {type:'shoal',title:'Shoal Patrol',icon:'≈',goal:4,objective:'Land 4 fish from this territory.',reward:1500,relics:1},
 {type:'boss',title:'Abyssal Signal',icon:'⚑',goal:1,objective:'Track and land the island’s roaming boss fish.',reward:4200,relics:4}
];
export function expeditionOffers(island,dayKey=''){
 const start=hash(`${island}|${dayKey}`)%expeditionTypes.length;
 const chosen=[expeditionTypes.find(t=>t.type==='boss'),expeditionTypes.find(t=>t.type==='storm')];
 for(let n=0;chosen.length<3&&n<expeditionTypes.length;n++){const t=expeditionTypes[(start+n)%expeditionTypes.length];if(!chosen.includes(t))chosen.push(t);}
 return chosen.map(t=>({...t,id:`${dayKey}-${island}-${t.type}`,island}));
}
export const BOSSES=Object.freeze([
 {name:'Tempest Crown',title:'Stormfront Sovereign',behavior:'surge',rarity:4},
 {name:'The Drowned Bell',title:'Wreck-Song Leviathan',behavior:'dive',rarity:3},
 {name:'Glassfin Oracle',title:'Mistwater Seer',behavior:'feint',rarity:2},
 {name:'Rootbreaker',title:'The Old-Growth Colossus',behavior:'surge',rarity:1},
 {name:'Star-Eater',title:'Abyssal Anomaly',behavior:'alternating',rarity:5}
]);
const dailyTemplates=[
 {kind:'catch',title:'Lines in the Water',target:5,desc:'Land 5 fish anywhere.'},
 {kind:'sell',title:'Market Day',target:4,desc:'Sell 4 fish at a market.'},
 {kind:'rare',title:'Something Special',target:1,desc:'Land a Rare-or-better fish.'},
 {kind:'island',title:'New Horizons',target:2,desc:'Fish in 2 different territories.'},
 {kind:'weather',title:'Read the Sky',target:2,desc:'Land fish in 2 different weather conditions.'},
 {kind:'gear',title:'Tackle Test',target:3,desc:'Land fish using 3 different bait tiers.'},
 {kind:'boss',title:'Big Game',target:1,desc:'Defeat a boss fish.'}
];
const weeklyTemplates=[
 {kind:'catch',title:'Week on the Water',target:30,desc:'Land 30 fish.'},
 {kind:'island',title:'Archipelago Tour',target:6,desc:'Fish in 6 different territories.'},
 {kind:'rare',title:'Collector’s Eye',target:8,desc:'Land 8 Rare-or-better fish.'},
 {kind:'sell',title:'Working Angler',target:20,desc:'Sell 20 fish at markets.'},
 {kind:'boss',title:'Legend Hunter',target:3,desc:'Defeat 3 boss fish.'},
 {kind:'weather',title:'All Conditions',target:4,desc:'Fish in 4 different weather conditions.'},
 {kind:'gear',title:'Full Tackle Box',target:6,desc:'Land fish with 6 different bait tiers.'}
];
function dayKey(date){return date.toISOString().slice(0,10);}
function weekKey(date){const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
function seededPick(pool,seed,count){const out=[],seen=new Set();let x=hash(seed)||1;while(out.length<count){x=(Math.imul(x,1664525)+1013904223)>>>0;const i=x%pool.length;if(!seen.has(i)){seen.add(i);out.push(pool[i]);}}return out;}
function makeTasks(pool,key,count,scale){return seededPick(pool,key,count).map((x,i)=>({...x,id:`${key}-${i}-${x.kind}`,progress:0,complete:false,reward:Math.round((x.kind==='boss'?1800:500+100*x.target)*scale)}));}
export function createActivityState(saved={},now=new Date()){
 const d=now instanceof Date?now:new Date(now),day=dayKey(d),week=weekKey(d);
 return {relics:Math.max(0,Number(saved.relics)||0),daily:saved.daily?.key===day?saved.daily:{key:day,tasks:makeTasks(dailyTemplates,day,3,1)},weekly:saved.weekly?.key===week?saved.weekly:{key:week,tasks:makeTasks(weeklyTemplates,week,4,4)},expedition:saved.expedition||null,bosses:Math.max(0,Number(saved.bosses)||0),lastWeather:{}};
}
export function progressChallenges(state,event){
 const completed=[];
 for(const group of [state.daily,state.weekly])for(const task of group.tasks){
  if(task.complete)continue;const hit=task.kind===event.kind&&(task.kind!=='rare'||event.rarity>=2)&&(task.kind!=='island'||!task.seen?.includes(event.island))&&(task.kind!=='weather'||!task.seen?.includes(event.weather))&&(task.kind!=='gear'||!task.seen?.includes(event.bait));
  if(!hit)continue;
  if(['island','weather','gear'].includes(task.kind)){task.seen=task.seen||[];const value=task.kind==='island'?event.island:task.kind==='weather'?event.weather:event.bait;if(task.seen.includes(value))continue;task.seen.push(value);task.progress=task.seen.length;}
  else task.progress+=Math.max(1,event.amount||1);
  if(task.progress>=task.target){task.progress=task.target;task.complete=true;completed.push(task);}
 }
 return completed;
}
