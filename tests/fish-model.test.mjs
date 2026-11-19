import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SPECIES, RODS, LINES, BAITS } from '../game-data.mjs';
import { FISH_APPEARANCE, FISH_FAMILIES, fishAppearance } from '../fish-appearance.mjs';
import { buildFishVisual, fishSVG, triangulate } from '../fish-geometry.mjs';

const species=id=>SPECIES.find(sp=>sp.id===id);
const visual=id=>buildFishVisual(species(id));
const has=(id,...features)=>{for(const feature of features)assert.ok(visual(id).features.includes(feature),`${id} needs ${feature}`);};
const lacks=(id,...features)=>{for(const feature of features)assert.ok(!visual(id).features.includes(feature),`${id} must not have ${feature}`);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const range=(v,axis)=>v.bounds.max[axis]-v.bounds.min[axis];

test('all 120 stable IDs have an explicit immutable design across 36 anatomical families',()=>{
  assert.deepEqual(Object.keys(FISH_APPEARANCE).sort(),SPECIES.map(s=>s.id).sort());
  assert.equal(FISH_FAMILIES.length,36);
  assert.equal(new Set(Object.values(FISH_APPEARANCE).map(a=>a.family)).size,36);
  for(const sp of SPECIES){
    const a=fishAppearance(sp);
    assert.equal(a,fishAppearance(sp.id));assert.ok(Object.isFrozen(a));assert.ok(Object.isFrozen(a.body));assert.ok(Object.isFrozen(a.traits));
    assert.equal(a.body.length,3);assert.ok(a.body.every(n=>Number.isFinite(n)&&n>0));
    assert.equal(a.tones.length,5);assert.ok(a.tones.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffff));
  }
  assert.throws(()=>fishAppearance('missing-art-direction'),/No authored fish appearance/);
});

test('all 120 trunks differ geometrically even with colour, pattern and details removed',()=>{
  const silhouettes=new Map();
  for(const sp of SPECIES){
    const v=buildFishVisual(sp),trunk=v.faces.filter(f=>f.feature==='sculpted-trunk').map(f=>f.p),key=hash(trunk);
    assert.ok(!silhouettes.has(key),`${sp.id} is a recolour of ${silhouettes.get(key)}`);silhouettes.set(key,sp.id);
    assert.ok(trunk.length>=40);
  }
  assert.equal(silhouettes.size,120);
});

test('freshwater field marks accompany real fin, jaw, head and tail anatomy',()=>{
  has('bluegill','opercular-flap','blue-cheek','vertical-bars','dorsal-spiny','tail-round');
  has('pumpkinseed','cheek-lines','ear-tip','field-spots');
  has('largemouth-bass','heavy-lower-jaw','lateral-stripe');
  has('yellow-perch','vertical-bars','dorsal-spiny','dorsal-soft','tail-fork');
  has('striped-bass','horizontal-stripes');
  has('rainbow-trout','lateral-stripe','field-spots','dorsal-soft');
  has('brown-trout','red-spots','spot-halo');
  has('brook-trout','vermiculations','blue-halo','pale-fin-leading-edge');
  has('chinook-salmon','hooked-salmon-jaw','black-gums');
  has('walleye','white-tail-tip','teeth');has('sauger','dorsal-spots');
  has('channel-catfish','barbels','tail-fork');has('flathead-catfish','barbels','tail-truncate');
  has('blue-catfish','straight-anal-fin');has('burbot','single-chin-barbel','continuous-anal-fin');
  // Adult Mekong giant catfish lose their barbels: don't infer anatomy from
  // the legacy pattern enum or the word "catfish" in their name.
  lacks('mekong-giant-catfish','barbels','chin-barbels');
  has('golden-koi','barbels','tail-flowing','trailing-filaments');
  has('mirror-carp','scale-facets');lacks('leather-carp','scale-facets','raised-plates');
});

test('specialists have their identifying structures, not a generic fish with a new colour',()=>{
  has('northern-pike','flattened-jaw','pike-dashes','teeth');
  has('alligator-gar','flattened-jaw','raised-plates','teeth');
  has('paddlefish','paddle-rostrum','rostrum-ridge','tail-heterocercal');
  has('lake-sturgeon','dorsal-scutes','lateral-scutes','chin-barbels','tail-heterocercal');
  has('giant-gourami','pelvic-feelers','forehead-hump');
  has('bowfin','tail-eyespot','tail-round');
  has('napoleon-wrasse','forehead-hump','cheek-lines');
  has('coelacanth','fleshy-fin-lobes','tail-trilobe','raised-plates');
  has('ocean-sunfish','tail-clavus','tall-anal-fin','tiny-pectoral');
  lacks('ocean-sunfish','tail-fork','pelvic-fins');
  has('giant-oarfish','red-dorsal-mane','red-crest-streamers','pelvic-oars');
  has('blue-marlin','spear-bill','dorsal-sail','tail-lunate','caudal-keels');
  has('giant-trevally','caudal-lateral-scutes');
  has('great-white','five-gill-slits','tail-heterocercal');
  lacks('great-white','operculum','barbels');
});

test('rays, eels, cephalopods and whales are structurally different animal types',()=>{
  for(const id of ['giant-manta','giant-stingray']){
    const v=visual(id);has(id,'ray-disc','ray-underside','whip-tail','spiracles','ventral-gill-slits');
    lacks(id,'tail-fork','tail-round','dorsal-shark','pectoral-fins');assert.ok(range(v,2)>range(v,1)*4);
  }
  has('giant-manta','cephalic-lobes');has('giant-stingray','tail-barb');lacks('giant-manta','tail-barb');
  for(const id of ['american-eel','marrow-eel','world-serpent']){
    const v=visual(id);has(id,'continuous-ribbon-fin');lacks(id,'tail-fork','tail-round');assert.ok(range(v,0)>range(v,1)*3.7);
  }
  for(const id of ['colossal-squid','river-kraken','the-hollow-god']){
    const arms=visual(id).features.filter(f=>/^arm-\d+$/.test(f));assert.equal(arms.length,8);
    has(id,'suckers','beak');lacks(id,'operculum','pelvic-fins','tail-fork','dorsal-shark');
  }
  has('colossal-squid','mantle-fins','long-feeding-tentacle','tentacle-club','club-suckers');
  lacks('river-kraken','long-feeding-tentacle','mantle-fins');
  has('star-whale','horizontal-flukes','blowhole','ventral-throat-grooves');
  lacks('star-whale','operculum','five-gill-slits','pelvic-fins','tail-heterocercal');
});

test('mythical fish have authored appendages, armour and selective luminous features',()=>{
  has('void-angler','angler-lure-stalk','luminous-lure','cavern-teeth','walking-fin-toes');
  has('sunken-god','antler-branches','raised-plates');
  has('bone-sail','spear-bill','skeletal-ribs','dorsal-sail');
  has('deep-choir','gill-fans','bioluminescent-organs');
  has('timefish','raised-concentric-ring','trailing-filaments');
  has('hollow-king','crown-prongs','cavern-teeth');
  has('deep-root','arm-8','antler-branches');
  has('crown-of-salt','ray-disc','crown-prongs');
  for(const id of ['void-angler','the-deep-itself','star-whale'])assert.ok(visual(id).faces.some(f=>f.glow),id);
  for(const id of ['bluegill','rainbow-trout','great-white'])assert.equal(visual(id).faces.some(f=>f.glow),false,id);
});

test('every sculpt has finite complete triangles, a real belly contact and a bounded mobile budget',()=>{
  for(const sp of SPECIES){
    const v=buildFishVisual(sp);let triangles=0;
    assert.ok(Math.abs(range(v,0)-1.8)<1e-10);assert.ok(range(v,1)>0&&range(v,2)>0);
    assert.ok(v.faces.some(f=>f.part==='belly'));assert.ok(v.parts.tail);
    const buckets=new Set();
    for(const f of v.faces){
      assert.ok(v.parts[f.part]);assert.ok(f.p.length>=3);
      assert.ok(f.p.every(p=>p.length===3&&p.every(Number.isFinite)),`${sp.id}/${f.feature}`);
      const tris=triangulate(f.p);assert.equal(tris.length,f.p.length-2,`${sp.id}/${f.feature}: incomplete face`);
      triangles+=tris.length;buckets.add(f.part+!!f.glow);
      for(const t of tris)assert.ok(t.length===3&&new Set(t).size===3&&t.every(i=>i>=0&&i<f.p.length));
    }
    assert.ok(triangles>=150&&triangles<=4500,`${sp.id}: ${triangles} triangles`);
    assert.ok(buckets.size<=6,`${sp.id}: ${buckets.size} draw calls`);
  }
});

test('concave forked tails are triangulated without filling their notch',()=>{
  const points=[[0,0,0],[2,2,0],[1,.2,0],[2,-2,0]];
  const triangles=triangulate(points);assert.equal(triangles.length,2);
  const area=triangles.reduce((sum,[a,b,c])=>sum+Math.abs((points[b][0]-points[a][0])*(points[c][1]-points[a][1])-(points[b][1]-points[a][1])*(points[c][0]-points[a][0]))/2,0);
  assert.ok(Math.abs(area-2)<1e-12);
});

test('all illustrated icons come from the sculpts, are unique, cached, bounded and accessible',()=>{
  const paths=new Set();
  for(const sp of SPECIES){
    const svg=fishSVG(sp);assert.equal(svg,fishSVG(sp));
    assert.ok(svg.includes(`aria-label="${sp.name}"`));assert.ok(svg.includes(`data-anatomy="${fishAppearance(sp).family}"`));
    assert.match(svg,/viewBox="0 0 160 100"/);assert.doesNotMatch(svg,/NaN|Infinity|<image|<script|<rect|id="fish-/);
    assert.ok(svg.length<150_000);
    const drawing=[...svg.matchAll(/d="([MLZ0-9.,-]+)"/g)].map(m=>m[1]);assert.ok(drawing.length>12);
    for(const d of drawing)for(const match of d.matchAll(/(-?[0-9.]+),(-?[0-9.]+)/g)){
      const x=Number(match[1]),y=Number(match[2]);assert.ok(x>=7.9&&x<=152.1&&y>=8.9&&y<=91.1,sp.id);
    }
    paths.add(hash(drawing));
  }
  assert.equal(paths.size,120);
  assert.match(fishSVG({...species('bluegill'),name:'Fish <"test"> & friends'}),/aria-label="Fish &lt;&quot;test&quot;&gt; &amp; friends"/);
});

test('rendering art never consumes gameplay RNG or mutates species, gear, weights or rewards',async()=>{
  const snapshot=structuredClone({SPECIES,RODS,LINES,BAITS}),random=Math.random;
  const {buildFishVisual:uncached,fishSVG:uncachedSVG}=await import('../fish-geometry.mjs?independent-art-audit');
  try{
    Math.random=()=>{throw Error('The renderer consumed fishing RNG');};
    for(const sp of SPECIES){assert.equal(hash(uncached(sp)),hash(buildFishVisual(sp)));assert.equal(uncachedSVG(sp),fishSVG(sp));}
  }finally{Math.random=random;}
  assert.deepEqual({SPECIES,RODS,LINES,BAITS},snapshot);
  const sp=species('bluegill');assert.equal(buildFishVisual({...sp,color:0,pattern:'whiskers',rarity:'mythic'}),buildFishVisual(sp));
});
