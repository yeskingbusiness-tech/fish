import * as THREE from 'three';

// ============================================================
//  REEL DEAL 3D — blocky first-person fishing
//  Cube-built islands, species-authored faceted fish,
//  batched geometry, no shadow pass, instanced clutter.
// ============================================================

const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a) * t;
const rand  = (a,b) => a + Math.random() * (b-a);
const hexc  = c => '#' + c.toString(16).padStart(6,'0');
const fmt   = n => n.toLocaleString('en-US');

import { advanceReelPhase, REEL_PHASES, phasePull, fishTugImpulse, alternateTugDirection } from './reel-phases.mjs?v=44';
import { SPECIES, RARITY, RARITY_ORDER, RODS, LINES, BAITS, fishValue, baitWindow, sortFishIndex, castLuckModifier, effectiveLuck,
  eligibleSpecies, speciesChance, roundWeight, formatWeight, formatCatchMass, GEAR_PER_ISLAND, pickSpecies as drawSpecies, rollWeight as drawWeight } from './game-data.mjs?v=44';
import { ISLANDS, BOATS, xpForLevel, levelForXp, levelProgress, catchXP, capCatchXP, gearIsland, hasIslandLicense, travelRequirement,
  MAX_LEVEL, ISLAND_COLLECTION_BONUS, islandCollectionProgress, completedCollections, collectionCoinBonus, fishSaleValue } from './archipelago.mjs?v=44';
import { createWorld } from './world.mjs?v=46';
import { fishSVG, fishGeometryCacheStats } from './fish-geometry.mjs?v=44';
import { createFishIcons } from './fish-icons.mjs?v=44';
import { createAdaptiveQuality, memoLast, createBaitPoolLookup } from './render-performance.mjs?v=44';
import { createFishModel, animateFishModel, disposeFishModel } from './fish-model.mjs?v=44';
import { boatViewPose, createPlayerModel, heldFishSpan, heldFishLayout, firstPersonFishPose, frontViewPose } from './player-view.mjs?v=44';
import { normalizeSave, decodeFish, SAVE_VERSION, SAVE_KEY, LEGACY_KEYS } from './save-state.mjs?v=44';
import { BAG_TABS, bagGearKind, nextBagTab, contextualHint, HELP_CONTROLS } from './ui-state.mjs?v=45';
import { WEATHER, islandWeather, BOSSES, createActivityState, progressChallenges } from './gameplay-systems.mjs?v=2';
import { PERSONAL_CAPACITY, BOAT_CAPACITY, STORAGE_UPGRADE_COST, MUTATIONS, rollMutation, capacities, merchantVisit, SECRET_FISHING_SITES, ACHIEVEMENTS, createCollectionState, achievementProgress } from './collection-systems.mjs?v=3';

import { ALL_CATCH_SPECIES, LEGACY_SPECIES } from './legacy-catalog.mjs?v=44';
import { territoryAt, territoryCenter, TERRITORY_RADIUS, shoreLuckPenalty, distanceToShore, stepBoat, nearbyDock, dockPose, dockLocation, returnBoatPose, clampBoatDeckPosition, mapPoint, SEA_BOUNDS } from './navigation.mjs?v=44';
import { WORLD_LAYOUT_VERSION } from './island-data.mjs?v=44';
import { QUESTS, createQuestState, acceptQuest, applyQuestEvent } from './quest-system.mjs?v=2';
import { islandToWorld, islandSpawn } from './island-layout.mjs?v=44';

import { drawMinimap } from './minimap.mjs?v=44';
const fishIcons = createFishIcons(ALL_CATCH_SPECIES);
const discoveredCount=()=>SPECIES.filter(sp=>G.discoveries[sp.id]).length;
const fishPlace=sp=>ISLANDS[sp.island].short+(sp.legacy?' · Legacy catch':'');
function isDriving(){return G.onBoat&&G.boatMode==='drive';}
function fishingTerritory(){return G.onBoat?territoryAt(G.px,G.pz):G.zone;}
const localFishPool = createBaitPoolLookup(eligibleSpecies);
const frameWork = {vendorChecks:0,hintChecks:0,particleUploads:0};

const pickSpecies = () => {
  const island=G.castTerritory??fishingTerritory(),pool=eligibleSpecies(island,G.gear.bait);if(!pool.length)return null;
  const wx=islandWeather(island,Date.now());
  const hour=new Date().getUTCHours(),dusk=hour>=17&&hour<23,dawn=hour>=5&&hour<9,secretSpot=SECRET_FISHING_SITES.find(site=>site.island===island&&Math.hypot(bobberPos.x-secretFishingPosition(site).x,bobberPos.z-secretFishingPosition(site).z)<14);const weights=pool.map(sp=>{const tier=RARITY[sp.rarity].tier;let bias=wx.rare;if(wx.id==='rain'&&tier<2)bias*=1.22;if(wx.id==='heat'&&tier>=6)bias*=.68;if(wx.id==='wind'&&tier>=8)bias*=.72;if(tier>=7&&dusk)bias*=1.35;else if(tier>=3&&(dawn||dusk))bias*=1.14;let weight=speciesChance(sp,G.gear.bait,G.castPower,G.castShorePenalty)*Math.pow(bias,tier);if(secretSpot&&sp.id===secretSpot.fishId)weight*=24;return weight;});
  let r=Math.random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<pool.length;i++){r-=weights[i];if(r<=0)return pool[i];}return pool.at(-1);
};
const rollWeight = sp => drawWeight(sp, G.gear.bait, Math.random, G.castPower,G.castShorePenalty);
const coinBonus = () => collectionCoinBonus(G.discoveries,G.completedIslands);
const saleValue = (sp,weight,mutation=null) => Math.round(fishSaleValue(sp,Number(weight),G.discoveries,G.completedIslands)*(mutation?MUTATIONS[mutation]?.multiplier||1:1));
const boatStore=()=>G.collections.storage[G.boat]||(G.collections.storage[G.boat]=[]);
const storageCaps=()=>({...capacities(G.boat,G.collections.boatStorageUpgrade[G.boat]||0),personal:PERSONAL_CAPACITY+(G.collections.storageUpgrade||0)*5});
const canCarryCatch=()=>bag.length<storageCaps().personal||(G.onBoat&&boatStore().length<storageCaps().boat);
const fishBadge=e=>e.mutation?`<span class="mutation-badge ${e.mutation}">${e.mutation.toUpperCase()}</span>`:'';

// UI illustrations and 3D catches use the same species-authored anatomy.
const ICON = {
  soundOn: `<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><rect x="4" y="9" width="4" height="6" fill="currentColor"/><rect x="8" y="6" width="3" height="12" fill="currentColor"/><rect x="15" y="8" width="2" height="8" fill="currentColor"/><rect x="19" y="10" width="2" height="4" fill="currentColor"/></svg>`,
  soundOff:`<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><rect x="4" y="9" width="4" height="6" fill="currentColor"/><rect x="8" y="6" width="3" height="12" fill="currentColor"/><rect x="15" y="9" width="2" height="2" fill="currentColor"/><rect x="17" y="11" width="2" height="2" fill="currentColor"/><rect x="19" y="13" width="2" height="2" fill="currentColor"/><rect x="17" y="15" width="2" height="2" fill="currentColor"/><rect x="15" y="17" width="2" height="2" fill="currentColor"/><rect x="19" y="9" width="2" height="2" fill="currentColor"/><rect x="15" y="13" width="2" height="2" fill="currentColor"/></svg>`,
  startArt: `<svg viewBox="0 0 120 84" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="58" width="120" height="26" fill="#2f8fa6"/>
    <rect x="0" y="58" width="120" height="4" fill="#5fc4d6"/>
    <rect x="4" y="66" width="16" height="3" fill="#7fd8e6"/><rect x="40" y="72" width="22" height="3" fill="#7fd8e6"/>
    <rect x="86" y="10" width="5" height="52" fill="#8a5a2b"/>
    <rect x="74" y="8" width="18" height="5" fill="#a86e34"/>
    <rect x="86" y="14" width="20" height="3" fill="#e9eef0"/>
    <rect x="103" y="14" width="3" height="16" fill="#e9eef0"/>
    <rect x="100" y="28" width="9" height="9" fill="#ef4056"/>
    <rect x="100" y="34" width="9" height="3" fill="#ffffff"/>
    <rect x="36" y="44" width="34" height="14" fill="#f6c945"/>
    <rect x="70" y="40" width="10" height="8" fill="#f6c945"/>
    <rect x="70" y="54" width="10" height="8" fill="#f6c945"/>
    <rect x="76" y="46" width="10" height="10" fill="#f6c945"/>
    <rect x="42" y="47" width="5" height="5" fill="#12222b"/>
    <rect x="30" y="46" width="8" height="10" fill="#f6c945"/>
  </svg>`,
};

// ---------- Audio ----------
let audioCtx = null, soundOn = true;
function ensureAudio(){
  if(!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq, dur, type='square', vol=0.12, when=0, slideTo=null){
  if(!soundOn || !audioCtx) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noiseBurst(dur=0.25, vol=0.18, freq=900){
  if(!soundOn || !audioCtx) return;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = audioCtx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(audioCtx.destination); src.start();
}
const sfx = {
  cast(){ noiseBurst(0.2, 0.1, 1300); tone(520, 0.16, 'square', 0.05, 0, 880); },
  splash(){ noiseBurst(0.35, 0.22, 800); tone(240, 0.2, 'square', 0.06, 0, 120); },
  plip(){ tone(820, 0.07, 'square', 0.08, 0, 480); },
  bite(){ tone(1050, 0.08, 'square', 0.1); tone(1050, 0.08, 'square', 0.1, 0.12); },
  hook(){ tone(420, 0.12, 'square', 0.1, 0, 820); noiseBurst(0.16, 0.12, 1100); },
  reelTick(){ tone(rand(620, 780), 0.025, 'square', 0.025); },
  snap(){ tone(700, 0.18, 'sawtooth', 0.1, 0, 90); noiseBurst(0.16, 0.12, 2400); },
  escape(){ tone(360, 0.35, 'square', 0.08, 0, 140); },
  caught(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.16,'square',0.1,i*0.08)); },
  legendary(){ [523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,0.22,'square',0.1,i*0.09)); },
  step(){ noiseBurst(0.09, 0.05, 420); },
  buy(){ [660,880,1180].forEach((f,i)=>tone(f,0.1,'square',0.08,i*0.06)); },
  coin(){ tone(1180, 0.07, 'square', 0.07); tone(1560, 0.09, 'square', 0.07, 0.06); },
  deny(){ tone(240, 0.14, 'square', 0.07, 0, 160); },
};

// ---------- Renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance', stencil:false });
const adaptiveQuality = createAdaptiveQuality(devicePixelRatio);
renderer.setPixelRatio(adaptiveQuality.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false; // flat blocky lighting — and much faster

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd8f2);
scene.fog = new THREE.Fog(0x9bd9ed, 100, 850);

const PORTRAIT = () => innerHeight > innerWidth;
const camera = new THREE.PerspectiveCamera(PORTRAIT() ? 72 : 58, innerWidth/innerHeight, 0.1, 1400);
camera.rotation.order = 'YXZ';
camera.position.set(0, 2.77, 5.0);
// Keep fishing aim at the player's eyes; the front camera is presentation only.
const frontCamera = new THREE.PerspectiveCamera(PORTRAIT() ? 60 : 52, innerWidth/innerHeight, 0.1, 1400);
frontCamera.layers.enable(1); // Full-size carried fish have their own presentation layer.

// Lights (no shadows)
scene.add(new THREE.HemisphereLight(0xd8f4ff, 0x4a8a6a, 1.15));
const sun = new THREE.DirectionalLight(0xfff3d0, 1.9);
sun.position.set(18, 30, 10);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9ad6ff, 0.45);
fill.position.set(-16, 12, -14);
scene.add(fill);
for(const light of scene.children.filter(o=>o.isLight))light.layers.enable(1);

// ---------- Shared geometry + helpers ----------
const UNIT = new THREE.BoxGeometry(1,1,1);
const D = new THREE.Object3D();          // scratch object for instancing
function mat(color, extra){
  return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
}
function box(w,h,d,material,x=0,y=0,z=0){
  const m = new THREE.Mesh(UNIT, material);
  m.scale.set(w,h,d);
  m.position.set(x,y,z);
  return m;
}

// ---------- Cube-built archipelago ----------
const world = createWorld(scene);
const { water, waterUniforms } = world;
// Compatibility for the old debug handle; vendors are now island-local.
const SHOP_POS = world.stalls.find(s => s.zone === 0 && s.kind === 'rod');
const MARKET_POS = world.stalls.find(s => s.zone === 0 && s.kind === 'market');

// ---------- Bobber / line / splash / ripple ----------
const bobber = new THREE.Group();
{
  const topMat = mat(0xef4056);
  const whiteMat = mat(0xf7fbff);
  const darkMat = mat(0x22333d);
  bobber.add(box(0.44, 0.22, 0.44, topMat, 0, 0.16, 0));
  bobber.add(box(0.44, 0.22, 0.44, whiteMat, 0, -0.06, 0));
  bobber.add(box(0.07, 0.9, 0.07, topMat, 0, 0.7, 0));
  bobber.add(box(0.14, 0.14, 0.14, darkMat, 0, 1.2, 0));
  bobber.visible = false;
}
scene.add(bobber);

const LINE_POINTS = 20;
const lineGeo = new THREE.BufferGeometry();
const linePos = new Float32Array(LINE_POINTS * 3);
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
const lineMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.8 });
const line = new THREE.Line(lineGeo, lineMat);
line.frustumCulled = false;
line.visible = false;
scene.add(line);

// splash particles — one instanced mesh, reused forever
const P_MAX = 70;
const pMat = new THREE.MeshBasicMaterial({ color:0xdff6ff, transparent:true, opacity:0.9 });
const pMesh = new THREE.InstancedMesh(UNIT, pMat, P_MAX);
pMesh.frustumCulled = false;
pMesh.visible = false; // No particle draw/upload until the first splash.
scene.add(pMesh);
const pData = [];
for(let i=0;i<P_MAX;i++) pData.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0 });

// square ripples (pool)
const rippleGeo = new THREE.BufferGeometry();
// Four flat cuboid bars form a square ripple, not a round effect.
{
  const positions=[], normals=[], indices=[];
  for(const [w,h,x,y] of [[1.24,.12,0,-.56],[1.24,.12,0,.56],[.12,1,-.56,0],[.12,1,.56,0]]){
    const geo = new THREE.BoxGeometry(w,h,.025); geo.translate(x,y,0);
    const offset = positions.length/3;
    positions.push(...geo.attributes.position.array); normals.push(...geo.attributes.normal.array);
    indices.push(...Array.from(geo.index.array, i=>i+offset)); geo.dispose();
  }
  rippleGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  rippleGeo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); rippleGeo.setIndex(indices);
}
const ripples = [];
for(let i=0;i<5;i++){
  const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false }));
  m.rotation.x = -Math.PI/2;
  m.visible = false;
  scene.add(m);
  ripples.push({ mesh:m, life:0 });
}

// ---------- Rod (first person, parented to the camera) ----------
const rodRig = new THREE.Group();
function placeRodForAspect(){
  if(PORTRAIT()) rodRig.position.set(0.30, -0.52, -1.25);
  else rodRig.position.set(0.42, -0.44, -0.88);
}
placeRodForAspect();
camera.add(rodRig);
scene.add(camera);

const rodMat = mat(0xc98a4b);
const gripMat = mat(0x27343c);
{
  rodRig.add(box(0.07, 0.34, 0.07, gripMat, 0, 0.16, 0));          // grip
  rodRig.add(box(0.055, 0.62, 0.055, rodMat, 0, 0.62, 0));         // lower section
  const reel = box(0.07, 0.11, 0.11, mat(0xd7dde2), 0.015, 0.5, 0.07);
  rodRig.add(reel);
  rodRig.add(box(0.05, 0.05, 0.06, gripMat, 0, 0.46, 0.09));
}
const starterRodDetails=new THREE.Group();starterRodDetails.name='reedhaven-starter-rod-detail';
{
  const guideMat=new THREE.MeshStandardMaterial({color:0xcbd5d0,metalness:.7,roughness:.26}),guideGeo=new THREE.TorusGeometry(.07,.012,4,7),guides=new THREE.InstancedMesh(guideGeo,guideMat,3),obj=new THREE.Object3D();
  [.94,1.25,1.53].forEach((y,i)=>{obj.position.set(0,y,0);obj.rotation.set(Math.PI/2,0,0);const s=1-i*.24;obj.scale.setScalar(s);obj.updateMatrix();guides.setMatrixAt(i,obj.matrix);});guides.instanceMatrix.needsUpdate=true;starterRodDetails.add(guides);
  const wrapGeo=new THREE.BoxGeometry(.065,.025,.065),wrapMat=new THREE.MeshStandardMaterial({color:0xe2b969,metalness:.4,roughness:.36}),wraps=new THREE.InstancedMesh(wrapGeo,wrapMat,3);
  [.22,.29,.36].forEach((y,i)=>{obj.position.set(0,y,0);obj.rotation.set(0,0,0);obj.scale.set(1,1,1);obj.updateMatrix();wraps.setMatrixAt(i,obj.matrix);});wraps.instanceMatrix.needsUpdate=true;starterRodDetails.add(wraps);
  const spool=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.12,8),new THREE.MeshStandardMaterial({color:0x91a5a3,metalness:.7,roughness:.25}));spool.rotation.z=Math.PI/2;spool.position.set(.07,.5,.075);starterRodDetails.add(spool);
  rodRig.add(starterRodDetails);
}
const tipJoint = new THREE.Group();
tipJoint.name = 'rod-bend';
tipJoint.position.y = 0.9;
rodRig.add(tipJoint);
tipJoint.add(box(0.04, 0.62, 0.04, rodMat, 0, 0.31, 0));
tipJoint.add(box(0.08, 0.08, 0.08, mat(0xef4056), 0, 0.66, 0));
const rodTipObj = new THREE.Object3D();
rodTipObj.name = 'rod-tip';
rodTipObj.position.y = 0.66;
tipJoint.add(rodTipObj);

// No first-person hands or sleeves. The entire character lives in this
// separate root, which is visible only through the front third-person camera.
const playerModel = createPlayerModel(THREE, rodRig);
scene.add(playerModel.root);
const heldFishRig = new THREE.Group();
heldFishRig.name = 'held-fish';heldFishRig.visible = false;
camera.add(heldFishRig);

const rodDir = new THREE.Vector3();
const UP = new THREE.Vector3(0,1,0);
const DIR_IDLE   = new THREE.Vector3(0.06, 0.42, -0.90).normalize();
const DIR_CHARGE = new THREE.Vector3(0.10, 0.64, -0.76).normalize();
const DIR_SWING  = new THREE.Vector3(0.04, 0.16, -0.98).normalize();
const DIR_REEL   = new THREE.Vector3(0.08, 0.44, -0.89).normalize();
function setRodDir(v){
  rodDir.copy(v).normalize();
  rodRig.quaternion.setFromUnitVectors(UP, rodDir);
}

// aim marker on the water
const aimMarker = new THREE.Group();
{
  const m = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.75 });
  aimMarker.add(box(1.0, 0.02, 0.16, m, 0, 0, -0.55));
  aimMarker.add(box(1.0, 0.02, 0.16, m, 0, 0, 0.55));
  aimMarker.add(box(0.16, 0.02, 0.8, m, -0.55, 0, 0));
  aimMarker.add(box(0.16, 0.02, 0.8, m, 0.55, 0, 0));
  aimMarker.visible = false;
}
scene.add(aimMarker);

// ---------- Game state ----------
const G = {
  state:'menu',                       // menu | aim | charging | casting | waiting | bite | reeling | caught
  score:0, caught:0, best:null,
  yaw:0, pitch:-0.12, thirdPerson:false, // view preference is transient, not a save migration
  power:0, powerDir:1, castPower:0.5, // live charge vs. released cast snapshot (not saved)
  tension:15, progress:0, fishStrength:0.3,
  surgeTimer:0, surgeDur:0, yankTimer:0, yank:0, yankDur:0, reelHeld:false,
  reelPhase:'calm', reelPhaseTime:3.2,
  fishTugTimer:0, fishTugWarn:0, fishTugDur:0, fishTug:0, nextFishTugDirection:1,
  time:0, rodSwing:0, bobDip:0,
  castT:0, castDur:1, biteWindow:0, waitTimer:4,
  caughtAnim:0,
  // player + economy
  px:0, pz:5.0, camY:2.77, bob:0, walked:0, nearShop:false, nearMarket:false,
  coins:0, bag:[], xp:0, licenses:[0], zone:0, visited:[0], discoveries:{},
  boat:0, ownedBoats:[0], boatUpgrades:{}, nearPort:false, onBoat:false,boatMode:'drive',sailing:null,boatPosition:null,worldLayout:WORLD_LAYOUT_VERSION,waypoint:1,completedIslands:[],equipmentArchive:{},castShorePenalty:0,castTerritory:0,
  owned:{ rod:[0], line:[0], bait:[0] }, activities:createActivityState(), quests:createQuestState(),
  gear:{ rod:0, line:0, bait:0 }, collections:createCollectionState(),
  // current fight tuning (set on hook)
  bandLo:22, bandHi:70, demand:0.4, supply:1, over:0, fishWeight:1, castDist:10, rateMul:1
};
const EYE = 1.62;
let shopOpen = false, marketOpen = false, shopKind = 'rod';
let chartOpen = false, indexOpen = false, bagOpen = false, helpOpen = false, tutorialOpen=false, activitiesOpen=false, achievementsOpen=false, merchantOpen=false, hudHidden = false;
let tutorialIndex=0, bagTab = 'fish', lastGearTab = 'rods',bagActionMode='transfer';
let selectedIsland = 0, indexIsland = -1, fleetTab = false;
let nearbyStall = null,activeQuestGiver=null;
const uiBusy = () => shopOpen || marketOpen || chartOpen || indexOpen || bagOpen || helpOpen || tutorialOpen || activitiesOpen || aquariumOpen || achievementsOpen || merchantOpen || hudHidden || drawerOpen;
const level = () => levelForXp(G.xp);
const hasLicense = target => hasIslandLicense(target,G.xp,G.licenses);

const bag = G.bag;
// Keep the actual bag object, not an index: selling another fish cannot change
// which specimen is being held, including identical species/weight duplicates.
let heldCatch = null, carriedModel = null;
const carriedSize = {x:0,y:0,z:0,gripY:0,gripZ:0,centerX:0}; // Cached mesh bounds/contact, never saved fish stats.
const activeCamera = () => (isDriving() || G.thirdPerson) && G.state !== 'menu' ? frontCamera : camera;
const activeRodTip = () => activeCamera() === frontCamera ? playerModel.rodTip : rodTipObj;
const bobberPos = new THREE.Vector3(0, 0.1, -6);
const rodTipWorld = new THREE.Vector3();
const castFrom = new THREE.Vector3();
const castTo = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const camFwd = new THREE.Vector3();

let hookedFish = null, hookedSpecies = null, hookedWeight = 0;
const log = [];

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const promptEl = $('prompt'), biteEl = $('biteIndicator'), castMeter = $('castMeter'), castFill = $('castFill');
const reelUI = $('reelUI'), tensionNeedle = $('tensionNeedle'), progressFill = $('progressFill');
const reelFishName = $('reelFishName'), reelPct = $('reelPct'), catchModal = $('catchModal');
const toastEl = $('toast'), logDrawer = $('logDrawer'), logList = $('logList'), logSummary = $('logSummary');
const lockHint = $('lockHint'), shopBtnEl = $('shopBtn'), shopOverlay = $('shopOverlay'), shopBody = $('shopBody');
const marketBtnEl = $('marketBtn'), marketOverlayEl = $('marketOverlay'), marketBody = $('marketBody');
const bagOverlay = $('bagOverlay'), bagBody = $('bagBody'), helpOverlay = $('helpOverlay'), tutorialOverlay=$('tutorialOverlay');
const stickEl = $('stick'), stickKnob = document.querySelector('.stick-knob');
const portBtnEl = $('portBtn'), tensionTrack = $('tensionTrack'), castPowerValue = $('castPowerValue'), castLuck = $('castLuck');
const setText = (el,text) => {if(el.textContent!==text)el.textContent=text;};
const setHidden = (el,hidden) => {if(el.classList.contains('hidden')!==hidden)el.classList.toggle('hidden',hidden);};
let drawerOpen = false;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function hidePrompt(){ if(promptEl.style.display!=='none')promptEl.style.display='none'; }
const hintTarget = new THREE.Vector3();
const hintFor = memoLast((state,blocked,holding,nearVendor,moving,x,z,yaw,pitch,rod,zone,bait,power)=>{
  frameWork.hintChecks++;
  // Position/aim/tackle arguments invalidate the landing check immediately;
  // stationary frames do not repeat water tests, pool filters or number formatting.
  const canCast=!blocked&&state==='aim'&&!holding&&!nearVendor&&!moving&&landingPoint(.5,hintTarget);
  return contextualHint({state,blocked,holding,nearVendor,moving,canCast,
    baitMatches:canCast?localFishPool(zone,bait).length>0:true,touch:isTouch,
    luckLabel:state==='waiting'?castLuckLabel(power):''});
});
function updateContextHint(moving=false){
  updateLockHint();
  if(isDriving()){hidePrompt();return;}
  const npc=nearbyQuestGiver(),building=nearbyHubBuilding();
  if(G.state==='aim'&&!uiBusy()&&(npc||building)){
    const target=npc?`Talk to ${npc.name}`:building.id==='aquarium'?'Enter Reedhaven Aquarium':building.id==='warehouse'?'Open Angler Warehouse':"Visit the Anglers' Guild";
    setText(promptEl,`${isTouch?'TAP':'E'} · ${target}`);promptEl.className='prompt interaction-hint';promptEl.style.display='';return;
  }
  const blocked=uiBusy()||!catchModal.classList.contains('hidden')||!lockHint.classList.contains('hidden');
  const hint=hintFor(G.state,blocked,!!heldCatch,!!nearbyStall,moving,camera.position.x,camera.position.z,
    camera.rotation.y,camera.rotation.x,G.gear.rod,G.zone,G.gear.bait,G.castPower);
  if(!hint){hidePrompt();return;}
  setText(promptEl,hint.text);
  const cls='prompt'+(hint.mode?' '+hint.mode:'');
  if(promptEl.className!==cls)promptEl.className=cls;
  if(promptEl.style.display!=='')promptEl.style.display='';
}
function showToast(msg, bad=false){
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (bad ? ' bad' : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.className = 'toast hidden', 2000);
}
let currentWeather=islandWeather(0),lastActivityRefresh=0,lastWeatherRefresh=0,lastWeatherSignature='';
function persistActivities(){saveGame();}
function collectionAchievements(){const done=[];const game={caught:G.caught,visited:G.visited,ownedBoats:G.ownedBoats,level:level(),mutated:Object.values(G.collections.mutations).reduce((s,n)=>s+n,0),bosses:G.activities.bosses,completedIslands:G.completedIslands.length,quests:Object.values(G.quests.progress).filter(p=>p.complete).length,aquarium:G.collections.aquarium.length,heavy:Object.values(G.discoveries).some(r=>r.best>=100)};for(const a of ACHIEVEMENTS){if(!G.collections.achievements[a.id]&&achievementProgress(a.id,{game})>=a.goal){G.collections.achievements[a.id]=Date.now();G.coins+=a.reward;done.push(a);}}if(done.length){showToast(`Achievement · ${done[0].title} · +${fmt(done[0].reward)} coins`);saveGame();}return done;}
function renderAchievements(){const root=$('achievementList');if(!root)return;const completed=Object.keys(G.collections.achievements).length;setText($('achievementCount'),`${completed}/${ACHIEVEMENTS.length} complete`);root.innerHTML=ACHIEVEMENTS.map(a=>{const yes=!!G.collections.achievements[a.id],game={caught:G.caught,visited:G.visited,ownedBoats:G.ownedBoats,level:level(),mutated:Object.values(G.collections.mutations).reduce((s,n)=>s+n,0),bosses:G.activities.bosses,completedIslands:G.completedIslands.length,quests:Object.values(G.quests.progress).filter(p=>p.complete).length,aquarium:G.collections.aquarium.length,heavy:Object.values(G.discoveries).some(r=>r.best>=100)},p=achievementProgress(a.id,{game});return `<article class="achievement-row ${yes?'earned':''}"><span class="achievement-medal">${yes?'★':'☆'}</span><div><b>${a.title}</b><p>${a.desc}</p><small>${yes?'COMPLETE':`${p}/${a.goal} · ${a.tier}`} · Reward ${fmt(a.reward)} coins</small></div></article>`;}).join('');}
function activeMerchant(){return merchantVisit(Date.now());}
const MERCHANT_ITEMS=[{id:'tank-expansion',title:'Pocket Aquarium Permit',price:2600,stock:1,desc:'Expand your display by four spaces.'},{id:'aurora-trim',title:'Aurora Hull Paint',price:3200,stock:1,desc:'Exclusive cosmetic boat finish.'}];
let merchantVessel=null,merchantSlot=-1;
function updateMerchantVessel(){const m=activeMerchant();if(m.slot===merchantSlot)return;merchantSlot=m.slot;if(!merchantVessel){merchantVessel=new THREE.Group();const hull=new THREE.MeshStandardMaterial({color:0x244b52,roughness:.62}),trim=new THREE.MeshStandardMaterial({color:0xd4a65e,roughness:.7}),sail=new THREE.MeshStandardMaterial({color:0xe7dfc7,roughness:.9});merchantVessel.add(box(4,.65,1.3,hull,0,.25,0),box(2.5,.18,1.5,trim,0,.68,0),box(.12,3.5,.12,trim,0,2,0),box(1.55,1.8,.08,sail,.8,2,0),box(.45,.55,.1,new THREE.MeshStandardMaterial({color:0xc54d38}),1.15,3.05,0));scene.add(merchantVessel);}const c=territoryCenter(ISLANDS[m.island]);merchantVessel.position.set(c.x+14,.15,c.z+10);merchantVessel.rotation.y=m.stockSeed%6*.8;}
function merchantNear(){updateMerchantVessel();const c=merchantVessel?.position||territoryCenter(ISLANDS[activeMerchant().island]),px=G.onBoat&&G.sailing?G.sailing.x:G.px,pz=G.onBoat&&G.sailing?G.sailing.z:G.pz;return Math.hypot(px-c.x,pz-c.z)<55;}
function renderMerchant(){const m=activeMerchant();setText($('merchantLocation'),`The ${['Wandering Minnow','Lantern Wake','Far Current'][m.stockSeed%3]} is visiting ${ISLANDS[m.island].name}. This limited stock rotates in ${Math.max(1,Math.ceil((m.endsAt-Date.now())/60000))} min.`);setText($('merchantTimer'),`${Math.max(1,Math.ceil((m.endsAt-Date.now())/60000))} MIN`);$('merchantStock').innerHTML=MERCHANT_ITEMS.map(item=>{const key=`${m.slot}:${item.id}`,bought=G.collections.merchantBuys[key]||0,stock=Math.max(0,item.stock-bought);return `<article class="achievement-row"><div><b>${item.title}</b><p>${item.desc}</p><small>${stock} in stock · ${fmt(item.price)} coins</small></div><button class="buy-btn" data-merchant-buy="${item.id}" ${stock<1||G.coins<item.price?'disabled':''}>Buy</button></article>`;}).join('');}
let aquariumOpen=false,aquariumRenderer=null,aquariumScene=null,aquariumCamera=null,aquariumMeshes=[],physicalAquariumModels=[];
function drawPhysicalAquarium(){
  physicalAquariumModels.forEach(disposeFishModel);physicalAquariumModels=[];
  for(const [i,e] of G.collections.aquarium.entries()){
    const p=world.aquariumTankSlots?.[i];if(!p)break;
    const model=createFishModel(THREE,e.sp,Math.max(.12,heldFishSpan(e.sp,e.weight)/(8*e.sp.size))*(e.mutation==='huge'?1.25:1));
    model.position.set(p.x,p.y,p.z);model.rotation.y=i%2?Math.PI:0;
    model.userData.tankBase={...p};
    if(e.mutation==='shiny')model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();model.userData.materials.add(o.material);o.material.emissive?.setHex(0x6b9fa0);o.material.emissiveIntensity=.45;}});
    world.root.add(model);physicalAquariumModels.push(model);
  }
}
function animatePhysicalAquarium(){for(const [i,m] of physicalAquariumModels.entries()){const p=m.userData.tankBase;m.position.x=p.x+Math.sin(G.time*.8+i)*.16;m.position.y=p.y+Math.sin(G.time*1.4+i)*.045;animateFishModel(m,G.time,.5);}}
function drawAquarium(){const list=G.collections.aquarium;$('aquariumCount').textContent=`${list.length}/${12+(G.collections.aquariumUpgrade||0)*4}`;$('aquariumList').innerHTML=list.map((e,i)=>`<article class="achievement-row"><div><b>${fishBadge(e)}${e.mutation?e.mutation.toUpperCase()+' · ':''}${e.sp.name}</b><p>${RARITY[e.sp.rarity].label} · ${formatCatchMass(e.weight)}</p></div><button class="buy-btn" data-release-aquarium="${i}">Return to bag</button></article>`).join('')||'<p class="shop-empty">Your tank is empty. Use Display from the Bag to add a catch.</p>';const cap=12+(G.collections.aquariumUpgrade||0)*4;$('aquariumInfo').textContent=`${list.length}/${cap} displayed · displayed fish are protected from sale.`;aquariumMeshes.forEach(disposeFishModel);aquariumMeshes=[];if(aquariumScene){list.forEach((e,i)=>{const model=createFishModel(THREE,e.sp,Math.max(.12,heldFishSpan(e.sp,e.weight)/(8*e.sp.size))*(e.mutation==='huge'?1.25:1));model.position.set(-3+(i%4)*2,Math.sin(i*2)*.5,Math.floor(i/4)*1.3);model.userData.aquariumBase=model.position.x;if(e.mutation==='shiny')model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();model.userData.materials.add(o.material);o.material.emissive?.setHex(0x6b9fa0);o.material.emissiveIntensity=.45;}});aquariumScene.add(model);aquariumMeshes.push(model);});}drawPhysicalAquarium();}
function openAquarium(){if(uiBusy()||G.state!=='aim')return;aquariumOpen=true;$('aquariumOverlay').classList.remove('hidden');if(!aquariumRenderer){aquariumScene=new THREE.Scene();aquariumScene.background=new THREE.Color(0x123c51);aquariumCamera=new THREE.PerspectiveCamera(38,1,.1,100);aquariumCamera.position.set(0,5,14);aquariumCamera.lookAt(0,0,0);aquariumScene.add(new THREE.HemisphereLight(0xd8f4ff,0x174456,2));const light=new THREE.DirectionalLight(0xfff0c8,2.6);light.position.set(3,8,6);aquariumScene.add(light);const tank=new THREE.Mesh(new THREE.BoxGeometry(10,.08,4),new THREE.MeshStandardMaterial({color:0x49a4b1,roughness:.3,metalness:.2}));tank.position.y=-2;aquariumScene.add(tank);aquariumRenderer=new THREE.WebGLRenderer({canvas:$('aquariumCanvas'),alpha:true,antialias:true});aquariumRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}drawAquarium();renderAquariumFrame();}
function renderAquariumFrame(){if(!aquariumOpen||!aquariumRenderer)return;const canvas=$('aquariumCanvas'),w=canvas.clientWidth||600,h=canvas.clientHeight||220;aquariumRenderer.setSize(w,h,false);aquariumCamera.aspect=w/h;aquariumCamera.updateProjectionMatrix();aquariumMeshes.forEach((m,i)=>{m.position.x=m.userData.aquariumBase+Math.sin(G.time*1.2+i)*.18;m.rotation.y=Math.sin(G.time*.8+i)*.2;});aquariumRenderer.render(aquariumScene,aquariumCamera);requestAnimationFrame(renderAquariumFrame);}
function closeAquarium(){aquariumOpen=false;$('aquariumOverlay').classList.add('hidden');resumeWorld();}
function secretFishingPosition(site){if(site.id==='ironwood-waterfall')return islandToWorld(ISLANDS[site.island],-22,5.5);const dock=dockLocation(site.island,1),center=territoryCenter(ISLANDS[site.island]),dx=dock.x-center.x,dz=dock.z-center.z,len=Math.hypot(dx,dz)||1;return {x:dock.x+dx/len*16,z:dock.z+dz/len*16};}
function checkIslandSecret(){for(const site of SECRET_FISHING_SITES){if(G.collections.fieldNotes.includes(site.id))continue;const p=secretFishingPosition(site),near=site.discover==='on-foot'?!G.onBoat&&G.zone===site.island&&Math.hypot(G.px-p.x,G.pz-p.z)<4:G.onBoat&&territoryAt(G.px,G.pz)===site.island&&Math.hypot(G.px-p.x,G.pz-p.z)<9;if(!near)continue;G.collections.fieldNotes.push(site.id);G.coins+=site.reward;G.xp+=site.xp;showToast(`Secret fishing place discovered: ${site.name} · +${fmt(site.reward)} coins · marked on your sea chart`);collectionAchievements();saveGame();updateStats();}}
function refreshActivityUI(force=false){
  const ms=Date.now();
  if(force||ms-lastActivityRefresh>=15000){
    lastActivityRefresh=ms;const before=G.activities.daily.key+'/'+G.activities.weekly.key;
    G.activities=createActivityState(G.activities,new Date(ms));
    if(before!==G.activities.daily.key+'/'+G.activities.weekly.key){persistActivities();showToast('Fresh daily and weekly challenges are ready.');}
    if(activitiesOpen)renderActivities();
  }
  if(force||ms-lastWeatherRefresh>=1000){
    lastWeatherRefresh=ms;const island=fishingTerritory()??G.zone;currentWeather=islandWeather(island,ms);
    const signature=`${island}:${currentWeather.epoch}`;
    if(signature!==lastWeatherSignature||force){lastWeatherSignature=signature;
      const icon=$('weatherIcon'),name=$('weatherName'),forecast=$('weatherForecast'),fx=$('weatherFx');
      if(icon){setText(icon,currentWeather.icon);setText(name,currentWeather.name);setText(forecast,`${Math.ceil(currentWeather.changesIn/60000)} min until conditions shift`);fx.className='weather-fx '+currentWeather.id;}
      if(activitiesOpen)renderActivities();
    }
  }
}
function applyQuestProgress(event){for(const q of applyQuestEvent(G.quests,event)){G.coins+=q.reward.coins;G.xp+=q.reward.xp;showToast(`Quest complete · ${q.title} · +${fmt(q.reward.coins)} coins`);}saveGame();updateStats();}
function recordActivity(event){
  if(!G.activities)return;
  const done=progressChallenges(G.activities,event);for(const task of done){G.coins+=task.reward;showToast(`${task.title} complete · +${fmt(task.reward)} coins`);}
  if(done.length){updateStats();persistActivities();}if(activitiesOpen)renderActivities();
}
function renderActivities(){
  const root=$('activityContent');if(!root)return;
  const wx=currentWeather||islandWeather(G.zone),day=G.activities.daily,week=G.activities.weekly;
  $('activityWeather').textContent=`${wx.icon} ${ISLANDS[G.zone].name}: ${wx.name} · ${wx.description} · rotates every 3 minutes`;
  const taskCards=(group,label)=>`<section class="activity-section"><h3>${label} · ${group.key}</h3><div class="activity-grid">${group.tasks.map(t=>`<article class="activity-card"><span class="activity-tag">${t.complete?'COMPLETE':'CHALLENGE'}</span><h4>${t.title}</h4><p>${t.desc}</p><small>${t.progress}/${t.target} · Reward ${fmt(t.reward)} coins</small><div class="activity-progress"><i style="width:${Math.min(100,t.progress/t.target*100)}%"></i></div></article>`).join('')}</div></section>`;
  const questHtml=`<section class="activity-section"><h3>${activeQuestGiver?`Requests · ${world.questGivers.find(n=>n.id===activeQuestGiver)?.name||'Angler'}`:'NPC Questlines · Reedhaven Guild'}</h3><p class="panel-note">Meet the named characters around the harbor, accept their requests, and fish, explore, and upgrade to advance their stories.</p><div class="activity-grid">${QUESTS.filter(q=>!activeQuestGiver||q.giver===activeQuestGiver).map(q=>{const p=G.quests.progress[q.id],locked=!!q.requires&&!G.quests.progress[q.requires]?.complete,canAccept=!!activeQuestGiver||nearbyHubBuilding()?.id==='guild';return `<article class="activity-card"><span class="activity-tag">${p.complete?'COMPLETE':p.accepted?'ACTIVE':locked?'LOCKED':'AVAILABLE'}</span><h4>${q.title}</h4><p>${q.description}</p><small>${p.count}/${q.objective.count} · Reward ${fmt(q.reward.coins)} coins + ${q.reward.xp} XP</small><button data-quest="${q.id}" ${p.accepted||p.complete||locked||!canAccept?'disabled':''}>${p.complete?'Complete':p.accepted?'In progress':locked?'Finish the previous request first':canAccept?'Accept quest':'Meet the NPC to accept'}</button></article>`;}).join('')}</div></section>`;
  root.innerHTML=`${questHtml}${taskCards(day,'DAILY')}${taskCards(week,'WEEKLY')}<p class="activity-weather-line">Boss fish defeated: <b>${fmt(G.activities.bosses)}</b></p>`;
}
function openActivities(giver=null){if(uiBusy()||G.state!=='aim')return false;activeQuestGiver=giver;refreshActivityUI(true);activitiesOpen=true;clearInput();releasePointer();$('activitiesOverlay').classList.remove('hidden');renderActivities();focusPanel('activitiesClose');return true;}
function closeActivities(){if(!activitiesOpen)return;activitiesOpen=false;$('activitiesOverlay').classList.add('hidden');resumeWorld();}
function updateWeatherFishing(){
 const island=G.castTerritory??fishingTerritory()??G.zone,wx=islandWeather(island,Date.now());
 const wxFactor=wx.wait;G.waitTimer=rand(2.4,5.8)*wxFactor*(effectiveLuck(G.gear.bait,G.castPower,G.castShorePenalty)<0?1-effectiveLuck(G.gear.bait,G.castPower,G.castShorePenalty):1/(1+effectiveLuck(G.gear.bait,G.castPower,G.castShorePenalty)*.35));
}
function updateStats(){
  $('caughtCount').textContent = fmt(G.caught);
  $('coinCount').textContent = fmt(G.coins);
  const bonus = coinBonus();
  $('coinBonus').textContent = `+${bonus}% SALES`;
  $('coinBonus').classList.toggle('hidden',bonus===0);
  $('bestNum').textContent = G.best ? formatCatchMass(G.best.weight) : '—';
  $('bestFishName').textContent = G.best ? G.best.name : 'No catches yet';
  $('shopCoins').textContent = fmt(G.coins);
  $('marketCoins').textContent = fmt(G.coins);
  const progress = levelProgress(G.xp), zone = ISLANDS[G.zone];
  $('levelNum').textContent = 'LV. ' + progress.level;
  $('xpText').textContent = progress.level === MAX_LEVEL ? 'MAX LEVEL' : `${fmt(progress.current)} / ${fmt(progress.needed)} XP`;
  $('xpFill').style.width = clamp(progress.ratio * 100, 0, 100) + '%';
  $('zoneNumber').textContent = `TERRITORY ${String(G.zone+1).padStart(2,'0')} / ${ISLANDS.length}`;
  $('zoneName').textContent = fishingTerritory()===null?'Open Ocean':zone.name;
  $('zoneWaters').textContent = fishingTerritory()===null?'Enter an unlocked territory to fish':zone.waters;
  const next = ISLANDS.find(i => !hasLicense(i.id));
  $('journeyObjective').textContent = next ? `Next stop · ${next.short} at level ${next.level}` : 'All island licenses unlocked · fill your index';
  const found = discoveredCount();
  $('indexCount').textContent = found + '/' + SPECIES.length;
  const pool = localFishPool(G.zone, G.gear.bait);
  $('equipmentStrip').innerHTML = `<span>${RODS[G.gear.rod].name}</span><span>${LINES[G.gear.line].name}</span><span class="${pool.length?'':'wrong-bait'}">${BAITS[G.gear.bait].name}${pool.length?'':' · no local bites'}</span><span>${bag.length} fish in bag</span>`;
  $('boatCoins').textContent = fmt(G.coins) + 'c';
  if(heldCatch && !bag.includes(heldCatch)) stowFish();
  updateCarryUI();
}
let logDirty=true;
function invalidateLog(){logDirty=true;if(drawerOpen)renderLog();}
function renderLog(){
  if(!drawerOpen)return; // Never build a hidden 200-catch history at boot/landing.
  if(logDirty){
    fishIcons.disconnect(logList);
    logSummary.textContent=`${fmt(log.length)} recent catches · ${discoveredCount()}/${SPECIES.length} discovered`;
    logList.innerHTML=log.length?log.map(e =>
      `<div class="log-item"><span class="e">${fishIcons.markup(e.sp)}</span><div><b>${e.sp.name}</b><small>${formatCatchMass(e.weight)} • ${fishPlace(e.sp)}</small></div><span class="pts">${fmt(entrySale(e))}c</span></div>`
    ).join(''):'<p class="empty">No recent catches. Cast your line!</p>';
    logDirty=false;
  }
  fishIcons.observe(logList);
}
function closeLog(){
  logDrawer.classList.add('hidden');drawerOpen=false;fishIcons.disconnect(logList);resumeWorld();
}
const RED_LO = 8, RED_HI = 92;      // hit either end of the bar and the fish is gone

let storageWarning = false;
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version:SAVE_VERSION, score:G.score, caught:G.caught, best:G.best, coins:G.coins, xp:G.xp,
      licenses:ISLANDS.filter(i=>hasLicense(i.id)).map(i=>i.id),
      zone:G.zone, visited:G.visited, boat:G.boat, ownedBoats:G.ownedBoats,
      completedIslands:completedCollections(G.discoveries,G.completedIslands),equipmentArchive:G.equipmentArchive,activities:G.activities,quests:G.quests,boatUpgrades:G.boatUpgrades,collections:{...G.collections,storage:Object.fromEntries(Object.entries(G.collections.storage).map(([id,list])=>[id,list.map(e=>({id:e.sp.id,n:e.sp.name,w:e.weight,mutation:e.mutation||null}))])),aquarium:G.collections.aquarium.map(e=>({id:e.sp.id,n:e.sp.name,w:e.weight,mutation:e.mutation||null}))},storage:G.collections.storage,mutations:G.collections.mutations,achievements:G.collections.achievements,storageUpgrade:G.collections.storageUpgrade,boatStorageUpgrade:G.collections.boatStorageUpgrade,
      worldLayout:WORLD_LAYOUT_VERSION,boatPosition:G.boatPosition,
      sailing:G.onBoat&&G.sailing?{x:G.sailing.x,z:G.sailing.z,yaw:G.sailing.yaw}:null,
      discoveries:G.discoveries, owned:G.owned, gear:G.gear,
      bag:bag.map(e=>({ id:e.sp.id, n:e.sp.name, w:e.weight,mutation:e.mutation||null })),
      log:log.slice(0,200).map(e=>({ id:e.sp.id, n:e.sp.name, w:e.weight,mutation:e.mutation||null }))
    }));
    return true;
  }catch(e){
    if(!storageWarning){ storageWarning=true; showToast('Saving is unavailable. Keep this tab open to keep this session.',true); }
    return false;
  }
}
const PROGRESS_RESET_KEY='reel-deal-progress-reset-v2.3.1';
function loadGame(){
  try{
    if(!localStorage.getItem(PROGRESS_RESET_KEY)){
      const previous={};for(const key of [SAVE_KEY,...LEGACY_KEYS]){const value=localStorage.getItem(key);if(value)previous[key]=value;}
      if(Object.keys(previous).length&&!localStorage.getItem('reel-deal-progress-backup-v2.3.1')){
        try{localStorage.setItem('reel-deal-progress-backup-v2.3.1',JSON.stringify(previous));}catch{}
      }
      for(const key of [SAVE_KEY,...LEGACY_KEYS])localStorage.removeItem(key);
      localStorage.setItem(PROGRESS_RESET_KEY,'done');
      if(Object.keys(previous).length)showToast('Fresh start! Everyone begins again at Reedhaven.');
      return; // One requested world-wide restart; prior data is not imported.
    }
    let raw=localStorage.getItem(SAVE_KEY), legacyKey=null;
    if(!raw){for(const key of LEGACY_KEYS){raw=localStorage.getItem(key);if(raw){legacyKey=key;break;}}}
    if(!raw) return;
    const normalized=normalizeSave(JSON.parse(raw),legacyKey?.endsWith('v6')||false);
    const {bag:loadedBag,log:loadedLog,...state}=normalized;
    Object.assign(G,state);G.activities=createActivityState(JSON.parse(raw).activities);G.quests=createQuestState(JSON.parse(raw).quests);G.boatUpgrades=JSON.parse(raw).boatUpgrades||{};const cs=createCollectionState(JSON.parse(raw).collections||JSON.parse(raw));cs.storage=Object.fromEntries(Object.entries(cs.storage).map(([id,list])=>[id,decodeFish(list)]));cs.aquarium=decodeFish(cs.aquarium);G.collections=cs;bag.push(...loadedBag); log.push(...loadedLog);
    if(legacyKey)saveGame(); // Keep the original legacy save as a recovery copy.
  }catch(e){showToast('Could not read the saved game. The original save has not been deleted.',true);}
}

// ---------- State transitions ----------
function setState(s){
  G.state = s;
  biteEl.classList.toggle('show',s==='bite');
  castMeter.classList.toggle('hidden',s!=='charging');
  reelUI.classList.toggle('hidden',s!=='reeling');
  aimMarker.visible=s==='charging';
  if(s==='aim'){bobber.visible=false;line.visible=false;}
  updateCarryUI();
  updatePlayerView();
  updateContextHint();updateBoatUI();
}

// ---------- Walking ----------
function groundAt(x,z){ return world.groundAt(x,z,G.zone); }
const walkable = (x,z) => groundAt(x,z) !== null;

// ---------- Casting ----------
function castLuckLabel(power){
  const percent = Math.round(castLuckModifier(power) * 1000) / 10 || 0;
  return `LUCK ${percent > 0 ? '+' : ''}${fmt(percent)}%`;
}
function updateCastMeter(){
  castFill.style.width = (G.power * 100) + '%';
  setText(castPowerValue,Math.round(G.power * 100) + '%');
  setText(castLuck,castLuckLabel(G.power));
  castLuck.classList.toggle('positive',G.power>0.5);
  castLuck.classList.toggle('negative',G.power<0.5);
}
function landingPoint(power, out){
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  if(camFwd.lengthSq() < 0.0001) camFwd.set(0,0,-1);
  camFwd.normalize();
  const rod = RODS[G.gear.rod] || RODS[0];
  let dist = lerp(5.0, rod.cast, power);
  out.copy(camera.position).addScaledVector(camFwd, dist);
  out.y = 0.1;
  // keep the float on the water (not on the shore or the dock)
  let guard = 0;
  while(!inWater(out) && guard++ < 220){
    dist -= 0.6;
    if(dist <= 0) break;
    out.copy(camera.position).addScaledVector(camFwd, dist);
    out.y = 0.1;
  }
  return inWater(out);
}
function inWater(p){ return world.inWater(p)&&territoryAt(p.x,p.z)===fishingTerritory()&&fishingTerritory()!==null; }
function startCharge(){
  if(G.state !== 'aim' || uiBusy() || isDriving()) return;
  if(fishingTerritory()===null){showToast('Cruise into an unlocked island territory to fish.',true);return;}
  if(heldCatch){showToast('Put away your fish before casting — use X or Put away.');return;}
  if(!canCarryCatch()){showToast('Personal bag and boat hold are full. Transfer, display or sell fish before casting.',true);openBag('fish');return;}
  if(!localFishPool(fishingTerritory(),G.gear.bait).length){ showToast('No local fish take this bait. Use Bag → Bait (I) to switch.',true); return; }
  ensureAudio();
  setState('charging');
  G.power = 0; G.powerDir = 1;
  updateCastMeter();
}
function releaseCast(){
  if(G.state !== 'charging') return;
  const power = clamp(G.power,0,1);
  activeRodTip().getWorldPosition(castFrom);
  if(!landingPoint(power, castTo)){
    showToast('Aim at the water to cast.', true);
    aimMarker.visible = true;
    setState('aim');
    return;
  }
  G.castTerritory=fishingTerritory();G.castShorePenalty=shoreLuckPenalty(G.px,G.pz);
  G.castPower = power; // A valid release locks luck for this cast; later meter changes cannot alter it.
  G.castT = 0;
  G.castDur = 0.42 + castTo.distanceTo(castFrom) * 0.022;
  bobberPos.copy(castFrom);
  bobber.position.copy(bobberPos);
  bobber.visible = true; line.visible = true;
  G.rodSwing = 1;
  aimMarker.visible = false;
  setState('casting');
  sfx.cast();
}
function landBobber(){
  bobberPos.y = 0.12;
  bobber.position.copy(bobberPos);
  spawnSplash(bobberPos, 14, 0.9);
  spawnRipple(bobberPos);
  sfx.splash();
  G.castDist = Math.hypot(bobberPos.x - camera.position.x, bobberPos.z - camera.position.z);
  const luck = effectiveLuck(G.gear.bait,G.castPower,G.castShorePenalty),weather=islandWeather(G.castTerritory??G.zone,Date.now());
  G.waitTimer = rand(2.4, 5.8) * weather.wait * (luck<0?1-luck:1/(1+luck*.35));
  setState('waiting');
}
function triggerBite(){
  G.biteWindow = 1.4; G.bobDip = 1;
  setState('bite');
  sfx.bite();
  spawnSplash(bobberPos, 8, 0.5);
}
function disposeHookedFish(){
  disposeFishModel(hookedFish);hookedFish=null;
}
function makeFish3D(sp, scale){return createFishModel(THREE,sp,scale);}
// ---------- Fish bag, carried catches and front-facing third person ----------
function updateCarryUI(){
  $('bagCount').textContent=`${bag.length}/${PERSONAL_CAPACITY}`;
  $('bagFishCount').textContent=`${fmt(bag.length)}/${PERSONAL_CAPACITY} bag · ${boatStore().length}/${storageCaps().boat} boat`;
  $('heldFishBar').classList.toggle('hidden',!heldCatch||G.state==='menu');
  $('heldFishName').textContent=heldCatch?heldCatch.sp.name:'';
  $('heldFishWeight').textContent=heldCatch?formatCatchMass(heldCatch.weight):'';
  $('viewLabel').textContent=G.thirdPerson?'First person':'Front view';
  $('viewBtn').setAttribute('aria-pressed',String(G.thirdPerson));
  $('viewBtn').setAttribute('aria-label',G.thirdPerson?'Switch to first-person view (V)':'Switch to front-facing third-person view (V)');
  $('viewBtn').disabled=G.state!=='aim'||uiBusy()||isDriving();
  $('putAwayBtn').disabled=G.state!=='aim'||uiBusy();
  $('helpBtn').disabled=G.state!=='aim'||uiBusy();
  $('hideHudBtn').disabled=G.state!=='aim'||uiBusy();
  $('hud').inert=uiBusy()||G.state==='menu'||G.state==='caught';
  $('app').classList.toggle('front-view',G.thirdPerson&&G.state!=='menu');
  $('app').classList.toggle('carrying-fish',!!heldCatch);
  updateLockHint();
}
function updatePlayerView(moving=false){
  if(isDriving()&&G.state!=='menu'){
    const b=BOATS[G.boat],v=G.sailing,ground=b.size*.9;
    playerModel.root.visible=true;rodRig.visible=false;heldFishRig.visible=false;
    playerModel.pose({x:G.px,z:G.pz,ground,yaw:v.yaw,pitch:0,time:G.time,stride:0,moving:false,holding:false,rodRotation:rodRig.quaternion,bend:0});
    playerModel.rod.visible=false;
    const p=boatViewPose({x:G.px,z:G.pz,yaw:v.yaw,size:b.size,aspect:frontCamera.aspect});
    frontCamera.position.set(p.x,p.y,p.z);frontCamera.lookAt(p.targetX,p.targetY,p.targetZ);return;
  }
  const third=activeCamera()===frontCamera, ground=G.camY-EYE;
  const carry=heldCatch?heldFishLayout(carriedSize):null;
  playerModel.root.visible=third;
  rodRig.visible=!third&&!heldCatch&&!isDriving();
  heldFishRig.visible=!!heldCatch&&!isDriving()&&G.state!=='menu';
  if(third)playerModel.pose({x:G.px,z:G.pz,ground,yaw:G.yaw,pitch:G.pitch,time:G.time,stride:G.bob,moving,
    holding:!!heldCatch,carry,rodRotation:rodRig.quaternion,bend:tipJoint.rotation.x});
  if(third){
    const p=frontViewPose({x:G.px,z:G.pz,ground,yaw:G.yaw,pitch:G.pitch,aspect:frontCamera.aspect,fov:frontCamera.fov,fish:heldCatch?carriedSize:null},world.cameraBlockers[G.zone]);
    frontCamera.position.set(p.x,p.y,p.z);frontCamera.lookAt(p.targetX,p.targetY,p.targetZ);
  }
  if(heldCatch){
    const parent=third?playerModel.fishMount:camera;
    if(heldFishRig.parent!==parent)parent.add(heldFishRig);
    if(third)heldFishRig.position.set(0,0,0);
    else{
      const p=firstPersonFishPose(carriedSize,{aspect:camera.aspect,fov:camera.fov});
      heldFishRig.position.set(p.x,p.y,p.z);
    }
    heldFishRig.scale.setScalar(1); // Same huge model in either view; only the framing changes.
    heldFishRig.rotation.set(0,0,Math.sin(G.time*1.7)*.018);
    animateFishModel(carriedModel,G.time,.22);
  }
}
function toggleView(){
  if(uiBusy()||isDriving()||G.state!=='aim')return false;
  G.thirdPerson=!G.thirdPerson;
  clearInput();setState('aim');$('viewBtn').blur();
  return true;
}
function openBag(tab='fish'){
  if(!BAG_TABS.includes(tab))return false;
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Finish your cast before opening your bag.');return false;}
  bagOpen=true;bagTab=tab;if(tab!=='fish')lastGearTab=tab;
  bagOverlay.classList.remove('hidden');renderBag();focusPanel('bagClose');
  return true;
}
function closeBag(){
  if(!bagOpen)return;
  bagOpen=false;bagOverlay.classList.add('hidden');fishIcons.disconnect(bagBody);resumeWorld();
}
// B opens catches; I remains a quick route to the last owned-gear tab.
// Both routes use the exact same panel, selection, guards and focus trap.
function openFishBag(){return openBag('fish');}
function closeFishBag(){closeBag();}
function openKit(){return openBag(lastGearTab);}
function selectBagTab(tab){
  if(!bagOpen||!BAG_TABS.includes(tab))return false;
  bagTab=tab;if(tab!=='fish')lastGearTab=tab;
  renderBag();bagBody.scrollTop=0;
  return true;
}
function renderBag(){
  if(!bagOpen)return;
  const hadBodyFocus=bagBody.contains(document.activeElement);
  $('bagFishCount').textContent=`${fmt(bag.length)}/${PERSONAL_CAPACITY} bag · ${boatStore().length}/${storageCaps().boat} boat`;
  document.querySelectorAll('[data-bag-tab]').forEach(t=>{
    const active=t.dataset.bagTab===bagTab;
    t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;
  });
  bagBody.setAttribute('aria-labelledby','bagTab-'+bagTab);
  const kind=bagGearKind(bagTab);
  $('bagNote').textContent=kind
    ? 'Equip owned tackle for free, wherever you are. Buy new gear at local stalls.'+(kind==='bait'?' The rarity range applies to all fish sizes. Earlier bait can still help with lower rarities.':'')
    : 'Hold a catch without removing it from your bag. Sell fish at the market.';
  if(kind&&G.equipmentArchive?.[kind]?.length)$('bagNote').textContent+=' Original equipment was converted to these island-equivalent tiers; your '+G.equipmentArchive[kind].length+' legacy ownership records are retained.';
  if(kind){fishIcons.disconnect(bagBody);bagBody.innerHTML=gearRows(kind,G.owned[kind].slice().sort((a,b)=>a-b));}
  else renderFishBag();
  // Equipping replaces its row. Keep keyboard focus inside the live panel.
  if(hadBodyFocus&&!bagBody.contains(document.activeElement))bagBody.focus({preventScroll:true});
}
function renderFishBag(){
  if(!bagOpen||bagTab!=='fish')return;
  fishIcons.disconnect(bagBody);const cap=storageCaps(),atStorage=G.onBoat||isNearVendor('port')||nearbyHubBuilding()?.id==='warehouse';
  const rows=(items,source)=>items.map((e,i)=>`<article class="carry-row"><div class="carry-icon">${fishIcons.markup(e.sp)}</div><div class="carry-copy">${fishBadge(e)}<span class="carry-rarity ${e.sp.rarity}">${RARITY[e.sp.rarity].label}</span><b>${e.sp.name}</b><small>${formatCatchMass(e.weight)} · ${fishPlace(e.sp)}${e.mutation?' · '+e.mutation:''}</small></div>${source==='bag'?`<button class="buy-btn" data-hold-fish="${i}">Hold</button>`:''}${bagActionMode==='transfer'?`<button class="buy-btn" data-transfer="${source}:${i}" ${!atStorage?'disabled':''}>${source==='bag'?'→ Boat':'← Bag'}</button>`:`<button class="buy-btn" data-aquarium="${source}:${i}" ${G.collections.aquarium.length>=12+(G.collections.aquariumUpgrade||0)*4||nearbyHubBuilding()?.id!=='aquarium'?'disabled':''}>Display</button>`}</article>`).join('');
  const upgrade=G.collections.boatStorageUpgrade[G.boat]||0,cost=STORAGE_UPGRADE_COST[upgrade+1]||0;
  bagBody.innerHTML=`<div class="storage-meter"><b>PERSONAL ${bag.length}/${cap.personal}</b><b>BOAT ${boatStore().length}/${cap.boat}</b><small>${atStorage?'Transfer fish here, aboard, or at a boatyard.':'Visit Reedhaven Warehouse, board your boat, or use a boatyard to transfer.'}</small></div><button class="buy-btn" data-bag-mode>${bagActionMode==='transfer'?'Switch to aquarium display':'Switch to storage transfer'}</button><h3 class="storage-heading">Personal bag · ${bag.length}/${PERSONAL_CAPACITY}</h3>${rows(bag,'bag')||'<p class="shop-empty">Personal bag is empty.</p>'}<h3 class="storage-heading">Boat hold · ${boatStore().length}/${cap.boat}</h3>${rows(boatStore(),'boat')||'<p class="shop-empty">No fish in this boat’s hold.</p>'}<button class="buy-btn storage-upgrade" data-storage-upgrade="boat" ${!atStorage||!cost||G.coins<cost?'disabled':''}>Expand this boat’s hold ${cost?`· ${fmt(cost)}c`:'· MAX'}</button><button class="buy-btn storage-upgrade" data-storage-upgrade="personal" ${G.collections.storageUpgrade>=3||G.coins<(STORAGE_UPGRADE_COST[G.collections.storageUpgrade+1]||0)?'disabled':''}>Expand personal inventory · ${G.collections.storageUpgrade>=3?'MAX':fmt(STORAGE_UPGRADE_COST[G.collections.storageUpgrade+1]||0)+'c'}</button>`;
  fishIcons.observe(bagBody);
}
function upgradeStorage(kind){const level=kind==='personal'?G.collections.storageUpgrade:G.collections.boatStorageUpgrade[G.boat]||0,cost=STORAGE_UPGRADE_COST[level+1];if(!cost||G.coins<cost){showToast('Not enough coins or storage is fully upgraded.',true);return;}if(kind==='boat'&&!G.onBoat&&!isNearVendor('port')&&nearbyHubBuilding()?.id!=='warehouse')return;G.coins-=cost;if(kind==='personal')G.collections.storageUpgrade++;else G.collections.boatStorageUpgrade[G.boat]=level+1;saveGame();updateStats();renderBag();}
function transferCatch(source,index){if(!G.onBoat&&!isNearVendor('port')){showToast('Transfer at your boat or a boatyard.',true);return;}const from=source==='bag'?bag:boatStore(),to=source==='bag'?boatStore():bag;if(!from[index]||to.length>=(source==='bag'?storageCaps().boat:storageCaps().personal))return;const[e]=from.splice(index,1);to.push(e);saveGame();renderBag();updateCarryUI();}
function nearbyHubBuilding(){if(G.onBoat)return null;return world.hubBuildings?.map(b=>({...b,distance:Math.hypot(G.px-b.x,G.pz-b.z)})).filter(b=>b.distance<12).sort((a,b)=>a.distance-b.distance)[0]||null;}
function nearbyQuestGiver(){if(G.onBoat)return null;return world.questGivers?.map(n=>({...n,distance:Math.hypot(G.px-n.x,G.pz-n.z)})).filter(n=>n.zone===G.zone&&n.distance<5).sort((a,b)=>a.distance-b.distance)[0]||null;}
function displayCatch(source,index){const from=source==='bag'?bag:boatStore(),limit=12+(G.collections.aquariumUpgrade||0)*4;if(nearbyHubBuilding()?.id!=='aquarium'){ showToast('Display catches from inside Reedhaven Aquarium.',true);return;}if(!from[index]||G.collections.aquarium.length>=limit)return;G.collections.aquarium.push(from.splice(index,1)[0]);saveGame();drawAquarium();renderBag();updateCarryUI();showToast('Fish placed in the physical aquarium.');}

function stowFish(){
  if(!heldCatch)return false;
  disposeFishModel(carriedModel);carriedModel=null;heldCatch=null;Object.assign(carriedSize,{x:0,y:0,z:0,gripY:0,gripZ:0,centerX:0});heldFishRig.visible=false;
  $('putAwayBtn').blur();
  updateCarryUI();updatePlayerView();
  if(G.state==='aim'&&!uiBusy())setState('aim');
  return true;
}
function holdFish(index){
  if(!bagOpen||bagTab!=='fish'||G.state!=='aim'||!Number.isInteger(index)||!bag[index])return false;
  const entry=bag[index];
  if(isDriving()){G.boatMode='fish';G.sailing.speed=0;G.yaw=G.sailing.yaw;}
  if(heldCatch===entry){stowFish();closeFishBag();return true;}
  stowFish();
  const model=makeFish3D(entry.sp,1);
  if(entry.mutation==='shiny')model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.color)o.material.color.offsetHSL(.08,.24,.18);if(o.material.emissive){o.material.emissive.setHex(0x8ed8d5);o.material.emissiveIntensity=.25;}o.material.metalness=.45;}});
  model.rotation.set(...model.userData.displayRotation); // See ray wings and real 3D heads, not an edge-on silhouette.
  // Precise vertex bounds matter for angled rays and sculpted fins: rotating
  // a coarse mesh AABB would otherwise inflate the reported trophy dimensions.
  const bounds=new THREE.Box3().setFromObject(model,true),size=new THREE.Vector3();
  bounds.getSize(size);
  model.scale.multiplyScalar(heldFishSpan(entry.sp,entry.weight)/Math.max(.01,size.x));
  bounds.setFromObject(model,true);bounds.getSize(size);Object.assign(carriedSize,{x:size.x,y:size.y,z:size.z});
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  // Support the actual trunk, not the midpoint of an eel's tail, a squid's
  // tentacles or a koi's long fins. The asymmetry is retained in camera framing.
  const gripX=new THREE.Vector3(model.userData.gripX,0,0).applyQuaternion(model.quaternion).multiplyScalar(model.scale.x).x-center.x;
  model.position.x-=gripX;carriedSize.centerX=-gripX;model.updateMatrixWorld(true);
  bounds.setFromObject(model.userData.belly,true);carriedSize.gripY=bounds.min.y;carriedSize.gripZ=bounds.min.z;
  model.traverse(o=>{o.layers.set(1);if(o.isMesh)o.material.fog=false;});
  carriedModel=model;heldCatch=entry;heldFishRig.add(model);
  closeFishBag();updateCarryUI();updatePlayerView();
  return true;
}

// The whole difficulty model lives here: how nasty the fish is (demand)
// versus how much your rod + line help (supply). The ratio sets both how
// fast the needle moves and how narrow the safe band is.
function fightSetup(sp, weight){
  const rod = RODS[G.gear.rod], ln = LINES[G.gear.line];
  const wr = clamp(weight / sp.maxW, 0, 1);
  const tier = RARITY[sp.rarity].tier;
  // demand: raw strength, fattened by how big this specimen is, plus rarity
  const demand = sp.difficulty * (0.75 + 0.45 * wr);
  // supply: better rod steadies the line, better line strains less.
  // Compressed so top gear is strong but never makes the lake trivial.
  const supply = Math.sqrt(rod.power*ln.control);
  // line over its rating: the fish is heavier than the line was built for
  const over = Math.max(0, weight / ln.rating - 1);
  const R = (demand / supply) * (1 + Math.min(over, 2) * 0.25);
  // the safe band shrinks with the mismatch — a monster on a twig is a sliver
  const width = clamp(58 * Math.pow(1.55, -1.6 * R), 8, 56);
  const center = 45;
  G.bandLo = clamp(center - width / 2, 4, 92);
  G.bandHi = clamp(center + width / 2, G.bandLo + 5, 96);
  const strainMul = 1 + Math.min(over, 2) * 0.5;
  G.rateMul = Math.min(2.2, clamp(0.55 + 0.5 * R, 0.62, 1.9) * strainMul);
  G.demand = demand; G.supply = supply; G.ratio = R; G.over = over;
  return R;
}
function hookFish(){
  if(G.state !== 'bite') return;
  hookedSpecies = pickSpecies();
  if(!hookedSpecies){showToast('This bait has no bites here. Switch bait in Bag → Bait.',true);setState('aim');return;}
  const wx=islandWeather(G.castTerritory??G.zone,Date.now());
  const territory=G.castTerritory??G.zone,bossesHere=BOSSES.filter(b=>b.island===territory);let boss=null;if(G.quests.progress['rare-water']?.complete&&bossesHere.length&&wx.id==='storm'&&Math.random()<.012)boss=bossesHere[G.activities.bosses%bossesHere.length];
  G.activities.bossEncounter=boss?{...boss,island:G.castTerritory??G.zone}:null;
  const w = rollWeight(hookedSpecies);
  hookedWeight = roundWeight(boss?Math.min(hookedSpecies.maxW,hookedSpecies.minW+(hookedSpecies.maxW-hookedSpecies.minW)*.88):w);
  disposeHookedFish();
  hookedFish = makeFish3D(hookedSpecies, Math.max(.08,heldFishSpan(hookedSpecies,hookedWeight)/(1.8*hookedSpecies.size))*(G.activities.bossEncounter?2.2:1));
  if(G.activities.bossEncounter){const colors=[0x65aaf0,0x70c4cf,0xef8b5f,0xb6d8ff,0x9d82e8],glow=colors[BOSSES.findIndex(b=>b.id===G.activities.bossEncounter.id)%colors.length];hookedFish.traverse(o=>{if(o.isMesh){o.material=o.material.clone();hookedFish.userData.materials.add(o.material);o.material.emissive?.setHex(glow);o.material.emissiveIntensity=.7;}});}
  hookedFish.position.copy(bobberPos); hookedFish.position.y = -0.7;
  scene.add(hookedFish);
  G.caughtAnim=0;
  G.tension = 26; G.progress = 6;
  G.fishStrength = hookedSpecies.strength*(G.activities.bossEncounter?1.85:1);
  G.fishWeight = hookedWeight;
  fightSetup(hookedSpecies, hookedWeight);
  if(wx.wind){const stabilizer=G.boatUpgrades[G.boat]?.type==='stability'?G.boatUpgrades[G.boat].level:0;wx.wind=Math.max(0,wx.wind*(1-stabilizer*.24));const center=(G.bandLo+G.bandHi)/2,width=(G.bandHi-G.bandLo)*(1-wx.wind*.12);G.bandLo=center-width/2;G.bandHi=center+width/2;G.rateMul=Math.min(2.2,G.rateMul*(1+wx.wind*.1));G.fishStrength*=1+wx.wind*.18;}
  if(G.activities.bossEncounter){const center=(G.bandLo+G.bandHi)/2,width=(G.bandHi-G.bandLo)*.68;G.bandLo=center-width/2;G.bandHi=center+width/2;G.rateMul=Math.min(2.2,G.rateMul*1.18);}
  G.reelPhase='calm'; G.reelPhaseTime=REEL_PHASES.calm.duration;
  G.fishTugTimer=G.activities.bossEncounter?rand(1.6,2.5):rand(2.4,3.8);G.fishTugWarn=0;G.fishTugDur=0;G.fishTug=0;G.nextFishTugDirection=G.activities.bossEncounter?.behavior==='dive'?-1:1;
  G.surgeTimer=0; G.surgeDur=0;
  G.yankTimer=0; G.yank=0; G.yankDur=0;
  G.reelHeld = false;
  reelFishName.innerHTML = G.activities.bossEncounter?`<span class="boss-title">BOSS · ${G.activities.bossEncounter.name}</span><span class="reel-fish">${fishIcons.markup(hookedSpecies,{eager:true})}</span>${G.activities.bossEncounter.title}`:G.discoveries[hookedSpecies.id] ? `<span class="reel-fish">${fishIcons.markup(hookedSpecies,{eager:true})}</span>${hookedSpecies.name}` : `<span class="reel-fish">${unknownFishSVG()}</span>Unidentified fish`;
  paintTensionBand();
  setState('reeling');
  sfx.hook();
  spawnSplash(bobberPos, 12, 0.8);
}
function catchFish(){
  if(G.state !== 'reeling' || !hookedSpecies) return;
  const sp = hookedSpecies;
  let weight = roundWeight(hookedWeight || rollWeight(sp));
  const mutation=rollMutation(Math.random,weight/Math.max(.001,sp.maxW));if(mutation==='huge')weight=roundWeight(Math.min(sp.maxW*1.45,weight*1.3));
  if(!canCarryCatch()){showToast('No free space in your bag or boat hold. Fish released safely.',true);G.activities.bossEncounter=null;setState('aim');return;}
  const bonusBefore = coinBonus();
  const oldLevel=level(), lockedBefore=ISLANDS.filter(i=>!hasLicense(i.id)), isNew=!G.discoveries[sp.id];
  const earnedXP=catchXP(sp,Number(weight),isNew);
  const awardedXP=capCatchXP(G.xp,earnedXP);
  G.xp+=awardedXP; // one catch can never skip multiple levels
  const priorRecord=G.discoveries[sp.id],speciesRecord=!priorRecord||Number(weight)>Number(priorRecord.best);const islandRecord=SPECIES.filter(x=>x.island===sp.island).every(x=>x.id===sp.id||Number(G.discoveries[x.id]?.best||0)<=Number(weight));
  const record=priorRecord||(G.discoveries[sp.id]={count:0,best:0,first:new Date().toISOString().slice(0,10)});
  record.count++; record.best=Math.max(record.best,Number(weight));if(mutation){G.collections.mutations[mutation]=(G.collections.mutations[mutation]||0)+1;G.collections.mutationBySpecies=G.collections.mutationBySpecies||{};const mr=G.collections.mutationBySpecies[sp.id]||(G.collections.mutationBySpecies[sp.id]={});mr[mutation]=(mr[mutation]||0)+1;}
  G.completedIslands=completedCollections(G.discoveries,G.completedIslands);
  const bonus = coinBonus(), value = saleValue(sp,weight);
  $('collectionReward').classList.toggle('hidden',bonus<=bonusBefore);
  $('collectionReward').innerHTML = bonus>bonusBefore
    ? `<strong>${ISLANDS[sp.island].short} index complete!</strong><span>+${ISLAND_COLLECTION_BONUS}% sale coins forever · total +${bonus}%</span>` : '';
  G.score += sp.pts; G.caught++;
  G.caughtAnim=0;
  $('newDiscovery').classList.toggle('hidden',!isNew);
  $('catchLevel').classList.toggle('hidden',level()===oldLevel);
  const unlocked=lockedBefore.filter(i=>hasLicense(i.id));
  $('catchLevel').textContent=level()>oldLevel ? `LEVEL ${level()}!${unlocked.length?' · '+unlocked.map(i=>i.short).join(', ')+' license unlocked':level()===MAX_LEVEL?' · maximum level reached':lockedBefore.length?' · one step closer to the next island':' · all island licenses unlocked'}`:'';
  const isBest = !G.best || parseFloat(weight) > parseFloat(G.best.weight);
  if(!G.best || parseFloat(weight) > parseFloat(G.best.weight)) G.best = { id:sp.id,name:sp.name, weight };
  log.unshift({ sp, weight,mutation });
  if(log.length>200) log.length=200;
  const caughtEntry={sp,weight,mutation};if(bag.length<storageCaps().personal)bag.push(caughtEntry);else if(G.onBoat&&boatStore().length<storageCaps().boat)boatStore().push(caughtEntry);
  const boss=G.activities.bossEncounter;
  if(boss){const bounty=1200+sp.island*350;G.coins+=bounty;G.activities.bosses++;G.activities.lastBoss=boss.name;showToast(`${boss.name} defeated · +${fmt(bounty)} coins`);}
  applyQuestProgress({type:'catch',island:sp.island,speciesId:sp.id,rarityTier:RARITY[sp.rarity].tier,mutation});
  recordActivity({kind:'catch',amount:1,island:sp.island,rarity:RARITY[sp.rarity].tier,weather:islandWeather(sp.island,Date.now()).id,bait:G.gear.bait});
  if(RARITY[sp.rarity].tier>=2)recordActivity({kind:'rare',amount:1,island:sp.island,rarity:RARITY[sp.rarity].tier});
  recordActivity({kind:'island',island:sp.island});recordActivity({kind:'weather',weather:islandWeather(sp.island,Date.now()).id});recordActivity({kind:'gear',bait:G.gear.bait});
  if(boss)recordActivity({kind:'boss',amount:1,island:sp.island,rarity:RARITY[sp.rarity].tier});
  collectionAchievements();G.activities.bossEncounter=null;
  invalidateLog(); updateStats(); saveGame();

  $('catchRarity').textContent = sp.rarity.toUpperCase() + ' CATCH';
  $('catchRarity').className = 'modal-eyebrow' + (sp.rarity !== 'common' ? ' ' + sp.rarity : '');
  $('catchIcon').innerHTML = fishIcons.markup(sp,{eager:true});
  $('catchName').textContent = `${mutation?mutation.toUpperCase()+' · ':''}${boss?`${boss.name} · ${boss.title}`:sp.name}`;
  $('catchModal').classList.toggle('mutation-shiny',mutation==='shiny');$('catchModal').classList.toggle('mutation-huge',mutation==='huge');
  $('catchWeight').textContent = formatCatchMass(weight);
  $('catchPoints').innerHTML = '+' + fmt(awardedXP) + ' XP' + (isNew?' · 50% discovery bonus':'') + '<span class="catch-value">WORTH ' + fmt(value) + 'c AT THE MARKET</span>';
  $('catchDesc').textContent = sp.desc;
  catchModal.querySelector('.modal-card').className = 'modal-card ' + sp.rarity;
  catchModal.classList.remove('hidden');
  lockHint.classList.add('hidden');
  setState('caught');
  releasePointer();
  $('continueBtn').focus({preventScroll:true});
  if(RARITY[sp.rarity].tier >= 4) sfx.legendary(); else sfx.caught();
  spawnSplash(bobberPos, 18, 1.1);
  if(speciesRecord&&G.caught>1)showToast(`NEW SPECIES RECORD · ${sp.name} · ${formatCatchMass(weight)}!`);else if(islandRecord&&G.caught>1)showToast(`NEW ${ISLANDS[sp.island].short.toUpperCase()} ISLAND RECORD · ${formatCatchMass(weight)} ${sp.name}!`);else if(isBest&&G.caught>1)showToast('New personal best — '+formatCatchMass(weight)+' '+sp.name+'!');
}
function escapeFish(reason){
  disposeHookedFish();
  showToast(reason, true);
  sfx.escape();
  setState('aim');
}
function reelInEarly(){
  bobber.visible = false; line.visible = false;
  spawnRipple(bobberPos);
  sfx.plip();
  setState('aim');
}

// ---------- particles / ripples ----------
let pCursor = 0, activeParticles = 0, activeRipples = 0;
function spawnSplash(pos, n, spread){
  for(let k=0;k<n;k++){
    const p = pData[pCursor];
    pCursor = (pCursor + 1) % P_MAX;
    if(p.life<=0)activeParticles++;
    p.life = rand(0.35, 0.7);
    p.x = pos.x + rand(-0.2,0.2); p.y = pos.y + 0.1; p.z = pos.z + rand(-0.2,0.2);
    p.vx = rand(-spread, spread); p.vy = rand(1.6, 3.4); p.vz = rand(-spread, spread);
  }
}
function spawnRipple(pos){
  for(const r of ripples){
    if(r.life <= 0){
      r.life = 1;activeRipples++;
      r.mesh.visible = true;
      r.mesh.position.set(pos.x, 0.16, pos.z);
      r.mesh.scale.setScalar(0.6);
      r.mesh.material.opacity = 0.85;
      return;
    }
  }
}
function updateParticles(dt){
  // An empty pool is invisible and does not rewrite/upload 70 matrices every
  // frame. The final live frame clears expired instances before going dormant.
  if(activeParticles){
    for(let i=0;i<P_MAX;i++){
      const p=pData[i];
      if(p.life>0){
        p.life-=dt;
        if(p.life<=0){p.life=0;activeParticles--;}
        p.vy-=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        const size=Math.max(0,Math.min(.14,p.life*.2));
        D.position.set(p.x,Math.max(.02,p.y),p.z);D.rotation.set(0,0,0);D.scale.set(size,size,size);
      }else{D.scale.set(0,0,0);D.position.set(0,-50,0);}
      D.updateMatrix();pMesh.setMatrixAt(i,D.matrix);
    }
    pMesh.instanceMatrix.needsUpdate=true;frameWork.particleUploads++;
    pMesh.visible=activeParticles>0;
  }
  if(activeRipples)for(const r of ripples){
    if(r.life>0){
      r.life-=dt*1.1;
      r.mesh.scale.setScalar(1+(1-r.life)*5);
      r.mesh.material.opacity=Math.max(0,r.life)*.8;
      if(r.life<=0){r.mesh.visible=false;activeRipples--;}
    }
  }
}

// ---------- line ----------
function updateLine(from, to, sag){
  const mx = (from.x + to.x) * 0.5;
  const my = (from.y + to.y) * 0.5 - sag;
  const mz = (from.z + to.z) * 0.5;
  for(let i=0;i<LINE_POINTS;i++){
    const t = i / (LINE_POINTS - 1), u = 1 - t;
    linePos[i*3]     = u*u*from.x + 2*u*t*mx + t*t*to.x;
    linePos[i*3 + 1] = u*u*from.y + 2*u*t*my + t*t*to.y;
    linePos[i*3 + 2] = u*u*from.z + 2*u*t*mz + t*t*to.z;
  }
  lineGeo.attributes.position.needsUpdate = true;
}

// ---------- Walk + shop input state ----------
const keys = { f:false, b:false, l:false, r:false, sprint:false };
const stick = { active:false, x:0, y:0, id:-1, cx:0, cy:0 };

function setKey(code, down){
  switch(code){
    case 'KeyW': case 'ArrowUp': keys.f = down; return true;
    case 'KeyS': case 'ArrowDown': keys.b = down; return true;
    case 'KeyA': case 'ArrowLeft': keys.l = down; return true;
    case 'KeyD': case 'ArrowRight': keys.r = down; return true;
    case 'ShiftLeft': case 'ShiftRight': keys.sprint = down; return true;
  }
  return false;
}
function clearKeys(){ keys.f = keys.b = keys.l = keys.r = keys.sprint = false; }

// ---------- Reel band ----------
function paintTensionBand(){
  const lo = G.bandLo, hi = G.bandHi;
  const safe = $('tensionSafe'), track = $('tensionTrack');
  safe.style.left = lo + '%';
  safe.style.width = (hi - lo) + '%';
  track.style.background =
    `linear-gradient(90deg, var(--red) 0 ${RED_LO}%, var(--amber) ${RED_LO}% ${lo}%,` +
    ` var(--green) ${lo}% ${hi}%, var(--amber) ${hi}% ${RED_HI}%, var(--red) ${RED_HI}% 100%)`;
}

// ---------- Shop ----------
const GEAR = {
  rod:  { list:RODS,  label:'rod',  tab:'rods' },
  line: { list:LINES, label:'line', tab:'lines' },
  bait: { list:BAITS, label:'bait', tab:'bait' },
};
// one number that captures cast reach, crank speed and forgiveness
const rodPower = r => Math.round(r.cast * Math.pow(r.reel / r.tension, 0.6));
const gearStat = (kind, g) => {
  if(kind === 'rod')  return `REACH ${g.cast}m · REEL ${g.reel.toFixed(2)}x · POWER ${rodPower(g)}`;
  if(kind === 'line') return `RATING ${fmt(g.rating)} lb · CONTROL ${g.control.toFixed(1)}×`;
  const lo = RARITY[RARITY_ORDER[g.lo]].label, hi = RARITY[RARITY_ORDER[g.hi]].label;
  const weight = g.weightBonus ? `WEIGHT UP TO +${fmt(g.weightBonus * 100)}%` : 'STANDARD WEIGHT';
  return `CATCHES ${lo === hi ? lo : lo + '–' + hi} · ALL SIZES · LUCK +${Math.round(g.luck * 100)}% · ${weight}`;
};
const swatchStyle = (kind, g) => `background:#${g.color.toString(16).padStart(6, '0')}`;
// how this tier compares to what you have on
function gearDelta(kind, g, i){
  const cur = GEAR[kind].list[G.gear[kind]];
  if(!cur || cur === g) return '<small class="gear-tag on">EQUIPPED</small>';
  // tiers behind the one you field are history — don't score them against it
  if(typeof i === 'number' && i < G.gear[kind]) return `<small class="gear-tag owned">${G.owned[kind].includes(i)?'OWNED':'EARLIER TIER'}</small>`;
  if(kind === 'rod'){
    const c = g.cast - cur.cast;
    const ratio = rodPower(g) / rodPower(cur);
    const p = ratio >= 1.9 ? '\u00d7' + ratio.toFixed(1) + ' stronger'
                           : (ratio >= 1 ? '+' : '') + Math.round((ratio - 1) * 100) + '% power';
    const speed = Math.round((g.reel / cur.reel - 1) * 100);
    return `<small class="gear-delta">${p} · +${c}m reach · +${speed}% reel speed</small>`;
  }
  if(kind === 'line'){
    const d = g.rating - cur.rating, relief = Math.round((1 - g.strain / cur.strain) * 100);
    return `<small class="gear-delta">${d >= 0 ? '+' : ''}${d} lb rating · ${relief}% less strain</small>`;
  }
  const d = Math.round((g.luck - cur.luck) * 100);
  const parts = [];
  if(g.hi > cur.hi) parts.push(`unlocks ${RARITY[RARITY_ORDER[g.hi]].label}`);
  if(g.lo > cur.lo) parts.push(`drops ${RARITY[RARITY_ORDER[g.lo - 1]].label} and below`);
  parts.push(`${d >= 0 ? '+' : ''}${d}% luck`);
  const weightDelta = (g.weightBonus - cur.weightBonus) * 100;
  parts.push(`${weightDelta >= 0 ? '+' : ''}${fmt(weightDelta)}% weight bonus cap`);
  return `<small class="gear-delta">${parts.join(' \u00b7 ')}</small>`;
}

function gearRow(kind, g, i){
  const owned = G.owned[kind].includes(i);
  const equipped = G.gear[kind] === i;
  const afford = G.coins >= g.cost;
  const btn = equipped
    ? '<button class="buy-btn equip" disabled>IN USE</button>'
    : owned
      ? `<button class="buy-btn equip" data-buy="${i}">EQUIP</button>`
      : afford
        ? `<button class="buy-btn" data-buy="${i}">${fmt(g.cost)}c</button>`
        : `<button class="buy-btn deny" disabled>${fmt(g.cost)}c<i>need ${fmt(g.cost - G.coins)} more</i></button>`;
  const cls = kind === 'bait' ? 'gear-swatch bait' : kind === 'line' ? 'gear-swatch spool' : 'gear-swatch';
  const short = !owned && !afford ? ' short' : '';
  return `<div class="rod-card${equipped ? ' equipped' : ''}${owned ? '' : ' unowned'}${short}" data-tier="${i}">
    <div class="${cls}" style="${swatchStyle(kind, g)}"></div>
    <div class="rod-info">
      <b>${g.name}<span class="tier-no">${i + 1}</span></b>
      <small>${gearStat(kind, g)}</small>
      ${gearDelta(kind, g, i)}
    </div>
    ${btn}
  </div>`;
}

const entrySale=e=>saleValue(e.sp,e.weight,e.mutation);
const bagTotal = () => bag.reduce((a,e) => a + entrySale(e),0);

function gearRows(kind,indexes){
  return indexes.map(index=>{
    let row=gearRow(kind,GEAR[kind].list[index],index);
    if(kind==='bait'){
      const count=localFishPool(G.zone,index).length;
      row=row.replace('</b>','</b><small class="local-pool '+(count?'':'no-bites')+'">'+(count?count+' possible species in '+ISLANDS[G.zone].short:'NO BITES IN THESE WATERS')+'</small>');
    }
    return row;
  }).join('');
}
function renderShop(){
  if(!shopOpen)return;
  $('shopCoins').textContent=fmt(G.coins);
  const kind=shopKind,i=ISLANDS[G.zone];
  $('shopTitle').textContent={rod:'Rod Works',line:'Line & Spool',bait:'Bait Shack'}[kind];
  $('shopEyebrow').textContent=i.name.toUpperCase()+' · LOCAL OUTFITTER';
  $('shopNote').textContent=i.id===0?`Three Reedhaven tiers: keep the free starter, then buy two upgrades. Prices below are exact.`:`Two local tiers: ${i.id*2+1}–${i.id*2+2}. Prices below are the exact coins charged.`;
  if(kind==='bait')$('shopNote').textContent+=' All local fish in the shown rarity range are eligible, regardless of size. Luck favors rarer eligible fish; it is not a catch percentage. The small weight boost tapers near each species’ maximum.';
  shopBody.innerHTML=gearRows(kind,GEAR[kind].list.map((g,index)=>index).filter(index=>gearIsland(index)===G.zone));
  if(G.zone<ISLANDS.length-1)shopBody.innerHTML+=`<div class="next-stock">Next shipment: tiers ${i.id*2+3}–${i.id*2+4} at <b>${ISLANDS[i.id+1].name}</b> · Level ${ISLANDS[i.id+1].level}</div>`;
}
function openShop(kind){
  if(uiBusy()||G.state!=='aim')return;
  const nearest=nearestVendor();
  const wanted=typeof kind==='string'?kind:nearest?.kind;
  if(!GEAR[wanted]||!isNearVendor(wanted)){showToast('Walk up to a rod, line or bait stall first.',true);return;}
  shopKind=wanted;shopOpen=true;
  shopOverlay.classList.remove('hidden');shopBtnEl.classList.add('hidden');
  renderShop();ensureAudio();focusPanel('shopClose');
}
function closeShop(){
  if(!shopOpen)return;
  shopOpen=false;shopOverlay.classList.add('hidden');resumeWorld();
}

function buyGear(kind, i){
  const g = GEAR[kind]?.list[i];
  const inBag=bagOpen&&bagGearKind(bagTab)===kind,inShop=shopOpen&&shopKind===kind;
  if(!g||!Number.isInteger(i)||(!inBag&&!inShop)||G.state!=='aim')return;
  if(!G.owned[kind].includes(i)&&(!inShop||gearIsland(i)!==G.zone||!hasLicense(G.zone)||!isNearVendor(kind))){
    showToast(`Sold at ${ISLANDS[gearIsland(i)].name}'s ${kind} stall.`,true);return;
  }
  if(G.owned[kind].includes(i)){
    if(G.gear[kind] === i) return;
    G.gear[kind] = i;
    applyGear(); sfx.buy(); showToast('Equipped the ' + g.name + '.');
    saveGame(); updateStats(); renderShop(); renderBag();
    return;
  }
  if(G.coins < g.cost){
    sfx.deny();
    showToast(`Not enough coins — you need ${fmt(g.cost - G.coins)} more.`, true);
    return;
  }
  G.coins -= g.cost;
  G.owned[kind].push(i);
  G.gear[kind] = i;
  applyGear(); updateStats(); saveGame(); sfx.buy(); renderShop(); renderBag();
  showToast('Bought the ' + g.name + '!');
}
function applyGear(){
  const r = RODS[G.gear.rod] || RODS[0];
  rodMat.color.setHex(r.color);if(starterRodDetails)starterRodDetails.visible=G.gear.rod===0;
  const l = LINES[G.gear.line] || LINES[0];
  lineMat.color.setHex(l.id === 'twine' ? 0xe8dcc0 : l.color);
  updateStats();
}

// ---------- Fish market ----------
function renderMarket(){
  if(!marketOpen) return;
  $('marketCoins').textContent = fmt(G.coins);
  const bonus = coinBonus();
  $('marketNote').textContent = bonus
    ? `Permanent index bonus: +${bonus}% on all fish sales. Every price below includes it. Selling keeps your discoveries and bonus.`
    : `Complete an island’s fish index to earn +${ISLAND_COLLECTION_BONUS}% sale coins forever. Selling never erases discoveries.`;
  const body = marketBody;
  fishIcons.disconnect(body);
  const hold=boatStore(),all=[...bag.map((e,i)=>({e,i,source:'bag'})),...hold.map((e,i)=>({e,i,source:'boat'}))],total=all.reduce((sum,x)=>sum+entrySale(x.e),0);
  if(!all.length){body.innerHTML='<p class="shop-empty">Your personal bag and boat hold are empty.<br>Catch fish and bring them here.</p>';return;}
  body.innerHTML=`<div class="bag-total"><span>${bag.length} personal · ${hold.length} boat hold</span><span>${fmt(total)}c</span></div>`+all.map(({e,i,source})=>`<div class="sell-row"><div class="e">${fishIcons.markup(e.sp)}</div><div><b>${e.mutation?e.mutation.toUpperCase()+' · ':''}${e.sp.name}</b><small>${formatCatchMass(e.weight)} · ${RARITY[e.sp.rarity].label} · ${source}</small></div><div class="val">${fmt(entrySale(e))}c</div><button class="buy-btn" data-sell="${source}:${i}">Sell</button></div>`).join('')+`<button class="sell-all" id="sellAll">SELL PERSONAL BAG · ${fmt(bagTotal())}c</button>`;
  fishIcons.observe(body);
}
function openMarket(){
  if(uiBusy() || G.state !== 'aim') return;
  if(!isNearVendor('market')){ showToast('Walk over to the fish market first.', true); return; }
  marketOpen = true;
  clearInput();
  releasePointer();
  hidePrompt();
  $('marketOverlay').classList.remove('hidden');
  marketBtnEl.classList.add('hidden');
  renderMarket();
  ensureAudio();
  focusPanel('marketClose');
}
function closeMarket(){
  if(!marketOpen) return;
  marketOpen = false;
  $('marketOverlay').classList.add('hidden');
  fishIcons.disconnect(marketBody);resumeWorld();
}
function sellStored(source,i){const list=source==='boat'?boatStore():bag,e=list[i];if(!e)return;G.coins+=entrySale(e);list.splice(i,1);recordActivity({kind:'sell',amount:1});sfx.coin();updateStats();saveGame();renderMarket();showToast('Fish sold for '+fmt(entrySale(e))+' coins.');}
function sellFish(i){
  if(!marketOpen || !isNearVendor('market') || !Number.isInteger(i))return;
  const e = bag[i];
  if(!e) return;
  const v = entrySale(e);
  bag.splice(i, 1);
  G.coins += v;recordActivity({kind:'sell',amount:1});
  sfx.coin(); updateStats(); saveGame(); renderMarket();
  showToast('+' + fmt(v) + ' coins');
}
function sellAll(){
  if(!marketOpen || !isNearVendor('market') || !bag.length) return;
  const total = bagTotal(),soldCount=bag.length;
  G.coins += total;recordActivity({kind:'sell',amount:soldCount});
  bag.length = 0;
  sfx.coin(); updateStats(); saveGame(); renderMarket();
  showToast('Sold the lot for ' + fmt(total) + ' coins!');
}

// ---------- Island vendors, field guide and voyages ----------
const vendorProximity=memoLast((zone,x,z)=>{
  frameWork.vendorChecks++;
  let closest=null,distance=6.3;const near=new Set();
  for(const s of world.stalls){
    if(s.zone!==zone)continue;
    const d=Math.hypot(x-s.x,z-s.z);
    if(d<6.3)near.add(s.kind);
    if(d<distance){distance=d;closest=s;}
  }
  return {closest,near};
});
function nearestVendor(){if(G.onBoat)return null;return vendorProximity(G.zone,G.px,G.pz).closest;}
function isNearVendor(kind){if(G.onBoat)return false;return vendorProximity(G.zone,G.px,G.pz).near.has(kind);}
function clearInput(){
  clearKeys(); G.reelHeld=false;
  stick.active=false;stick.x=stick.y=0;stick.id=-1;stickKnob.style.transform='';
  dragging=false; fishingPointer=null;
}
function focusPanel(id){
  clearInput();releasePointer();hidePrompt();updateCarryUI();lockHint.classList.add('hidden');
  clearTimeout(showToast._t);toastEl.classList.add('hidden');
  // The panel is already visible. Focus now: a deferred frame can steal focus
  // back from a tab/content the player has already selected on a slow device.
  const el=$(id);if(el.getClientRects().length)el.focus({preventScroll:true});
}
function resumeWorld(){
  clearInput();
  if(!uiBusy())canvas.focus({preventScroll:true});
  if(G.state==='aim')setState('aim');
  updateLockHint();
}
const TUTORIAL_SEEN_KEY='reel-deal-tutorial-seen-v1';
const TUTORIAL_SLIDES=[
  {art:'⌖',title:'Explore the shore',copy:'Look around with the mouse or by dragging. Walk with WASD; Shift jogs. On touch screens, drag the joystick. Find the pier and your boat.'},
  {art:'↗',title:'Cast and hook',copy:'Hold click or Space, then release to cast. When the bite cue appears, click or press Space to hook the fish. On touch, tap and hold, then tap the bite.'},
  {art:'≈',title:'Fight the fish',copy:'Watch the moving tension needle. Green makes reeling progress, yellow pauses it, and either red end loses the fish. Hold/release to move tension; the fish’s rhythm phases change how it pulls.'},
  {art:'⇢',title:'Read the tug cue',copy:'A bright arrow appears before each sudden fish tug. It points in the direction tension will jump; the one-word label names the movement. Surges and dives alternate.'},
  {art:'⌂',title:'Travel and grow',copy:'R boards or returns you to your own boat. Q stops or takes the helm; walk the deck while stopped. Level up to unlock islands, catch local fish, upgrade at stalls and sell at markets.'},
];
function renderTutorialSlide(){
  const slide=TUTORIAL_SLIDES[tutorialIndex],card=tutorialOverlay.querySelector('.tutorial-card');
  $('tutorialArt').textContent=slide.art;$('tutorialTitle').textContent=slide.title;$('tutorialCopy').textContent=slide.copy;
  setText($('tutorialStep'),`${String(tutorialIndex+1).padStart(2,'0')} / ${String(TUTORIAL_SLIDES.length).padStart(2,'0')}`);
  $('tutorialProgressFill').style.width=`${(tutorialIndex+1)/TUTORIAL_SLIDES.length*100}%`;
  $('tutorialBack').disabled=tutorialIndex===0;
  setText($('tutorialNext'),tutorialIndex===TUTORIAL_SLIDES.length-1?'Start fishing →':'Next →');
  card.classList.remove('tutorial-enter');void card.offsetWidth;card.classList.add('tutorial-enter');
}
function openTutorial(){
  if(G.state!=='aim')return false;
  if(helpOpen)closeHelp();tutorialIndex=0;tutorialOpen=true;clearInput();tutorialOverlay.classList.remove('hidden');renderTutorialSlide();focusPanel('tutorialNext');return true;
}
function closeTutorial(){
  if(!tutorialOpen)return;
  tutorialOpen=false;tutorialOverlay.classList.add('hidden');
  try{localStorage.setItem(TUTORIAL_SEEN_KEY,'done');}catch{}
  resumeWorld();
}
function stepTutorial(delta){
  if(!tutorialOpen)return;
  const next=tutorialIndex+delta;
  if(next<0)return;
  if(next>=TUTORIAL_SLIDES.length){closeTutorial();return;}
  tutorialIndex=next;renderTutorialSlide();
}
// Help is an idle-only panel, just like the bag: it cannot consume a bite,
// leave a stuck movement key, or take focus away from an active fight.
function openHelp(){
  if(uiBusy()||G.state!=='aim')return false;
  helpOpen=true;helpOverlay.classList.remove('hidden');focusPanel('helpClose');
  return true;
}
function closeHelp(){
  if(!helpOpen)return;
  helpOpen=false;helpOverlay.classList.add('hidden');resumeWorld();
}
let hudHintTimer;
function setHudHidden(hidden){
  if(hidden===hudHidden)return true;
  if(hidden&&(uiBusy()||G.state!=='aim'))return false;
  clearInput();releasePointer();clearTimeout(hudHintTimer);
  hudHidden=hidden;$('app').classList.toggle('hud-hidden',hidden);
  $('restoreHudBtn').classList.toggle('hidden',!hidden);
  if(hidden){
    $('hudRestoreHint').textContent=isTouch?'HUD hidden · Tap anywhere to return':'HUD hidden · Click anywhere or press H / Esc to return';
    $('hudRestoreHint').classList.remove('hidden');
    hudHintTimer=setTimeout(()=>$('hudRestoreHint').classList.add('hidden'),2000);
    updateCarryUI();hidePrompt();$('restoreHudBtn').focus({preventScroll:true});
  }else resumeWorld();
  return true;
}

function unknownFishSVG(){
  return '<svg viewBox="0 0 64 40" role="img" aria-label="Undiscovered fish" shape-rendering="crispEdges"><path d="M8 14h8v-4h24v4h8v4h4V8h8v24h-8V22h-4v6h-8v4H16v-4H8v-4H4v-6h4z" fill="#13282d"/></svg>';
}
function openIndex(){
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Land this catch first, then open the index.');return;}
  indexOpen=true;$('indexOverlay').classList.remove('hidden');renderIndex();focusPanel('indexClose');
}
function closeIndex(){indexOpen=false;$('indexOverlay').classList.add('hidden');fishIcons.disconnect($('fishGrid'));resumeWorld();}
function renderIndex(){
  const found=discoveredCount();
  const collections=islandCollectionProgress(G.discoveries), bonus=coinBonus();
  $('collectionTotal').textContent=`${found} / ${SPECIES.length}`;
  $('collectionFill').style.width=(found/SPECIES.length*100)+'%';
  $('indexIslands').innerHTML=[{id:-1,short:'All waters'},...ISLANDS,...(LEGACY_SPECIES.some(sp=>G.discoveries[sp.id])?[{id:-2,short:'Legacy catches'}]:[])].map(i=>{
    const complete=collections[i.id]?.complete||G.completedIslands.includes(i.id);
    return `<button class="island-filter ${i.id===indexIsland?'active':''} ${complete?'complete':''}" data-index-island="${i.id}" aria-label="${i.short}${complete?', index complete, +'+ISLAND_COLLECTION_BONUS+'% coin bonus earned':''}">${i.short}${complete?' <span aria-hidden="true">✓</span>':''}</button>`;
  }).join('');
  const local=collections[indexIsland];
  $('collectionBonus').classList.toggle('earned',local?local.complete:bonus>0);
  $('collectionBonusTitle').textContent=local
    ? local.complete?`${ISLANDS[indexIsland].short} complete · +${ISLAND_COLLECTION_BONUS}% earned`:`${ISLANDS[indexIsland].short} · ${local.found}/${local.total} discovered`
    : `Permanent coin bonus: +${bonus}%`;
  $('collectionBonusDetail').textContent=local
    ? local.complete?`Total +${bonus}% on all fish sales, at every market.`:`Find all ${local.total} for permanent +${ISLAND_COLLECTION_BONUS}% sale coins · current total +${bonus}%.`
    : `${completedCollections(G.discoveries,G.completedIslands).length}/${ISLANDS.length} rewards earned · +${ISLAND_COLLECTION_BONUS}% each · legacy rewards retained.`;
  const pool=indexIsland===-2?LEGACY_SPECIES.filter(sp=>G.discoveries[sp.id]):sortFishIndex(SPECIES.filter(sp=>indexIsland<0||sp.island===indexIsland));
  const filter=$('indexFilter').value;
  const list=pool.filter(sp=>filter==='all'||(filter==='found'?!!G.discoveries[sp.id]:!G.discoveries[sp.id]));
  const count=pool.filter(sp=>G.discoveries[sp.id]).length;
  $('indexIslandCount').textContent=`${count} / ${pool.length} in these waters`;
  $('indexHint').textContent=indexIsland===-2?'Historical catches · records and weights preserved':indexIsland<0?'20 territories · common → unfathomable':ISLANDS[indexIsland].short+' · commonest → rarest';
  fishIcons.disconnect($('fishGrid'));
  $('fishGrid').innerHTML=list.length?list.map(sp=>{
    const r=G.discoveries[sp.id];
    // Unknown entries contain no species name, color, rarity, description,
    // title or accessible label. There is nothing for CSS/hover to reveal.
    if(!r)return `<article class="fish-entry undiscovered"><div class="entry-top"><span>#${sp.legacy?'LEGACY':String(sp.number).padStart(3,'0')}</span><span>UNDISCOVERED</span></div><div class="entry-fish">${unknownFishSVG()}</div><h3>???</h3><p>${ISLANDS[sp.island].short}</p><div class="entry-record">NOT YET CAUGHT</div></article>`;
    const tier=RARITY[sp.rarity].tier,preferredWeather=tier>=6?'fog':tier>=3?'rain':'clear',weatherName=WEATHER.find(w=>w.id===preferredWeather).name,baitHint=tier>=6?'High-tier specialist bait':tier>=3?'Mid-tier bait or better':'Any bait works',timeHint=tier>=7?'Best near dusk or night':tier>=3?'Dawn and dusk are promising':'Active through the day',depthHint=Number(sp.maxW)>Number(sp.minW)*4?'Deep water · try casting farther':'Shallows or mid-water · cast near the island';
    const islandBest=SPECIES.filter(x=>x.island===sp.island).reduce((best,x)=>Math.max(best,Number(G.discoveries[x.id]?.best)||0),0);
    return `<details class="fish-entry discovered ${sp.rarity}"><summary><div class="entry-top"><span>#${sp.legacy?'LEGACY':String(sp.number).padStart(3,'0')}</span><span class="rarity-label ${sp.rarity}">${RARITY[sp.rarity].label}</span></div><div class="entry-fish">${fishIcons.markup(sp)}</div><h3>${sp.name}</h3><p>${ISLANDS[sp.island].short}</p><div class="entry-record">BEST ${formatCatchMass(r.best)} <span>×${fmt(r.count)}</span></div>${G.collections.mutationBySpecies?.[sp.id]?.shiny?`<span class="mutation-badge shiny">SHINY ×${G.collections.mutationBySpecies[sp.id].shiny}</span>`:''}${G.collections.mutationBySpecies?.[sp.id]?.huge?`<span class="mutation-badge huge">HUGE ×${G.collections.mutationBySpecies[sp.id].huge}</span>`:''}</summary><p class="entry-lore">${sp.desc}<br><b>${formatCatchMass(sp.minW)}–${formatCatchMass(sp.maxW)}</b> · ${r.first?'First caught '+r.first:'From your earlier adventures'}</p><button class="habitat-clue-toggle" data-habitat-clue="${sp.id}">Reveal field clues ▸</button><div class="entry-record">${ISLANDS[sp.island].short} ISLAND RECORD · ${islandBest?formatCatchMass(islandBest):'—'}</div></details>`;
  }).join(''):'<p class="empty">No entries in this filter yet. There is a whole sea to explore.</p>';
  fishIcons.observe($('fishGrid'));
}

// Stable irregular map coordinates; icon numbers match the collection territories.
const CHART_POINTS=ISLANDS.map(i=>{const c=territoryCenter(i),p=mapPoint(c.x,c.z);return [p.x,p.y];});
function islandGlyph(i){
  const c=i.color;
  let landmark='';
  if(i.theme==='harbor')landmark='<rect x="38" y="18" width="12" height="39" fill="#f4e8ce"/><rect x="38" y="28" width="12" height="8" fill="#c77f6b"/><rect x="35" y="16" width="18" height="6" fill="#375e67"/><rect x="40" y="10" width="8" height="6" fill="#f1c976"/>';
  if(i.theme==='forest')landmark='<path d="M29 18h18v9h8v10H21V27h8zm25 9h14v9h6v9H48v-9h6" fill="#255f50"/><path d="M35 37h7v20h-7zm23 8h7v14h-7z" fill="#9e805b"/>';
  if(i.theme==='tropical')landmark='<path d="M29 28h7v29h-7zm29 0h7v29h-7z" fill="#ead4a2"/><rect x="28" y="21" width="38" height="9" fill="#f4dfb0"/><path d="M72 23h5v27h-5zM60 20h30v5H60z" fill="#467e68"/>';
  if(i.theme==='ice')landmark='<path d="M28 48V30h9V18h13V9h11v24h8v21z" fill="#d6edf2"/><path d="M52 54V34h11V22h9v32z" fill="#a2cedf"/>';
  if(i.theme==='volcanic')landmark='<path d="M23 54V42h8V30h8V19h22v11h9v12h9v12z" fill="#53566b"/><path d="M44 21h13v10h5v10h-7V31H44z" fill="#f3aa70"/>';
  if(i.theme==='lunar')landmark='<path d="M27 54V22h10v32zm36 0V22h10v32zM27 14h46v10H27z" fill="#c3b8e2"/><rect x="45" y="29" width="11" height="11" fill="#e8e1ff"/>';
  if(!landmark)landmark=`<path d="M28 56V${18+i.id%4*4}h12v14h10V${10+i.id%3*5}h12v24h10v20z" fill="${hexc(i.accent)}"/><text x="50" y="51" text-anchor="middle" fill="#253d4d" font-size="16" font-family="monospace">${String(i.id+1).padStart(2,'0')}</text>`;
  return `<svg viewBox="0 0 100 78" aria-hidden="true" shape-rendering="crispEdges"><path d="M8 53h12v-7h62v8h10v15H79v6H23v-6H8z" fill="#b5cbb6"/><path d="M14 48h11v-7h52v7h10v16H74v5H26v-6H14z" fill="${c}"/>${landmark}<path d="M50 64h6v14h-6z" fill="#dfc49b"/></svg>`;
}
function openChart(fleet=false){
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Finish fishing before opening the chart.');return;}
  chartOpen=true;fleetTab=fleet;selectedIsland=G.zone;
  $('chartOverlay').classList.remove('hidden');renderChart();focusPanel('chartClose');
}
function closeChart(){chartOpen=false;$('chartOverlay').classList.add('hidden');resumeWorld();}
function renderChart(){
  if(!chartOpen)return;
  $('chartView').classList.toggle('hidden',fleetTab);$('fleetView').classList.toggle('hidden',!fleetTab);
  $('destinationsTab').classList.toggle('active',!fleetTab);$('boatsTab').classList.toggle('active',fleetTab);
  $('boatCoins').textContent=fmt(G.coins)+'c';
  const atDock=isNearVendor('port');
  $('chartFooter').innerHTML=`<span>${atDock?'AT THE DOCK · '+ISLANDS[G.zone].name:G.onBoat?(isTouch?'MANUAL HELM · Stop & fish to cast':'MANUAL HELM · Q toggles fishing'):(isTouch?'Return to boat · on your HUD':'R · Return to your boat from anywhere')}</span><span>${BOATS[G.boat].name} · Level ${level()}</span>`;
  const target=ISLANDS[G.waypoint],destination=target?territoryCenter(target):null;
  const wp=destination?mapPoint(destination.x,destination.z):null;
  const you=mapPoint(G.px,G.pz);
  const borders=ISLANDS.map(i=>{const center=territoryCenter(i),c=mapPoint(center.x,center.z);return `<ellipse cx="${c.x}" cy="${c.y}" rx="${TERRITORY_RADIUS/(SEA_BOUNDS.maxX-SEA_BOUNDS.minX)*100}" ry="${TERRITORY_RADIUS/(SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)*100}" fill="none" stroke="${hasLicense(i.id)?'#4b9181':'#b78b77'}" stroke-width=".2" stroke-dasharray=".6 .6"/>`;}).join('');
  const parked=G.boatPosition&&!G.onBoat?mapPoint(G.boatPosition.x,G.boatPosition.z):null;
  const secretMarkers=SECRET_FISHING_SITES.filter(site=>G.collections.fieldNotes?.includes(site.id)).map(site=>{const p=secretFishingPosition(site),spot=mapPoint(p.x,p.z);return `<span class="chart-secret" style="left:${spot.x}%;top:${spot.y}%" title="Secret fishing location: ${site.name}" aria-label="Secret fishing location: ${site.name}">✦</span>`;}).join('');
  $('seaChart').innerHTML=`<div class="chart-caption"><b>THE TWENTY WATERS</b><span>NORTH UP · SELECT A NUMBERED ISLAND</span></div><svg class="chart-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${borders}${wp?`<path d="M${you.x},${you.y} L${wp.x},${wp.y}" stroke="#9e9a61" stroke-width=".3" stroke-dasharray=".7 1.1" fill="none"/>`:""}</svg><span class="chart-north">N<br>↑</span><span class="chart-key">◆ YOU · B BOAT<br>DASHED RINGS · TERRITORIES</span>`+
    ISLANDS.map(i=>`<button class="map-island ${!hasLicense(i.id)?'locked':''} ${i.id===fishingTerritory()?'current':''} ${selectedIsland===i.id?'selected':''}" style="left:${CHART_POINTS[i.id][0]}%;top:${CHART_POINTS[i.id][1]}%" data-destination="${i.id}" title="${i.name} · Level ${i.level}" aria-label="${String(i.id+1).padStart(2,'0')}. ${i.name}, level ${i.level}${!hasLicense(i.id)?', locked':''}${i.id===fishingTerritory()?', current territory':''}" aria-pressed="${selectedIsland===i.id}">${islandGlyph(i)}<b>${String(i.id+1).padStart(2,'0')}</b><span class="map-label">${i.short}</span></button>`).join('')+
    `${parked?`<span class="chart-boat" style="left:${parked.x}%;top:${parked.y}%" title="Your parked boat" aria-label="Your parked boat">B</span>`:''}${secretMarkers}<span class="chart-you" style="left:${you.x}%;top:${you.y}%" title="Your position" aria-label="Your position">◆</span>`;
  const i=ISLANDS[selectedIsland],requirement=travelRequirement(i.id,G.xp,G.boat,G.licenses),here=i.id===fishingTerritory();
  const reason=requirement||'Any boat can enter. Follow your waypoint and steer there yourself.';
  const discovered=SPECIES.filter(s=>s.island===i.id&&G.discoveries[s.id]).length;
  $('destinationDetail').innerHTML=`<div class="destination-art" style="--island-color:${i.color}">${islandGlyph(i)}<span>ISLAND ${String(i.id+1).padStart(2,'0')}</span></div><div class="destination-copy"><span class="eyebrow">LEVEL ${i.level} LICENSE${hasLicense(i.id)&&level()<i.level?' · RETAINED':''}</span><h3>${i.name}</h3><p>${i.description}</p><dl><div><dt>LOCAL GEAR</dt><dd>${i.id===0?'Tiers 1–3':'Tiers '+(i.id*2+1)+'–'+(i.id*2+2)}</dd></div><div><dt>FIELD GUIDE</dt><dd>${discovered} / 20 discovered</dd></div><div><dt>LANDMARK</dt><dd>${i.landmark}</dd></div></dl><p class="destination-requirement ${requirement?'blocked':''}">${reason||'License ready. Boat ready. Let’s cast off.'}</p><button id="waypointBtn" class="primary-btn">${G.waypoint===i.id?'Waypoint selected ✓':'Mark on minimap →'}</button></div>`;
  renderFleet();
}
function boatSVG(b){
  const c=hexc(b.color),s=hexc(b.stripe);
  return `<svg viewBox="0 0 160 90" aria-hidden="true" shape-rendering="crispEdges"><path d="M12 67h136v4H12zm20 12h100v3H32z" fill="#bed5d0"/><path d="M23 49h118v10h-10v7H39v-8H23z" fill="${c}"/><path d="M24 46h116v6H24z" fill="${s}"/>${b.id>=2?`<path d="M61 23h51v24H61z" fill="${s}"/><path d="M68 27h15v15H68zm20 0h16v15H88z" fill="#5b8a98"/><path d="M56 18h62v7H56z" fill="${c}"/>`:'<path d="M52 39h51v7H52z" fill="#c2a574"/>'}<path d="M116 30h4v18h-4z" fill="#405e64"/><path d="M119 29h15v9h-15z" fill="${s}"/>${b.id>=4?'<path d="M88 7h10v11H88z" fill="#4a5769"/>':''}</svg>`;
}
function renderFleet(){
  const atDock=isNearVendor('port');
  $('fleetView').innerHTML=BOATS.map(b=>{
    const owned=G.ownedBoats.includes(b.id),equipped=G.boat===b.id;
    const tune=G.boatUpgrades[b.id]||{type:'standard',level:0},upgradeCost=1200*(tune.level+1),reason=equipped?'IN USE':!atDock?'VISIT A BOAT SHOP':!owned&&G.coins<b.cost?`NEED ${fmt(b.cost-G.coins)}c MORE`:'';
    return `<article class="boat-card ${equipped?'equipped':''}"><div class="boat-art">${boatSVG(b)}<span>CLASS ${String(b.id+1).padStart(2,'0')}</span></div><div class="boat-copy"><span class="eyebrow">EVERY UNLOCKED TERRITORY</span><h3>${b.name}</h3><p>${b.description}</p><div class="boat-specs"><span>${b.size.toFixed(2)}× HULL</span><span>${b.cost?fmt(b.cost)+'c':'FREE'}</span><span>${b.speed} m/s</span><span>${capacities(b.id,G.collections.boatStorageUpgrade[b.id]||0).boat} fish hold</span></div><button class="buy-btn ${owned?'equip':''}" data-boat="${b.id}" ${reason?'disabled':''}>${reason|| (owned?'Launch this boat':fmt(b.cost)+'c · BUY BOAT')}</button>${owned?`<div class="boat-tune"><small>${tune.level?`${tune.type==='speed'?'Speed rig':'Storm stabilizer'} · tier ${tune.level}`:'Stock configuration · choose a specialization'}</small><button class="buy-btn" data-tune="${b.id}:speed" ${!atDock||!equipped||tune.level>=3||G.coins<upgradeCost?'disabled':''}>Speed rig · ${tune.level>=3?'MAX':fmt(upgradeCost)+'c'}<small>+12% speed/tier · less storm control</small></button><button class="buy-btn" data-tune="${b.id}:stability" ${!atDock||!equipped||tune.level>=3||G.coins<upgradeCost?'disabled':''}>Storm stabilizer · ${tune.level>=3?'MAX':fmt(upgradeCost)+'c'}<small>Better control in weather · −8% speed/tier</small></button></div>`:''}</div></article>`;
  }).join('');
}
function buyBoat(id){
  const b=BOATS[id];
  if(!b||!chartOpen||!isNearVendor('port')||G.state!=='aim')return;
  if(!G.ownedBoats.includes(id)){
    if(G.coins<b.cost){showToast(`You need ${fmt(b.cost-G.coins)} more coins.`,true);return;}
    G.coins-=b.cost;G.ownedBoats.push(id);applyQuestProgress({type:'boat-purchase',boat:id});
  }
  G.boat=id;G.boatPosition=dockPose(G.zone,b.size);world.setBoat(id);world.setAuroraPaint(G.collections.cosmetics?.includes('aurora-trim'));collectionAchievements();sfx.buy();saveGame();updateStats();renderChart();showToast(b.name+' ready at the dock.');
}
function spawnAtIsland(id){
  const p=islandSpawn(ISLANDS[id]),previous=G.zone;G.zone=id;if(previous!==id)recordActivity({kind:'island',island:id});G.px=p.x;G.pz=p.z;
  G.onBoat=false;G.sailing=null;G.boatMode='drive';G.yaw=p.yaw;G.pitch=-.1;G.camY=1.15+EYE;
  if(!G.boatPosition)G.boatPosition=dockPose(id,BOATS[G.boat].size);
  camera.position.set(G.px,G.camY,G.pz);camera.rotation.set(G.pitch,G.yaw,0,'YXZ');
  nearbyStall=null;G.nearShop=G.nearMarket=G.nearPort=false;
}
let lastTerritory=0,lastBorderNotice=-10,lastMapDraw=-1,lastBoatSave=0,lastSailingEncounterRoll=0,nextSailingEncounter=80;
function announceTerritory(id){
  if(id===null)return;
  $('arrivalName').textContent=ISLANDS[id].name;$('arrivalDesc').textContent=ISLANDS[id].environment;
  $('arrivalBanner').classList.remove('hidden');clearTimeout(announceTerritory.timer);
  announceTerritory.timer=setTimeout(()=>$('arrivalBanner').classList.add('hidden'),3100);
}
function boardBoat(){
  // A location shortcut, not a way to skip a fight or a level barrier. The
  // boat stays parked where you left it; only the player teleports aboard.
  if(G.onBoat||G.state!=='aim'||uiBusy())return false;
  stowFish();clearInput();releasePointer();
  const p=returnBoatPose(G.boatPosition,G.zone,BOATS[G.boat],{xp:G.xp,licenses:G.licenses});
  G.boatPosition={...p};G.sailing={...p,speed:0};G.onBoat=true;G.boatMode='drive';G.px=p.x;G.pz=p.z;
  G.yaw=p.yaw;G.pitch=-.1;G.camY=BOATS[G.boat].size*.9+EYE;
  camera.position.set(G.px,G.camY,G.pz);camera.rotation.set(G.pitch,G.yaw,0,'YXZ');
  const id=territoryAt(p.x,p.z);
  if(id!==null){if(id!==G.zone)announceTerritory(id);G.zone=id;}
  nearbyStall=null;G.nearShop=G.nearMarket=G.nearPort=false;lastTerritory=id;lastMapDraw=-1;
  world.boat.position.set(p.x,.15,p.z);world.boat.rotation.set(0,p.yaw,0);
  saveGame();updateStats();setState('aim');canvas.focus({preventScroll:true});
  showToast(isTouch?'Aboard! Joystick to steer · Stop & fish to cast · Dock to go ashore':'Aboard! W/S throttle · A/D steer · Q stop & fish · E dock');return true;
}
function toggleBoatMode(){
  if(!G.onBoat||G.state!=='aim'||uiBusy())return false;
  const wasDriving=isDriving();
  if(!wasDriving)stowFish();
  G.boatMode=wasDriving?'fish':'drive';G.sailing.speed=0;clearInput();
  if(!wasDriving){G.px=G.sailing.x;G.pz=G.sailing.z;}
  G.yaw=G.sailing.yaw;G.pitch=-.12;setState('aim');updateBoatUI();canvas.focus({preventScroll:true});
  showToast(isDriving()?'At the helm. Steer freely.':isTouch?'Engine stopped. Walk the deck or cast; tap Take helm to steer.':'Engine stopped. Walk the deck, cast, or Q to take the helm.');return true;
}
function dockBoat(){
  if(!G.onBoat||G.state!=='aim'||uiBusy())return false;
  const id=nearbyDock(G.sailing?.x??G.px,G.sailing?.z??G.pz);
  if(id===null||!hasLicense(id)){showToast('Approach an unlocked island’s dock to disembark.',true);return false;}
  G.boatPosition={x:G.sailing.x,z:G.sailing.z,yaw:G.sailing.yaw};
  clearInput();spawnAtIsland(id);if(!G.visited.includes(id))G.visited.push(id);applyQuestProgress({type:'visit',island:id});
  saveGame();updateStats();updateBoatUI();setState('aim');canvas.focus({preventScroll:true});showToast('Docked at '+ISLANDS[id].name+'. Shops are up the pier.');return true;
}
function updateBoatUI(){
  if(G.state==='menu')return;
  const idle=G.state==='aim'&&!uiBusy();
  setHidden($('boardBoatBtn'),G.onBoat);
  const boatLabel=G.boatPosition&&Math.hypot(G.px-G.boatPosition.x,G.pz-G.boatPosition.z)>28?'Return to boat':'Board boat';
  setText($('boardBoatLabel'),boatLabel);
  if($('boardBoatBtn').disabled!==!idle)$('boardBoatBtn').disabled=!idle;
  setHidden($('boatControls'),!G.onBoat||!idle);
  setText($('boatModeBtn'),(isDriving()?'Stop & fish':'Take helm')+(isTouch?'':' · Q'));
  const dock=G.onBoat?nearbyDock(G.sailing?.x??G.px,G.sailing?.z??G.pz):null;
  if($('dockBoatBtn').disabled!==(dock===null))$('dockBoatBtn').disabled=dock===null;setText($('dockBoatBtn'),dock===null?'Approach a dock':`Dock · ${ISLANDS[dock].short}${isTouch?"":" · E"}`);
  setHidden($('boatReadout'),!G.onBoat);setText($('boatSpeed'),`${Math.round(Math.abs(G.sailing?.speed||0))} / ${BOATS[G.boat].speed} m/s`);
  const readoutHint=isDriving()?(isTouch?'Joystick steer':'W/S throttle · A/D steer'):(isTouch?'Joystick walk on deck':'WASD walk on deck · Q helm'),readoutHintEl=$('boatReadout').querySelector('span');
  if(readoutHintEl.textContent!==readoutHint)readoutHintEl.textContent=readoutHint;
  const penalty=shoreLuckPenalty(G.px,G.pz),territory=fishingTerritory();
  setText($('shoreLuck'),territory===null?'OPEN OCEAN · FIND A TERRITORY':penalty<-.001?`SHORE LUCK ${Math.round(penalty*100)}% · HEAD OFFSHORE`:'OFFSHORE · FULL LUCK');
  $('shoreLuck').classList.toggle('offshore',penalty>=-.001&&territory!==null);
  setHidden($('minimapButton'),uiBusy()||G.state==='menu'||G.state==='caught');
  const target=ISLANDS[G.waypoint],center=target?territoryCenter(target):null;setText($('waypointLabel'),target?`${target.short} · ${Math.round(Math.hypot(G.px-center.x,G.pz-center.z))}m`:'Tap to expand chart');
}
function tickBoat(dt){
  if(!G.onBoat||!G.sailing)return;
  const base=BOATS[G.boat],upgrade=G.boatUpgrades[G.boat]||{type:'standard',level:0},factor=upgrade.level||0;
  const b=upgrade.type==='speed'?{...base,speed:base.speed*(1+.12*factor)}:upgrade.type==='stability'?{...base,speed:base.speed*(1-.08*factor)}:base;
  if(isDriving()&&!uiBusy()&&G.state==='aim'){
    const throttle=(keys.f?1:0)-(keys.b?1:0)+(stick.active?stick.y:0),steer=(keys.r?1:0)-(keys.l?1:0)+(stick.active?stick.x:0);
    G.sailing=stepBoat(G.sailing,{throttle,steer},b,dt,{xp:G.xp,licenses:G.licenses});
    if(G.sailing.block&&G.time-lastBorderNotice>2.5&&(throttle||steer)){
      const block=G.sailing.block;showToast(block.kind==='level'?`${ISLANDS[block.island].name} territory · level ${block.level} required`:block.kind==='edge'?'The edge of the chart. Turn back.':'Shallows ahead. Reverse or turn toward clear water.',true);lastBorderNotice=G.time;
    }
  }else G.sailing.speed=0;
  if(isDriving()){G.px=G.sailing.x;G.pz=G.sailing.z;}
  G.boatPosition={x:G.sailing.x,z:G.sailing.z,yaw:G.sailing.yaw};
  world.boat.position.set(G.sailing.x,.15+Math.sin(G.time*2)*.04,G.sailing.z);world.boat.rotation.set(0,G.sailing.yaw,Math.sin(G.time*1.6)*.008);
  if(isDriving()&&Math.abs(G.sailing.speed)>3&&G.time>=nextSailingEncounter&&G.time-lastSailingEncounterRoll>3){lastSailingEncounterRoll=G.time;if(Math.random()<.018){nextSailingEncounter=G.time+rand(100,170);const events=['A pod of silverfin races beside the hull. Their flash points you toward richer water.','Sea birds wheel over a feeding shoal; the sight lifts your spirits.','A brief break in the clouds reveals a safe passage through the swells.'];G.coins+=180;G.xp+=30;showToast(`${events[Math.floor(Math.random()*events.length)]} · +180 coins`);saveGame();updateStats();}}
  const id=territoryAt(G.sailing.x,G.sailing.z);
  if(id!==lastTerritory){lastTerritory=id;if(id!==null){G.zone=id;recordActivity({kind:'island',island:id});if(!G.visited.includes(id))G.visited.push(id);applyQuestProgress({type:'visit',island:id});collectionAchievements();announceTerritory(id);}updateStats();saveGame();}
  if(G.time-lastBoatSave>10){lastBoatSave=G.time;saveGame();}
}

// ---------- Pointer lock / input ----------
let pointerLocked = false, lockFallback = false, everLocked = false;
const supportsLock = !isTouch && typeof canvas.requestPointerLock === 'function';
function requestLock(){
  if(!supportsLock){ lockFallback = true; return; }
  try { const request=canvas.requestPointerLock(); if(request?.catch)request.catch(()=>{lockFallback=true;updateLockHint();}); }catch(e){ lockFallback=true;return; }
  setTimeout(() => { if(!document.pointerLockElement && !everLocked) lockFallback = true; }, 400);
}
function updateLockHint(){
  const show = !pointerLocked && supportsLock && !lockFallback && G.state === 'aim'
    && !G.thirdPerson && !isDriving() && !heldCatch && !nearbyStall && !uiBusy()  && catchModal.classList.contains('hidden');
  setHidden(lockHint,!show);
}
function releasePointer(){
  if(document.pointerLockElement) document.exitPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if(pointerLocked){ lockTime = performance.now(); everLocked = true; }
  updateLockHint();
});

const SENS = 0.0023;
let dragging = false, lastX = 0, lastY = 0, lockTime = 0, lastButtonT = 0, touchDrag = 0, fishingPointer = null;

function applyLook(dx, dy){
  G.yaw -= dx;
  while(G.yaw > Math.PI) G.yaw -= Math.PI * 2;
  while(G.yaw < -Math.PI) G.yaw += Math.PI * 2;
  G.pitch = clamp(G.pitch - dy, -0.62, 0.42);
}
canvas.addEventListener('mousemove', e => {
  if(!pointerLocked||uiBusy()) return;
  const now = performance.now();
  if(now - lockTime < 180) return;                 // skip the jump on lock
  if(now - lastButtonT < 130) return;              // browsers warp the pointer on click
  applyLook(clamp(e.movementX, -45, 45) * SENS, clamp(e.movementY, -45, 45) * SENS);
});
canvas.addEventListener('pointermove', e => {
  if(uiBusy()  || pointerLocked || !dragging || fishingPointer!==e.pointerId)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;
  touchDrag+=Math.hypot(dx,dy);lastX=e.clientX;lastY=e.clientY;
  applyLook(dx*(e.pointerType==='mouse'?.004:.005),dy*(e.pointerType==='mouse'?.004:.005));
  if(touchDrag>12&&G.state==='charging')setState('aim');
},{passive:true});
canvas.addEventListener('pointerdown', e => {
  if(uiBusy()||e.button>0)return;
  ensureAudio();lastButtonT=performance.now();
  if(e.pointerType==='mouse'&&!pointerLocked&&!lockFallback){requestLock();return;}
  fishingPointer=e.pointerId;
  dragging=!pointerLocked;lastX=e.clientX;lastY=e.clientY;touchDrag=0;
  try{canvas.setPointerCapture(e.pointerId);}catch(err){}
  // A look-drag while showing a fish must not put it away or start a cast.
  if(!heldCatch || G.state!=='aim')handlePress();
});
addEventListener('pointerup', e => {
  if(fishingPointer!==e.pointerId)return;
  fishingPointer=null;dragging=false;lastButtonT=performance.now();
  handleRelease();
});
canvas.addEventListener('pointercancel',()=>{clearInput();if(G.state==='charging')setState('aim');});
canvas.addEventListener('contextmenu', e => e.preventDefault());

function handlePress(){
  if(uiBusy() ) return;
  if(G.state === 'aim'&&!isDriving()) startCharge();
  else if(G.state === 'bite') hookFish();
  else if(G.state === 'waiting') reelInEarly();
  else if(G.state === 'reeling') G.reelHeld = true;
}
function handleRelease(){
  if(uiBusy() ) return;
  if(G.state === 'charging') releaseCast();
  else if(G.state === 'reeling') G.reelHeld = false;
}
promptEl.addEventListener('click',()=>{if(nearbyQuestGiver()||nearbyHubBuilding())dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));});
addEventListener('keydown', e => {
  if(hudHidden){
    e.preventDefault();
    if(!e.repeat&&['KeyH','Escape','Space','Enter','NumpadEnter'].includes(e.code))setHudHidden(false);
    else if(e.code==='Tab')$('restoreHudBtn').focus({preventScroll:true});
    return; // Restoring the UI is never also a cast, walk, view change or panel action.
  }
  if(tutorialOpen){
    if(e.code==='Escape'){e.preventDefault();closeTutorial();return;}
    if(e.code==='ArrowRight'){e.preventDefault();stepTutorial(1);return;}
    if(e.code==='ArrowLeft'){e.preventDefault();stepTutorial(-1);return;}
  }
  if(e.code==='Escape'){
    if(bagOpen){closeBag();return;}
    if(helpOpen){closeHelp();return;}
    if(shopOpen){closeShop();return;}
    if(marketOpen){closeMarket();return;}
    if(chartOpen){closeChart();return;}
    if(indexOpen){closeIndex();return;}
    if(drawerOpen){closeLog();return;}
    if(activitiesOpen){closeActivities();return;}
    if(aquariumOpen){closeAquarium();return;}
    if(achievementsOpen){$('achievementsClose').click();return;}
    if(merchantOpen){$('merchantClose').click();return;}
  }
  if(e.code==='Tab'&&(uiBusy()||G.state==='caught')){
    const panel=tutorialOpen?tutorialOverlay:activitiesOpen?$('activitiesOverlay'):aquariumOpen?$('aquariumOverlay'):achievementsOpen?$('achievementsOverlay'):merchantOpen?$('merchantOverlay'):bagOpen?bagOverlay:helpOpen?helpOverlay:shopOpen?shopOverlay:marketOpen?marketOverlayEl:chartOpen?$('chartOverlay'):indexOpen?$('indexOverlay'):drawerOpen?logDrawer:catchModal;
    const focusable=Array.from(panel.querySelectorAll('button:not(:disabled),select,summary,[tabindex="0"]')).filter(n=>n.tabIndex>=0&&n.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(!panel.contains(document.activeElement)){(e.shiftKey?last:first)?.focus();e.preventDefault();}
    else if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}
    else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}
    return;
  }
  if(e.key==='?'&&!e.repeat){e.preventDefault();if(helpOpen)closeHelp();else openHelp();return;}
  if(e.code==='KeyH'&&!e.repeat){e.preventDefault();setHudHidden(true);return;}
  if(e.code==='KeyR'&&!e.repeat){e.preventDefault();boardBoat();return;}
  if(e.code==='KeyQ'&&!e.repeat){e.preventDefault();toggleBoatMode();return;}
  if(e.code==='KeyM'&&!e.repeat){if(chartOpen)closeChart();else openChart();return;}
  if(e.code==='KeyF'&&!e.repeat){if(indexOpen)closeIndex();else openIndex();return;}
  if(e.code==='KeyJ'&&!e.repeat){if(activitiesOpen)closeActivities();else openActivities();return;}
  if(e.code==='KeyI'&&!e.repeat){
    e.preventDefault();
    if(bagOpen){if(bagTab==='fish'){selectBagTab(lastGearTab);$('bagTab-'+bagTab).focus();}else closeBag();}
    else openKit();
    return;
  }
  if(e.code==='KeyB'&&!e.repeat){e.preventDefault();if(bagOpen)closeBag();else openFishBag();return;}
  if(e.code==='KeyV'&&!e.repeat){e.preventDefault();toggleView();return;}
  if(e.code==='KeyX'&&!e.repeat){if(G.state==='aim'&&!uiBusy())stowFish();return;}
  if(e.code==='KeyE'&&!e.repeat&&G.state==='aim'){
    if(G.onBoat){dockBoat();return;}
    if(shopOpen)closeShop();
    else if(marketOpen)closeMarket();
    else if(chartOpen)closeChart();
    else if(!uiBusy()){
      const npc=nearbyQuestGiver();if(npc){openActivities(npc.id);return;}
      const building=nearbyHubBuilding();
      if(building?.id==='aquarium'){openAquarium();return;}
      if(building?.id==='warehouse'){openFishBag();return;}
      if(building?.id==='guild'){openActivities();return;}
      const st=nearestVendor();
      if(st?.kind==='port')openChart(true);
      else if(st?.kind==='market')openMarket();
      else if(st)openShop(st.kind);
      else showToast('No stall nearby. Follow the village paths.');
    }
    return;
  }
  if(uiBusy())return;
  if(setKey(e.code,true))e.preventDefault();
  if(e.code==='Space'){
    if(document.activeElement?.tagName==='BUTTON')return; // Preserve native Space activation on HUD controls.
    e.preventDefault();if(e.repeat)return;
    handlePress();
  }
  if((e.code==='Enter'||e.code==='NumpadEnter')&&G.state==='caught')$('continueBtn').click();
});
addEventListener('keyup', e=>{
  setKey(e.code,false);
  if(e.code==='Space'&&!uiBusy())handleRelease();
});
addEventListener('blur',()=>{clearInput();if(G.state==='charging')setState('aim');});

// ---------- UI wiring ----------
$('startArt').innerHTML = ICON.startArt;
$('soundBtn').innerHTML = ICON.soundOn;
for(const id of ['shopBtn','marketBtn','portBtn'])$(id).querySelector('b').textContent=isTouch?'Tap':'E';

$('startBtn').addEventListener('click', () => {
  ensureAudio();
  $('startOverlay').classList.add('hidden');
  G.yaw=G.onBoat?G.sailing.yaw:islandSpawn(ISLANDS[G.zone]).yaw;G.pitch=-.10;
  applyGear();
  setState('aim');
  $('startBtn').blur();
  let tutorialSeen=false;try{tutorialSeen=localStorage.getItem(TUTORIAL_SEEN_KEY)==='done';}catch{}
  refreshActivityUI(true);if(tutorialSeen)requestLock();else openTutorial();
  showToast('Welcome to '+ISLANDS[G.zone].name+'! '+(isTouch?'Tap Board boat for the helm.':'Board boat / R takes you straight to the helm.'));
});
$('continueBtn').addEventListener('click', () => {
  catchModal.classList.add('hidden');
  disposeHookedFish();
  setState('aim');
  $('continueBtn').blur();
  updateLockHint();
});
$('logBtn').addEventListener('click', () => {
  if((uiBusy()&&!drawerOpen)||G.state!=='aim')return;
  clearInput();
  const open = logDrawer.classList.toggle('hidden');
  drawerOpen = !open;
  if(!open){renderLog();focusPanel('closeLog');}else closeLog();
});
$('closeLog').addEventListener('click',closeLog);
$('activitiesBtn').addEventListener('click',()=>openActivities());$('activitiesClose').addEventListener('click',closeActivities);
$('activitiesOverlay').addEventListener('click',e=>{if(e.target===$('activitiesOverlay'))closeActivities();});
$('activityContent').addEventListener('click',e=>{const quest=e.target.closest('[data-quest]');if(quest){if(!activeQuestGiver&&nearbyHubBuilding()?.id!=='guild'){showToast('Meet the named NPC or visit the Anglers Guild to accept this quest.',true);return;}if(acceptQuest(G.quests,quest.dataset.quest)){ saveGame();renderActivities();showToast('Quest accepted. The guild will record your next field progress.');}return;}});

// ---- shop wiring ----
shopBtnEl.addEventListener('click', openShop);
$('shopClose').addEventListener('click', closeShop);
shopOverlay.addEventListener('click', e => { if(e.target === shopOverlay) closeShop(); });
shopBody.addEventListener('click', e => {
  const buy=e.target.closest('[data-buy]');
  if(buy)buyGear(shopKind,Number(buy.dataset.buy));
});
marketBtnEl.addEventListener('click', openMarket);
$('marketClose').addEventListener('click', closeMarket);
marketOverlayEl.addEventListener('click', e => { if(e.target === marketOverlayEl) closeMarket(); });
marketBody.addEventListener('click', e => {
  const one = e.target.closest('[data-sell]');
  if(one){const [source,index]=one.dataset.sell.split(':');sellStored(source,Number(index));return;}
  if(e.target.closest('#sellAll')) sellAll();
});

// ---- archipelago UI ----
$('mapBtn').addEventListener('click',()=>openChart());
$('portBtn').addEventListener('click',()=>openChart(true));
$('boardBoatBtn').addEventListener('click',boardBoat);
$('boatModeBtn').addEventListener('click',toggleBoatMode);
$('dockBoatBtn').addEventListener('click',dockBoat);
$('minimapButton').addEventListener('click',()=>openChart());
$('chartClose').addEventListener('click',closeChart);
$('chartOverlay').addEventListener('click',e=>{if(e.target===$('chartOverlay'))closeChart();});
$('destinationsTab').addEventListener('click',()=>{fleetTab=false;renderChart();});
$('boatsTab').addEventListener('click',()=>{fleetTab=true;renderChart();});
$('seaChart').addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(b){selectedIsland=Number(b.dataset.destination);renderChart();$('seaChart').querySelector(`[data-destination="${selectedIsland}"]`).focus({preventScroll:true});}});
$('destinationDetail').addEventListener('click',e=>{
  if(e.target.closest('#waypointBtn')){G.waypoint=selectedIsland;renderChart();$('waypointBtn').focus({preventScroll:true});showToast('Waypoint marked. Steer toward it on the minimap.');}
  if(e.target.closest('#viewBoats')){fleetTab=true;renderChart();}
});
$('fleetView').addEventListener('click',e=>{const tune=e.target.closest('[data-tune]');if(tune){const [idText,type]=tune.dataset.tune.split(':'),id=Number(idText),old=G.boatUpgrades[id]||{type:'standard',level:0},cost=1200*(old.level+1);if(!chartOpen||G.state!=='aim'||!isNearVendor('port')||G.boat!==id||G.coins<cost||old.level>=3)return;if(old.type!=='standard'&&old.type!==type){showToast('This hull is specialized. Choose that rig or upgrade another boat.',true);return;}G.coins-=cost;G.boatUpgrades[id]={type,level:old.level+1};applyQuestProgress({type:'boat-upgrade'});saveGame();updateStats();renderChart();showToast(`${type==='speed'?'Speed rig':'Storm stabilizer'} upgraded · tier ${old.level+1}`);return;}const b=e.target.closest('[data-boat]');if(b)buyBoat(Number(b.dataset.boat));});
$('indexBtn').addEventListener('click',openIndex);
$('indexClose').addEventListener('click',closeIndex);
$('indexOverlay').addEventListener('click',e=>{if(e.target===$('indexOverlay'))closeIndex();});
$('indexIslands').addEventListener('click',e=>{const b=e.target.closest('[data-index-island]');if(b){indexIsland=Number(b.dataset.indexIsland);renderIndex();$('fishGrid').scrollTop=0;}});
$('indexFilter').addEventListener('change',renderIndex);
$('fishGrid').addEventListener('click',e=>{const b=e.target.closest('[data-habitat-clue]');if(!b)return;const sp=SPECIES.find(x=>x.id===b.dataset.habitatClue);if(!sp)return;const tier=RARITY[sp.rarity].tier,weatherId=tier>=6?'fog':tier>=3?'rain':'clear',weatherName=WEATHER.find(w=>w.id===weatherId).name,time=tier>=7?'Dusk or night':tier>=3?'Dawn or dusk':'Daytime',bait=tier>=6?'Specialist bait tier':tier>=3?'Mid-tier bait or better':'Any bait tier',cast=tier>=6?'Use a strong, longer cast':'Moderate casts can reach this habitat';b.outerHTML=`<div class="habitat-clues"><b>FIELD CLUES</b><span>Weather · ${weatherName}</span><span>Bait · ${bait}</span><span>Time · ${time}</span><span>Cast · ${cast}</span><small>Hints improve odds; try conditions and learn the local pattern.</small></div>`;});
$('bagBtn').addEventListener('click',openFishBag);
$('bagClose').addEventListener('click',closeBag);
bagOverlay.addEventListener('click',e=>{if(e.target===bagOverlay)closeBag();});
$('aquariumClose').addEventListener('click',closeAquarium);$('aquariumOverlay').addEventListener('click',e=>{if(e.target===$('aquariumOverlay'))closeAquarium();});$('aquariumList').addEventListener('click',e=>{const b=e.target.closest('[data-release-aquarium]');if(b){if(nearbyHubBuilding()?.id!=='aquarium'){showToast('Return to Reedhaven Aquarium to retrieve displayed fish.',true);return;}const i=Number(b.dataset.releaseAquarium),cap=storageCaps().personal;if(bag.length>=cap){showToast('Personal storage is full; make room first.',true);return;}bag.push(G.collections.aquarium.splice(i,1)[0]);saveGame();drawAquarium();updateCarryUI();}});
$('achievementsBtn').addEventListener('click',()=>{if(uiBusy()||G.state!=='aim')return;achievementsOpen=true;renderAchievements();$('achievementsOverlay').classList.remove('hidden');});$('achievementsClose').addEventListener('click',()=>{achievementsOpen=false;$('achievementsOverlay').classList.add('hidden');resumeWorld();});$('achievementsOverlay').addEventListener('click',e=>{if(e.target===$('achievementsOverlay'))$('achievementsClose').click();});
$('merchantBtn').addEventListener('click',()=>{if(!merchantNear()){showToast('The merchant has moved on.',true);return;}merchantOpen=true;renderMerchant();$('merchantOverlay').classList.remove('hidden');});$('merchantClose').addEventListener('click',()=>{merchantOpen=false;$('merchantOverlay').classList.add('hidden');resumeWorld();});$('merchantOverlay').addEventListener('click',e=>{if(e.target===$('merchantOverlay'))$('merchantClose').click();});$('merchantStock').addEventListener('click',e=>{const b=e.target.closest('[data-merchant-buy]');if(!b)return;const item=MERCHANT_ITEMS.find(x=>x.id===b.dataset.merchantBuy),m=activeMerchant(),key=`${m.slot}:${item?.id}`;if(!item||!merchantNear()||G.coins<item.price||(G.collections.merchantBuys[key]||0)>=item.stock)return;G.coins-=item.price;G.collections.merchantBuys[key]=(G.collections.merchantBuys[key]||0)+1;if(item.id==='tank-expansion')G.collections.aquariumUpgrade=Math.min(3,(G.collections.aquariumUpgrade||0)+1);G.collections.cosmetics=G.collections.cosmetics||[];if(item.id==='aurora-trim'){G.collections.cosmetics.push('aurora-trim');world.setAuroraPaint(true);}saveGame();updateStats();renderMerchant();showToast(`${item.title} purchased.`);});
$('bagTabs').addEventListener('click',e=>{const t=e.target.closest('[data-bag-tab]');if(t)selectBagTab(t.dataset.bagTab);});
$('bagTabs').addEventListener('keydown',e=>{
  const tab=e.target.closest('[data-bag-tab]'),next=tab&&nextBagTab(tab.dataset.bagTab,e.key);
  if(!next)return;
  e.preventDefault();e.stopPropagation();selectBagTab(next);$('bagTab-'+next).focus();
});
bagBody.addEventListener('click',e=>{
  const mode=e.target.closest('[data-bag-mode]');if(mode){bagActionMode=bagActionMode==='transfer'?'display':'transfer';renderBag();return;}const fish=e.target.closest('[data-hold-fish]'),gear=e.target.closest('[data-buy]'),transfer=e.target.closest('[data-transfer]'),display=e.target.closest('[data-aquarium]'),upgrade=e.target.closest('[data-storage-upgrade]');
  if(fish)holdFish(Number(fish.dataset.holdFish));if(transfer){const [source,index]=transfer.dataset.transfer.split(':');transferCatch(source,Number(index));}if(display){const [source,index]=display.dataset.aquarium.split(':');displayCatch(source,Number(index));}if(upgrade)upgradeStorage(upgrade.dataset.storageUpgrade);
  if(gear)buyGear(bagGearKind(bagTab),Number(gear.dataset.buy));
});
$('helpPlatform').textContent=isTouch?'TOUCH CONTROLS':'DESKTOP CONTROLS';
$('helpControls').innerHTML=HELP_CONTROLS.map(c=>`<div><dt>${c.action}</dt><dd>${isTouch?c.touch:c.desktop}</dd></div>`).join('');
$('helpKeyboardNote').classList.toggle('hidden',isTouch);
$('helpBtn').addEventListener('click',openHelp);
$('helpClose').addEventListener('click',closeHelp);
$('openTutorialBtn').addEventListener('click',()=>openTutorial());
$('tutorialBack').addEventListener('click',()=>stepTutorial(-1));
$('tutorialNext').addEventListener('click',()=>stepTutorial(1));
$('tutorialSkip').addEventListener('click',closeTutorial);
tutorialOverlay.addEventListener('click',e=>{if(e.target===tutorialOverlay)closeTutorial();});
helpOverlay.addEventListener('click',e=>{if(e.target===helpOverlay)closeHelp();});
$('hideHudBtn').addEventListener('click',()=>setHudHidden(true));
$('restoreHudBtn').addEventListener('click',()=>setHudHidden(false));
$('viewBtn').addEventListener('click',toggleView);
$('putAwayBtn').addEventListener('click',()=>{if(G.state==='aim'&&!uiBusy())stowFish();});

// ---- touch joystick ----
function moveStick(dx, dy){
  const r = 42, d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, r / d);
  dx *= k; dy *= k;
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  stick.x = dx / r; stick.y = -dy / r;
  if(Math.abs(stick.x) < 0.15) stick.x = 0;
  if(Math.abs(stick.y) < 0.15) stick.y = 0;
}
stickEl.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  stick.active = true; stick.id = e.pointerId;
  stick.cx = e.clientX; stick.cy = e.clientY;
  try{ stickEl.setPointerCapture(e.pointerId); }catch(err){}
  hidePrompt();
});
stickEl.addEventListener('pointermove', e => {
  if(!stick.active || e.pointerId !== stick.id) return;
  e.preventDefault();
  moveStick(e.clientX - stick.cx, e.clientY - stick.cy);
});
function endStick(e){
  if(e.pointerId !== stick.id) return;
  stick.active = false; stick.id = -1; stick.x = stick.y = 0;
  stickKnob.style.transform = '';
}
stickEl.addEventListener('pointerup', endStick);
stickEl.addEventListener('pointercancel', endStick);
$('resetBtn').addEventListener('click',()=>{
  if(!confirm('Start over? This erases all coins, levels, boats, gear and fish discoveries on this device.'))return;
  stowFish();G.thirdPerson=false;G.onBoat=false;G.sailing=null;G.boatPosition=null;G.activities=createActivityState();
  const fresh=normalizeSave({version:SAVE_VERSION});const {bag:emptyBag,log:emptyLog,...state}=fresh;
  Object.assign(G,state);bag.length=0;log.length=0;G.castPower=0.5;G.power=0;
  logDrawer.classList.add('hidden');drawerOpen=false;fishIcons.disconnect(logList);logList.replaceChildren();
  world.setBoat(0);spawnAtIsland(0);
  applyGear();invalidateLog();saveGame();resumeWorld();showToast('A fresh adventure. Tight lines!');
});
$('soundBtn').addEventListener('click', function(){
  soundOn = !soundOn;
  this.innerHTML = soundOn ? ICON.soundOn : ICON.soundOff;
  this.classList.toggle('off', !soundOn);
  if(soundOn) ensureAudio();
  showToast(soundOn ? 'Sound on' : 'Sound off');
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = PORTRAIT() ? 72 : 58;
  camera.updateProjectionMatrix();
  frontCamera.aspect = camera.aspect;
  frontCamera.fov = PORTRAIT() ? 60 : 52;
  frontCamera.updateProjectionMatrix();
  placeRodForAspect();
  updatePlayerView();
  const ratio=adaptiveQuality.resize(devicePixelRatio);
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Adaptive quality ----------
function checkPerformance(dt){
  const ratio=adaptiveQuality.sample(dt,{active:!uiBusy()&&G.state!=='menu'&&G.state!=='caught'});
  if(ratio!==null&&renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
}
document.addEventListener('visibilitychange',()=>{adaptiveQuality.resetSampling();if(document.hidden&&G.state!=='menu')saveGame();});
addEventListener('pagehide',event=>{if(G.state!=='menu')saveGame();if(!event.persisted)fishIcons.dispose();});

// ---------- Animation loop ----------
const clock = new THREE.Clock();
let bobPhase = 0;

function animate(){
  requestAnimationFrame(animate);
  try { tick(); }
  catch(err){
    // never let one bad frame freeze the canvas
    if(!animate.reported){ animate.reported = true; console.error('[reel-deal] frame error:', err); }
  }
}
function tick(){
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  if(document.hidden)return;
  G.time += dt;animatePhysicalAquarium();
  refreshActivityUI(false);
  checkPerformance(rawDt);

  // camera look
  camera.rotation.y = G.yaw;
  camera.rotation.x = G.pitch;

  // ---- walking ----
  let mf = 0, ms = 0;
  if(G.state === 'aim' && !uiBusy() && (!G.onBoat||!isDriving())){
    if(keys.f) mf += 1;
    if(keys.b) mf -= 1;
    if(keys.r) ms += 1;
    if(keys.l) ms -= 1;
    if(stick.active){ mf += stick.y; ms += stick.x; }
  }
  const mag = Math.hypot(mf, ms);
  const moving = mag > 0.02;
  if(moving){
    const inv = 1 / Math.max(1, mag);
    mf *= inv; ms *= inv;
    const spd = (keys.sprint ? 6.2 : 3.4) * dt;
    const fx = -Math.sin(G.yaw), fz = -Math.cos(G.yaw);
    const rx = Math.cos(G.yaw), rz = -Math.sin(G.yaw);
    const dx = (fx * mf + rx * ms) * spd;
    const dz = (fz * mf + rz * ms) * spd;
    if(G.onBoat&&!isDriving()){
      const p=clampBoatDeckPosition(G.px+dx,G.pz+dz,G.sailing,BOATS[G.boat].size);G.px=p.x;G.pz=p.z;
    }else if(walkable(G.px + dx, G.pz + dz)){ G.px += dx; G.pz += dz; }
    else if(walkable(G.px + dx, G.pz)){ G.px += dx; }
    else if(walkable(G.px, G.pz + dz)){ G.pz += dz; }
    G.bob += dt * 11;
    G.walked += spd;
    if(G.walked > 2.6){ G.walked = 0; sfx.step(); }
  }
  tickBoat(dt);checkIslandSecret();
  const gY = G.onBoat?BOATS[G.boat].size*.9:groundAt(G.px, G.pz);
  const eyeTarget = (gY === null ? 1.15 : gY) + EYE;
  G.camY += (eyeTarget - G.camY) * Math.min(1, dt * 9);
  camera.position.set(
    G.px,
    G.camY + (moving ? Math.abs(Math.sin(G.bob)) * 0.055 : 0),
    G.pz
  );

  // Only the nearest interaction is shown; separate stalls never overlap UI.
  nearbyStall=nearestVendor();
  G.nearShop=!!nearbyStall&&['rod','line','bait'].includes(nearbyStall.kind);
  G.nearMarket=nearbyStall?.kind==='market';G.nearPort=isNearVendor('port');
  const idle=G.state==='aim'&&!uiBusy();
  setHidden(shopBtnEl,!idle||!G.nearShop);
  setHidden(marketBtnEl,!idle||!G.nearMarket);
  setHidden(portBtnEl,!idle||nearbyStall?.kind!=='port');setHidden($('merchantBtn'),!idle||!merchantNear());
  if(idle&&G.nearShop&&shopBtnEl.firstChild.nodeValue!==nearbyStall.name+' ')shopBtnEl.firstChild.nodeValue=nearbyStall.name+' ';
  setHidden(stickEl,!(isTouch&&idle));
  if(G.time-lastMapDraw>.2){
    updateBoatUI();
    if(!uiBusy()&&G.state!=='menu'&&G.state!=='caught')drawMinimap($('minimap'),{x:G.px,z:G.pz,yaw:G.onBoat?G.sailing.yaw:G.yaw,licensed:ISLANDS.filter(i=>hasLicense(i.id)).map(i=>i.id),waypoint:G.waypoint,boat:G.onBoat?null:G.boatPosition});lastMapDraw=G.time;
  }
  updateContextHint(moving);

  // ---- state machine / timers ----
  if(G.state === 'menu'){
    G.yaw = Math.sin(G.time * 0.22) * 0.5;
    G.pitch = -0.08 + Math.sin(G.time * 0.3) * 0.03;
  }

  if(G.state === 'charging'){
    G.power += G.powerDir * Math.min(rawDt,.15) * 1.15;
    if(G.power >= 1){ G.power = 1; G.powerDir = -1; }
    if(G.power <= 0){ G.power = 0; G.powerDir = 1; }
    updateCastMeter();
    const ok = landingPoint(G.power, tmpV);
    aimMarker.visible = ok;
    if(ok){
      aimMarker.position.set(tmpV.x, 0.16, tmpV.z);
      aimMarker.scale.setScalar(0.9 + Math.sin(G.time * 8) * 0.08);
    }
  }

  if(G.state === 'casting'){
    G.castT = Math.min(1, G.castT + dt / G.castDur);
    const t = G.castT;
    bobberPos.lerpVectors(castFrom, castTo, t);
    bobberPos.y = lerp(castFrom.y, castTo.y, t) + Math.sin(Math.PI * t) * (1.0 + castFrom.distanceTo(castTo) * 0.05);
    bobber.position.copy(bobberPos);
    bobber.rotation.y += dt * 6;
    if(t >= 1){ bobber.rotation.y = 0; landBobber(); }
  }

  if(G.state === 'waiting'){
    G.waitTimer -= dt;
    bobPhase += dt;
    bobberPos.y = 0.12 + Math.sin(bobPhase * 2.4) * 0.05;
    bobber.position.copy(bobberPos);
    if(Math.random() < dt * 0.25) spawnRipple(bobberPos);
    if(G.waitTimer <= 0) triggerBite();
  }

  if(G.state === 'bite'){
    G.biteWindow -= dt;
    G.bobDip = Math.max(0, G.bobDip - dt * 2);
    bobber.position.set(bobberPos.x, 0.02 - G.bobDip * 0.16, bobberPos.z);
    if(G.biteWindow <= 0){
      showToast('It got away… too slow!', true);
      sfx.escape();
      setState('aim');
    }
  }

  if(G.state === 'waiting' || G.state === 'reeling'){
    bobber.position.copy(bobberPos);
  }

  // ---- readable-phase reeling minigame ----
  // The fish cycles through readable phases and occasionally commits to a
  // sharp, directional lunge. The HUD calls out each tug so faster movement
  // still rewards a reaction rather than an unseen random yank.
  if(G.state === 'reeling'){
    const r2=RODS[G.gear.rod];
    const phaseStep=advanceReelPhase(G.reelPhase,G.reelPhaseTime,dt);
    G.reelPhase=phaseStep.phase;G.reelPhaseTime=phaseStep.timeLeft;
    const fishPull=phasePull(G.reelPhase,G.reelHeld);
    const base=12+G.fishStrength*18;
    const reelInput=G.reelHeld?base*G.rateMul:-12*(0.7+0.3*G.rateMul);
    // A short fish-driven tug periodically kicks tension toward either red
    // edge. Its direction is announced in the HUD for a fair reaction window.
    G.fishTugTimer-=dt;
    if(G.fishTugTimer<=0&&G.fishTugWarn<=0&&G.fishTugDur<=0){
      G.fishTug=fishTugImpulse(G.fishStrength,G.nextFishTugDirection);G.nextFishTugDirection=alternateTugDirection(G.nextFishTugDirection);
      G.fishTugWarn=G.activities.bossEncounter?.behavior==='feint'?.42:.7;G.fishTugTimer=G.activities.bossEncounter?rand(1.7,2.7):rand(3.8,5.8);
    }
    const wasTugWarning=G.fishTugWarn>0;
    if(wasTugWarning){
      G.fishTugWarn=Math.max(0,G.fishTugWarn-dt);
      if(G.fishTugWarn===0)G.fishTugDur=.42;
    }else if(G.fishTugDur>0)G.fishTugDur=Math.max(0,G.fishTugDur-dt);
    if(G.fishTugDur<=0)G.fishTug=0;
    const tugCue=wasTugWarning||G.fishTugDur>0;
    const tugging=G.fishTugDur>0;
    // Faster response than the previous build, with modest background sway.
    const wobble=rand(-1,1)*(4+G.fishStrength*5);
    const rate=(reelInput+fishPull*G.rateMul+wobble+(tugging?G.fishTug:0))*1.22*1.15;
    const tugEl=$('fishTugCue'),tugDirection=G.fishTug>0?'surge':'dive';
    tugEl.classList.toggle('show',tugCue);tugEl.classList.toggle('surge',tugDirection==='surge');tugEl.classList.toggle('dive',tugDirection==='dive');
    tugEl.classList.toggle('incoming',wasTugWarning);tugEl.classList.toggle('active',tugging);
    setText($('fishTugLabel'),G.fishTug>0?'SURGE':'DIVE');

    G.tension = clamp(G.tension + rate * dt, 0, 100);
    const inSafe = G.tension >= G.bandLo && G.tension <= G.bandHi;

    // Green progress depends on reel speed only, NEVER cast charge or distance.
    if(inSafe){
      G.progress += dt * 20 * 0.85 * r2.reel / 1.45;
      if(Math.random() < dt * 10) sfx.reelTick();
    }
    G.progress = clamp(G.progress, 0, 100);

    // red on either end and the fish is gone that instant
    if(G.tension >= RED_HI){
      sfx.snap();
      escapeFish(G.over > 0.25 ? 'SNAP! That fish was over your line rating.' : 'Snap! Too much tension — the line went.');
    } else if(G.tension <= RED_LO){
      sfx.escape();
      escapeFish('The line went dead slack — it spat the hook.');
    }

    if(G.state === 'reeling' && G.progress >= 100) catchFish();

    tensionNeedle.style.left = `calc(${G.tension}% - 3px)`;
    const progressWidth=G.progress+'%';
    if(progressFill.style.width!==progressWidth)progressFill.style.width=progressWidth;
    setText(reelPct,Math.floor(G.progress)+'%');

    tensionTrack.classList.toggle('danger', G.tension > G.bandHi);
    tensionTrack.classList.toggle('slack', G.tension < G.bandLo);

    if(hookedFish){
      hookedFish.position.set(
        bobberPos.x + Math.sin(G.time*9) * 0.25,
        -0.55 + Math.sin(G.time * 12) * 0.25,
        bobberPos.z
      );
      hookedFish.rotation.y = G.time * 2.4;
      hookedFish.rotation.z = Math.sin(G.time * 14) * 0.35;
      animateFishModel(hookedFish,G.time,1);
      const toCamX = camera.position.x - bobberPos.x, toCamZ = camera.position.z - bobberPos.z;
      const d = Math.hypot(toCamX, toCamZ);
      if(d > 2.5){
        bobberPos.x += (toCamX / d) * dt * (G.reelHeld ? 1.8 : 0.35);
        bobberPos.z += (toCamZ / d) * dt * (G.reelHeld ? 1.8 : 0.35);
      }
      if(Math.random() < dt * 2.5) spawnSplash(bobberPos, 2, 0.4);
    }
  } else {
    const tugCueEl=$('fishTugCue');if(tugCueEl.classList.contains('show'))tugCueEl.classList.remove('show','incoming','active');
  }

  // ---- caught animation: fish leaps toward the camera ----
  if(G.state === 'caught' && hookedFish){
    G.caughtAnim = Math.min(1, G.caughtAnim + dt * 1.6);
    const t = G.caughtAnim;
    tmpV.set(camera.position.x, camera.position.y - 0.35, camera.position.z).addScaledVector(camFwd, -1.2);
    hookedFish.position.lerpVectors(bobberPos, tmpV, t);
    hookedFish.position.y += Math.sin(t * Math.PI) * 1.6;
    hookedFish.rotation.y += dt * 7;
    bobber.visible = false; line.visible = false;
  }

  // ---- rod pose ----
  let rodTarget = DIR_IDLE;
  let bend = 0;
  if(G.state === 'charging'){
    rodTarget = tmpV.copy(DIR_IDLE).lerp(DIR_CHARGE, G.power);
  } else if(G.state === 'casting' && G.rodSwing > 0){
    G.rodSwing -= dt * 2.4;
    rodTarget = tmpV.copy(DIR_IDLE).lerp(DIR_SWING, Math.sin(Math.max(0, G.rodSwing) * Math.PI));
  } else if(G.state === 'waiting' || G.state === 'bite'){
    rodTarget = DIR_IDLE;
  } else if(G.state === 'reeling'){
    bend = (G.tension / 100) * 0.5;
    rodTarget = tmpV.copy(DIR_REEL);
  } else if(G.state === 'caught'){
    rodTarget = DIR_IDLE;
  }
  rodDir.lerp(rodTarget, Math.min(1, dt * 14));
  if(rodDir.lengthSq() < 0.01) rodDir.copy(rodTarget);
  rodRig.quaternion.setFromUnitVectors(UP, rodDir.normalize());
  tipJoint.rotation.x = -bend;
  updatePlayerView(moving);
  activeRodTip().getWorldPosition(rodTipWorld);

  // ---- line ----
  if(G.state === 'casting' || G.state === 'waiting' || G.state === 'bite' || G.state === 'reeling'){
    updateLine(rodTipWorld, bobberPos, G.state === 'reeling' ? 0.12 : 0.3);
    line.visible = true;
  } else if(G.state === 'charging'){
    tmpV.copy(rodTipWorld); tmpV.y -= 1.0;
    updateLine(rodTipWorld, tmpV, 0.1);
    line.visible = true;
  } else {
    line.visible = false;
  }

  // bobber spin/idle
  if(G.state === 'waiting' || G.state === 'bite'){
    bobber.rotation.y = Math.sin(G.time * 1.6) * 0.2;
  }

  world.update(G.time, dt, G.zone, activeCamera(), G.onBoat,G.boatPosition,islandWeather(G.zone,Date.now()).id);
  updateParticles(dt);
  renderer.render(scene, activeCamera());
  if(heldFishRig.visible&&activeCamera()===camera){
    // A giant first-person model needs a longer presentation distance. Render
    // it like a held tool, after the world, so water/terrain cannot cut it in
    // half. Its own depth buffer still resolves eyes, fins and body correctly;
    // the character stays invisible, and the eye/aim camera is not displaced.
    const background=scene.background,autoClear=renderer.autoClear,mask=camera.layers.mask;
    try{
      scene.background=null;renderer.autoClear=false;renderer.clearDepth();
      camera.layers.set(1);renderer.render(scene,camera);
    }finally{camera.layers.mask=mask;renderer.autoClear=autoClear;scene.background=background;}
  }
}

// ---------- boot ----------
loadGame();drawAquarium();
const savedSailing=G.sailing;spawnAtIsland(G.zone);
world.setBoat(G.boat);world.setAuroraPaint(G.collections.cosmetics?.includes('aurora-trim'));
if(savedSailing){G.sailing={...savedSailing,speed:0};G.onBoat=true;G.px=savedSailing.x;G.pz=savedSailing.z;lastTerritory=territoryAt(G.px,G.pz);}
G.waypoint=ISLANDS.find(i=>!hasLicense(i.id))?.id??19;
applyGear();
updateStats();
renderLog();
setRodDir(DIR_IDLE);
setState('menu');
promptEl.style.display = 'none';
animate();

// Compatibility handle plus a name that matches the current title.
window.__reelDeal = window.__reelLife = {
  G, SPECIES, RODS, LINES, BAITS, ISLANDS, BOATS, RARITY, RARITY_ORDER, ALL_CATCH_SPECIES, LEGACY_SPECIES, formatWeight, formatCatchMass,roundWeight,shoreLuckPenalty,territoryAt,territoryCenter,TERRITORY_RADIUS,stepBoat,nearbyDock,drawMinimap,islandToWorld,islandSpawn,dockPose,returnBoatPose,
  renderer, scene, camera, world, bobber, bobberPos, water, rodRig, aimMarker, bag,
  get shopOpen(){return shopOpen;},get chartOpen(){return chartOpen;},get indexOpen(){return indexOpen;},
  get bagOpen(){return bagOpen;},get bagTab(){return bagTab;},get helpOpen(){return helpOpen;},get tutorialOpen(){return tutorialOpen;},get activitiesOpen(){return activitiesOpen;},get hudHidden(){return hudHidden;},get tutorialIndex(){return tutorialIndex;},
  get fishBagOpen(){return bagOpen&&bagTab==='fish';},get heldCatch(){return heldCatch;},get carriedModel(){return carriedModel;},
  openBag,closeBag,selectBagTab,renderBag,openHelp,closeHelp,openTutorial,closeTutorial,stepTutorial,setHudHidden,updateContextHint,
  playerModel,boatViewPose,frontCamera,heldFishRig,carriedSize,heldFishSpan,heldFishLayout,firstPersonFishPose,frontViewPose,activeCamera,activeRodTip,toggleView,openFishBag,closeFishBag,holdFish,stowFish,renderFishBag,updatePlayerView,
  openShop,closeShop,openKit,openMarket,closeMarket,buyGear,sellAll,sellFish,openAquarium,closeAquarium,drawAquarium,displayCatch,nearbyHubBuilding,get physicalAquariumCount(){return physicalAquariumModels.length;},
  openChart,closeChart,renderChart,buyBoat,boardBoat,dockBoat,toggleBoatMode,tickBoat,updateBoatUI,openIndex,closeIndex,renderIndex,
  renderShop,renderMarket,fightSetup,pickSpecies,paintTensionBand,eligibleSpecies,
  updateStats,fishValue,rollWeight,catchXP,xpForLevel,level,hasLicense,saveGame,levelProgress,openActivities,closeActivities,renderActivities,recordActivity,islandWeather,
  castLuckModifier,effectiveLuck,updateCastMeter,
  makeFish3D,disposeFishModel,animateFishModel,fishSVG,
  get performanceStats(){return {quality:adaptiveQuality.stats,art:fishGeometryCacheStats(),icons:fishIcons.stats,...frameWork,baitPools:localFishPool.size,activeParticles,activeRipples};},
  get hookedFish(){return hookedFish;},
  saleValue,bagTotal,collectionCoinBonus,islandCollectionProgress,fishSaleValue,sortFishIndex,openActivities,closeActivities,renderActivities,recordActivity,islandWeather,
  walkable,groundAt,landBobber,triggerBite,hookFish,catchFish,SHOP_POS,MARKET_POS,
  startCharge,releaseCast,landingPoint,inWater,spawnAtIsland,nearestVendor
};
