import test from 'node:test';import assert from 'node:assert/strict';
import{SPECIES,RARITY_ORDER,RARITY,RODS,LINES,BAITS,eligibleSpecies}from'../game-data.mjs';
import{ISLANDS,MAX_LEVEL,BOATS,xpForLevel,levelForXp}from'../archipelago.mjs';
import{RARITY_AVAILABILITY}from'../island-data.mjs';
const names=['Central Isle','Pinewater Isle','Ironwood River','Brackwater Marsh','Sunscar Atoll','Coralreach','Breaker Coast','Stormbreak Isles','Thornwild Delta','Emberforge','Frostfall Isle','Skyglass Fjord','Shattered Shelf',"Leviathan's Grave",'Ashen Trench','Moontide Sanctum','Starfall Basin','The Null Trench',"Eternity's Reach","Origin's End"];
test('exact twenty destinations, unlock levels, unique themes and landform silhouettes',()=>{
 assert.deepEqual(ISLANDS.map(i=>i.name),names);assert.deepEqual(ISLANDS.map(i=>i.level),[1,10,20,35,50,65,80,100,120,140,160,180,200,225,250,275,300,325,350,400]);
 for(const key of ['theme','landmark','description'])assert.equal(new Set(ISLANDS.map(i=>i[key])).size,20);
 assert.equal(new Set(ISLANDS.map(i=>JSON.stringify(i.landforms))).size,20);
});
test('400 distinct authored entries in contiguous island order, including four repeated names',()=>{
 assert.equal(SPECIES.length,400);assert.equal(new Set(SPECIES.map(s=>s.id)).size,400);
 assert.deepEqual(SPECIES.map(s=>s.number),Array.from({length:400},(_,i)=>i+1));
 for(const i of ISLANDS)assert.equal(SPECIES.filter(s=>s.island===i.id).length,20);
 for(const name of ['Lake Whitefish','Arctic Grayling','Black Pacu','Atlantic Wolffish'])assert.equal(SPECIES.filter(s=>s.name===name).length,2);
 assert.deepEqual([SPECIES[39].name,SPECIES[99].name,SPECIES[119].name,SPECIES[319].name,SPECIES[399].name],['Forest Guardian','Sunscar Dragonfish','Coral Guardian','The First Fish','Origin']);
});
test('all twelve rarity colors and strict first/last-island availability match the brief',()=>{
 assert.deepEqual(RARITY_ORDER,['common','uncommon','rare','epic','legendary','mythic','exotic','divine','ancient','celestial','transcendent','unfathomable']);
 assert.deepEqual(RARITY_ORDER.map(k=>RARITY[k].color),['#858b91','#32905e','#347fd0','#8854bc','#db802b','#c83f49','#d855a2','#b68a10','#876047','#75c9ed','rainbow','#13151b']);
 for(const key of RARITY_ORDER){const islands=SPECIES.filter(s=>s.rarity===key).map(s=>s.island+1);assert.deepEqual([Math.min(...islands),Math.max(...islands)],RARITY_AVAILABILITY[key]);}
 assert.ok(SPECIES.slice(380).every(s=>s.rarity==='unfathomable'));
});
test('twelve curated tiers provide fishing kit while every species remains reachable with bait',()=>{
 for(const list of [RODS,LINES,BAITS])assert.equal(list.length,12);
 for(const s of SPECIES)assert.ok(BAITS.some((b,index)=>eligibleSpecies(s.island,index).includes(s)),`no eligible curated bait for ${s.name} on ${ISLANDS[s.island].name}`);
 assert.equal(BOATS.length,8);
});
test('XP curve retains every old threshold and reaches level 400 precisely',()=>{
 assert.equal(MAX_LEVEL,400);for(let n=1;n<=400;n++){const xp=xpForLevel(n);assert.equal(xp,90*(n-1)+22*(n-1)**2);assert.equal(levelForXp(xp),n);if(n>1)assert.equal(levelForXp(xp-1),n-1);}
 for(const x of [-1,NaN,Infinity])assert.equal(levelForXp(x),1);assert.equal(levelForXp(1e12),400);
});
