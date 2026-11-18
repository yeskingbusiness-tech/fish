import * as THREE from 'three';

// ============================================================
//  REEL DEAL 3D — blocky first-person fishing
//  Everything is built from boxes, one shared geometry,
//  Lambert materials, no shadow pass, instanced clutter.
// ============================================================

const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a) * t;
const rand  = (a,b) => a + Math.random() * (b-a);
const hexc  = c => '#' + c.toString(16).padStart(6,'0');
const fmt   = n => n.toLocaleString('en-US');

import { SPECIES, RARITY, RARITY_ORDER, RODS, LINES, BAITS, fishValue, baitWindow, sortFishIndex, castLuckModifier, effectiveLuck,
  eligibleSpecies, pickSpecies as drawSpecies, rollWeight as drawWeight } from './game-data.mjs?v=34';
import { ISLANDS, BOATS, xpForLevel, levelForXp, levelProgress, catchXP, gearIsland, hasIslandLicense, travelRequirement,
  ISLAND_COLLECTION_BONUS, islandCollectionProgress, collectionCoinBonus, fishSaleValue } from './archipelago.mjs?v=34';
import { createWorld } from './world.mjs?v=34';
import { createPlayerModel, heldFishSpan, frontViewPose } from './player-view.mjs?v=34';
import { normalizeSave, SAVE_VERSION, SAVE_KEY, LEGACY_KEYS } from './save-state.mjs?v=34';

const pickSpecies = () => drawSpecies(G.zone, G.gear.bait, Math.random, G.castPower);
const rollWeight = sp => drawWeight(sp, G.gear.bait, Math.random, G.castPower);
const coinBonus = () => collectionCoinBonus(G.discoveries);
const saleValue = (sp,weight) => fishSaleValue(sp,Number(weight),G.discoveries);

// ---------- Pixel-art fish (UI icons) ----------
const FISH_BASE = [
  '................',
  '..............XX',
  '.....oooo....XXX',
  '...oooooooo..XXX',
  '..oooooooooXXXXX',
  '.oooooooooooXXXX',
  '.oooooooooooXXXX',
  '..obbbbbbbboXXXX',
  '...oooooooo..XXX',
  '.....oooo....XXX'
];
function lighten(hex, t){
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const m = v => Math.round(v + (255 - v) * t);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
function shade(hex, f){
  const r = Math.round(((hex >> 16) & 255) * f);
  const g = Math.round(((hex >> 8) & 255) * f);
  const b = Math.round((hex & 255) * f);
  return hexc((r << 16) | (g << 8) | b);
}
function fishSVG(sp){
  const grid = FISH_BASE.map(r => r.split(''));
  // eye
  grid[4][3] = 'e';
  grid[4][2] = 'w';
  grid[3][4] = 'w';
  const dark = shade(sp.color, 0.62);
  // patterns paint over belly cells
  const paint = (x,y,g) => { if(grid[y] && grid[y][x] && 'obw'.includes(grid[y][x])) grid[y][x] = g; };
  if(sp.pattern === 'stripes'){ [5,7,9].forEach(x => { for(let y=3;y<=7;y++) paint(x,y,'a'); }); }
  if(sp.pattern === 'spots'){ [[5,4],[7,6],[9,4],[6,7],[10,6]].forEach(([x,y])=>paint(x,y,'a')); }
  if(sp.pattern === 'rainbow'){ for(let x=3;x<=10;x++){ paint(x,5,'a'); } }
  if(sp.pattern === 'patches'){ [[4,4],[6,6],[8,3],[9,7]].forEach(([x,y])=>paint(x,y,'a')); }
  if(sp.pattern === 'scales'){ [[4,4],[6,6],[8,4],[9,7],[6,4],[8,7]].forEach(([x,y])=>paint(x,y,'a')); }
  const cols = { o:hexc(sp.color), b:hexc(sp.belly), X:dark, a:shade(sp.color,0.78), e:'#10242a', w:'#ffffff' };
  let out = '';
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid[y].length;x++){
      const c = cols[grid[y][x]];
      if(c) out += `<rect x="${x*4}" y="${y*4}" width="4" height="4" fill="${c}"/>`;
    }
  }
  const whisk = sp.pattern === 'whiskers'
    ? `<rect x="2" y="24" width="4" height="12" fill="${dark}"/><rect x="4" y="20" width="4" height="24" fill="${dark}"/>`
    : '';
  return `<svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="${sp.name}">${out}${whisk}</svg>`;
}

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false; // flat blocky lighting — and much faster

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd8f2);
scene.fog = new THREE.Fog(0x9bd9ed, 65, 350);

const PORTRAIT = () => innerHeight > innerWidth;
const camera = new THREE.PerspectiveCamera(PORTRAIT() ? 72 : 58, innerWidth/innerHeight, 0.1, 1400);
camera.rotation.order = 'YXZ';
camera.position.set(0, 2.77, 5.0);
// Keep fishing aim at the player's eyes; the front camera is presentation only.
const frontCamera = new THREE.PerspectiveCamera(PORTRAIT() ? 60 : 52, innerWidth/innerHeight, 0.1, 1400);

// Lights (no shadows)
scene.add(new THREE.HemisphereLight(0xd8f4ff, 0x4a8a6a, 1.15));
const sun = new THREE.DirectionalLight(0xfff3d0, 1.9);
sun.position.set(18, 30, 10);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9ad6ff, 0.45);
fill.position.set(-16, 12, -14);
scene.add(fill);

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
  time:0, rodSwing:0, bobDip:0,
  castT:0, castDur:1, biteWindow:0, waitTimer:4,
  caughtAnim:0,
  // player + economy
  px:0, pz:5.0, camY:2.77, bob:0, walked:0, nearShop:false, nearMarket:false,
  coins:0, bag:[], xp:0, licenses:[0], zone:0, visited:[0], discoveries:{},
  boat:0, ownedBoats:[0], nearPort:false,
  owned:{ rod:[0], line:[0], bait:[0] },
  gear:{ rod:0, line:0, bait:0 },
  // current fight tuning (set on hook)
  bandLo:22, bandHi:70, demand:0.4, supply:1, over:0, fishWeight:1, castDist:10, rateMul:1
};
const EYE = 1.62;
let shopOpen = false, shopTab = 'rods', marketOpen = false;
let shopKind = 'rod', kitOpen = false, chartOpen = false, indexOpen = false, fishBagOpen = false;
let selectedIsland = 0, indexIsland = -1, fleetTab = false, voyage = null;
let nearbyStall = null;
const uiBusy = () => shopOpen || marketOpen || chartOpen || indexOpen || fishBagOpen || drawerOpen;
const level = () => levelForXp(G.xp);
const hasLicense = target => hasIslandLicense(target,G.xp,G.licenses);

const bag = G.bag;
// Keep the actual bag object, not an index: selling another fish cannot change
// which specimen is being held, including identical species/weight duplicates.
let heldCatch = null, carriedModel = null;
const activeCamera = () => G.thirdPerson && !voyage && G.state !== 'menu' ? frontCamera : camera;
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
const reelWarn = $('reelWarn'), stickEl = $('stick'), stickKnob = document.querySelector('.stick-knob');
let drawerOpen = false;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function hidePrompt(){ promptEl.style.display = 'none'; }
function setPrompt(html, mode=''){
  promptEl.innerHTML = html;
  promptEl.className = 'prompt' + (mode ? ' ' + mode : '');
}
function showToast(msg, bad=false){
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (bad ? ' bad' : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.className = 'toast hidden', 2000);
}
function updateStats(){
  $('caughtCount').textContent = fmt(G.caught);
  $('coinCount').textContent = fmt(G.coins);
  const bonus = coinBonus();
  $('coinBonus').textContent = `+${bonus}% SALES`;
  $('coinBonus').classList.toggle('hidden',bonus===0);
  $('bestNum').textContent = G.best ? G.best.weight + ' lb' : '—';
  $('shopCoins').textContent = fmt(G.coins);
  $('marketCoins').textContent = fmt(G.coins);
  const progress = levelProgress(G.xp), zone = ISLANDS[G.zone];
  $('levelNum').textContent = 'LV. ' + progress.level;
  $('xpText').textContent = progress.level === 99 ? 'MAX LEVEL' : `${fmt(progress.current)} / ${fmt(progress.needed)} XP`;
  $('xpFill').style.width = clamp(progress.ratio * 100, 0, 100) + '%';
  $('zoneNumber').textContent = `ISLAND 0${G.zone + 1} / 06`;
  $('zoneName').textContent = zone.name;
  $('zoneWaters').textContent = zone.waters;
  const next = ISLANDS.find(i => !hasLicense(i.id));
  $('journeyObjective').textContent = next ? `Next stop · ${next.short} at level ${next.level}` : 'All island licenses unlocked · fill your index';
  const found = Object.keys(G.discoveries).length;
  $('indexCount').textContent = found + '/120';
  const pool = eligibleSpecies(G.zone, G.gear.bait);
  $('equipmentStrip').innerHTML = `<span>${RODS[G.gear.rod].name}</span><span>${LINES[G.gear.line].name}</span><span class="${pool.length?'':'wrong-bait'}">${BAITS[G.gear.bait].name}${pool.length?'':' · no local bites'}</span><span>${bag.length} fish in bag</span>`;
  $('boatCoins').textContent = fmt(G.coins) + 'c';
  if(heldCatch && !bag.includes(heldCatch)) stowFish();
  updateCarryUI();
}
function renderLog(){
  if(!log.length){ logList.innerHTML = '<p class="empty">No fish yet. Cast your line!</p>'; logSummary.textContent = ''; return; }
  logList.innerHTML = log.map(e =>
    `<div class="log-item"><span class="e">${fishSVG(e.sp)}</span><div><b>${e.sp.name}</b><small>${e.weight} lbs • ${ISLANDS[e.sp.island].short}</small></div><span class="pts">${fmt(saleValue(e.sp,e.weight))}c</span></div>`
  ).join('');
  logSummary.textContent=`${G.caught} total catches · showing last ${log.length} · ${Object.keys(G.discoveries).length}/120 discovered`;
}
const RED_LO = 8, RED_HI = 92;      // hit either end of the bar and the fish is gone

let storageWarning = false;
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version:SAVE_VERSION, score:G.score, caught:G.caught, best:G.best, coins:G.coins, xp:G.xp,
      licenses:ISLANDS.filter(i=>hasLicense(i.id)).map(i=>i.id),
      zone:G.zone, visited:G.visited, boat:G.boat, ownedBoats:G.ownedBoats,
      discoveries:G.discoveries, owned:G.owned, gear:G.gear,
      bag:bag.map(e=>({ n:e.sp.name, w:e.weight })),
      log:log.slice(0,200).map(e=>({ n:e.sp.name, w:e.weight }))
    }));
    return true;
  }catch(e){
    if(!storageWarning){ storageWarning=true; showToast('Saving is unavailable. Keep this tab open to keep this session.',true); }
    return false;
  }
}
function loadGame(){
  try{
    let raw=localStorage.getItem(SAVE_KEY), legacyKey=null;
    if(!raw){for(const key of LEGACY_KEYS){raw=localStorage.getItem(key);if(raw){legacyKey=key;break;}}}
    if(!raw) return;
    const normalized=normalizeSave(JSON.parse(raw),legacyKey?.endsWith('v6')||false);
    const {bag:loadedBag,log:loadedLog,...state}=normalized;
    Object.assign(G,state); bag.push(...loadedBag); log.push(...loadedLog);
    if(legacyKey && saveGame()) for(const key of LEGACY_KEYS)localStorage.removeItem(key);
  }catch(e){showToast('Could not read the saved game. The original save has not been deleted.',true);}
}

// ---------- State transitions ----------
function setState(s){
  G.state = s;
  biteEl.classList.remove('show');
  castMeter.classList.toggle('hidden', s !== 'charging');
  reelUI.classList.toggle('hidden', s !== 'reeling');
  aimMarker.visible = s === 'charging';
  if(s === 'aim'){
    promptEl.style.display = '';
    setPrompt(isTouch
      ? 'Joystick to walk · drag to look · <b>hold</b> to cast'
      : '<b>WASD</b> to walk · mouse to look · <b>hold CLICK</b> to cast');
    bobber.visible = false; line.visible = false;
  }
  if(s === 'waiting'){ promptEl.style.display = ''; setPrompt(`<b>${castLuckLabel(G.castPower)}</b> · Waiting… ${isTouch?'tap':'click'} to reel in early`, 'waiting'); }
  if(s === 'bite'){ promptEl.style.display = ''; setPrompt('BITE! <b>CLICK / SPACE</b> NOW!', 'bite'); biteEl.classList.add('show'); }
  if(s === 'reeling') promptEl.style.display = 'none';
  if(s === 'casting'){ promptEl.style.display = ''; setPrompt('Splash!', 'waiting'); }
  if(s === 'caught') promptEl.style.display = 'none';
  if(s === 'charging') promptEl.style.display = 'none';
  if(s === 'aim' && heldCatch) hidePrompt();
  updateCarryUI();
  updatePlayerView();
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
  $('castPowerValue').textContent = Math.round(G.power * 100) + '%';
  $('castLuck').textContent = castLuckLabel(G.power);
  $('castLuck').classList.toggle('positive',G.power>0.5);
  $('castLuck').classList.toggle('negative',G.power<0.5);
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
  while(!inWater(out) && guard++ < 40){
    dist -= 0.6;
    if(dist <= 0) break;
    out.copy(camera.position).addScaledVector(camFwd, dist);
    out.y = 0.1;
  }
  return inWater(out);
}
function inWater(p){ return world.inWater(p); }
function startCharge(){
  if(G.state !== 'aim' || uiBusy()) return;
  if(heldCatch){showToast('Put away your fish before casting — use X or Put away.');return;}
  if(!eligibleSpecies(G.zone,G.gear.bait).length){ showToast('No local fish take this bait. Open your tackle bag (I) to switch.',true); return; }
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
  const luck = effectiveLuck(G.gear.bait,G.castPower);
  G.waitTimer = rand(2.4, 5.8) * (1 - luck * 0.45);
  setState('waiting');
}
function triggerBite(){
  G.biteWindow = 1.4; G.bobDip = 1;
  setState('bite');
  sfx.bite();
  spawnSplash(bobberPos, 8, 0.5);
}
function disposeFishModel(model){
  if(!model)return;
  const materials=new Set();model.traverse(o=>{if(o.isMesh)materials.add(o.material);});
  materials.forEach(m=>m.dispose());model.removeFromParent(); // UNIT geometry is shared.
}
function disposeHookedFish(){
  disposeFishModel(hookedFish);hookedFish=null;
}
function makeFish3D(sp, scale){
  const g = new THREE.Group();
  const bodyMat=mat(sp.color),bellyMat=mat(sp.belly),darkMat=mat(shade(sp.color,.66)),eyeMat=mat(0x10242a);
  const long=/Eel|Wyrm|Serpent|Oarfish/.test(sp.name),flat=/Manta|Stingray/.test(sp.name),giant=/Whale|Leviathan|God|World-Eater/.test(sp.name);
  const length=long?2.25:giant?1.6:1.15,height=flat?.2:giant?.7:.5,width=flat?1.3:.38;
  g.add(box(length,height,width,bodyMat));
  g.add(box(length*.78,height*.36,width*1.03,bellyMat,.05,-height*.35,0));
  const tail=box(.34,flat?.18:.46,flat?.6:.12,darkMat,-length/2-.14,0,0);g.add(tail);
  g.add(box(.34,.26,.09,darkMat,.05,height/2+.1,0));
  for(const side of [-1,1]){
    g.add(box(.055,.1,.05,eyeMat,length/2-.12,height*.2,side*(width/2+.01)));
    g.add(box(.38,.09,flat?.55:.23,darkMat,.05,-.08,side*width*.6));
    if(sp.pattern==='stripes'||sp.pattern==='scales')for(let k=0;k<3;k++)g.add(box(.075,height*.7,.012,darkMat,-.35+k*.27,0,side*(width/2+.01)));
    if(sp.pattern==='spots'||sp.pattern==='patches')for(let k=0;k<4;k++)g.add(box(.09,.09,.012,darkMat,-.35+k*.21,k%2?.1:-.06,side*(width/2+.01)));
    if(sp.pattern==='rainbow')g.add(box(length*.8,.07,.014,mat(0xe6a4b8),0,.02,side*(width/2+.01)));
    if(sp.pattern==='whiskers')g.add(box(.52,.025,.025,darkMat,length/2+.1,-.1,side*.19));
  }
  if(/Marlin|Gar|Pike|Sturgeon/.test(sp.name))g.add(box(.4,.18,.22,bodyMat,length/2+.13,0,0));
  g.userData={tail};g.scale.setScalar(scale*sp.size);return g;
}
// ---------- Fish bag, carried catches and front-facing third person ----------
function updateCarryUI(){
  $('bagCount').textContent=fmt(bag.length);
  $('fishBagCount').textContent=`${fmt(bag.length)} fish`;
  $('heldFishBar').classList.toggle('hidden',!heldCatch||!!voyage||G.state==='menu');
  $('heldFishName').textContent=heldCatch?heldCatch.sp.name:'';
  $('heldFishWeight').textContent=heldCatch?`${Number(heldCatch.weight).toFixed(1)} lb · still in your bag`:'';
  $('viewLabel').textContent=G.thirdPerson?'First person':'Front view';
  $('viewBtn').setAttribute('aria-pressed',String(G.thirdPerson));
  $('viewBtn').setAttribute('aria-label',G.thirdPerson?'Switch to first-person view (V)':'Switch to front-facing third-person view (V)');
  $('viewBtn').disabled=G.state!=='aim'||uiBusy()||!!voyage;
  $('putAwayBtn').disabled=G.state!=='aim'||uiBusy()||!!voyage;
  $('app').classList.toggle('front-view',G.thirdPerson&&!voyage&&G.state!=='menu');
  $('app').classList.toggle('carrying-fish',!!heldCatch);
  updateLockHint();
}
function updatePlayerView(moving=false){
  const third=activeCamera()===frontCamera, ground=G.camY-EYE;
  playerModel.root.visible=third;
  rodRig.visible=!third&&!heldCatch&&!voyage;
  heldFishRig.visible=!!heldCatch&&!voyage&&G.state!=='menu';
  playerModel.pose({x:G.px,z:G.pz,ground,yaw:G.yaw,pitch:G.pitch,time:G.time,stride:G.bob,moving,
    holding:!!heldCatch,rodRotation:rodRig.quaternion,bend:tipJoint.rotation.x});
  if(third){
    const p=frontViewPose({x:G.px,z:G.pz,ground,yaw:G.yaw,pitch:G.pitch,aspect:frontCamera.aspect},world.cameraBlockers[G.zone]);
    frontCamera.position.set(p.x,p.y,p.z);frontCamera.lookAt(p.targetX,p.targetY,p.targetZ);
  }
  if(heldCatch){
    const parent=third?playerModel.fishMount:camera;
    if(heldFishRig.parent!==parent)parent.add(heldFishRig);
    heldFishRig.position.set(0,third?0:-.12,third?0:-1.8);
    heldFishRig.scale.setScalar(third?1:PORTRAIT()?.6:.85);
    heldFishRig.rotation.set(0,0,Math.sin(G.time*1.7)*.018);
    carriedModel.userData.tail.rotation.y=Math.sin(G.time*3)*.12;
  }
}
function toggleView(){
  if(uiBusy()||voyage||G.state!=='aim')return false;
  G.thirdPerson=!G.thirdPerson;
  clearInput();setState('aim');$('viewBtn').blur();
  return true;
}
function openFishBag(){
  if(uiBusy()||G.state!=='aim'||voyage){if(G.state!=='aim')showToast('Finish your cast before opening your fish bag.');return;}
  fishBagOpen=true;$('fishBagOverlay').classList.remove('hidden');
  renderFishBag();updateCarryUI();focusPanel('fishBagClose');
}
function closeFishBag(){
  if(!fishBagOpen)return;
  fishBagOpen=false;$('fishBagOverlay').classList.add('hidden');resumeWorld();
}
function renderFishBag(){
  $('fishBagCount').textContent=`${fmt(bag.length)} fish`;
  $('fishBagBody').innerHTML=bag.length?bag.map((e,i)=>{
    const held=e===heldCatch;
    return `<article class="carry-row ${held?'selected':''}">
      <div class="carry-icon">${fishSVG(e.sp)}</div>
      <div class="carry-copy"><span class="carry-rarity ${e.sp.rarity}">${RARITY[e.sp.rarity].label}</span><b>${e.sp.name}</b><small>${Number(e.weight).toFixed(1)} lb · ${ISLANDS[e.sp.island].short}</small></div>
      <button class="buy-btn" data-hold-fish="${i}" aria-pressed="${held}" aria-label="${held?'Put away':'Hold'} ${e.sp.name}, ${Number(e.weight).toFixed(1)} pounds">${held?'Put away':'Hold'}</button>
    </article>`;
  }).join(''):'<div class="fish-bag-empty"><span aria-hidden="true">▥</span><h3>No fish in your bag yet.</h3><p>Land a catch, then come back to hold it up.<br>Sold fish stay in your index, not in your bag.</p></div>';
}
function stowFish(){
  if(!heldCatch)return false;
  disposeFishModel(carriedModel);carriedModel=null;heldCatch=null;heldFishRig.visible=false;
  $('putAwayBtn').blur();
  updateCarryUI();updatePlayerView();
  if(G.state==='aim'&&!uiBusy())setState('aim');
  return true;
}
function holdFish(index){
  if(!fishBagOpen||G.state!=='aim'||voyage||!Number.isInteger(index)||!bag[index])return false;
  const entry=bag[index];
  if(heldCatch===entry){stowFish();closeFishBag();return true;}
  stowFish();
  const model=makeFish3D(entry.sp,1),bounds=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();
  bounds.getSize(size);
  model.scale.multiplyScalar(heldFishSpan(entry.sp,entry.weight)/Math.max(.01,size.x));
  bounds.setFromObject(model);model.position.sub(bounds.getCenter(new THREE.Vector3()));
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
  const demand = sp.strength * (0.75 + 0.45 * wr) * (1 + tier * 0.05);
  // supply: better rod steadies the line, better line strains less.
  // Compressed so top gear is strong but never makes the lake trivial.
  const supply = Math.pow((1 / rod.tension) * (1 / ln.strain), 0.75) * 0.62;
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
  if(!hookedSpecies){showToast('This bait has no bites here. Switch bait in your tackle bag.',true);setState('aim');return;}
  const w = rollWeight(hookedSpecies);
  hookedWeight = +w.toFixed(1);
  disposeHookedFish();
  hookedFish = makeFish3D(hookedSpecies, 1.25);
  hookedFish.position.copy(bobberPos); hookedFish.position.y = -0.7;
  scene.add(hookedFish);
  G.caughtAnim=0;
  G.tension = 26; G.progress = 6;
  G.fishStrength = hookedSpecies.strength;
  G.fishWeight = hookedWeight;
  fightSetup(hookedSpecies, hookedWeight);
  G.surgeTimer = rand(0.6, 1.4); G.surgeDur = 0;
  G.yankTimer = 0.4; G.yank = 0; G.yankDur = 0;
  G.reelHeld = false;
  reelFishName.innerHTML = G.discoveries[hookedSpecies.id] ? `<span class="reel-fish">${fishSVG(hookedSpecies)}</span>${hookedSpecies.name}` : `<span class="reel-fish">${unknownFishSVG()}</span>Unidentified fish`;
  paintTensionBand();
  setState('reeling');
  sfx.hook();
  spawnSplash(bobberPos, 12, 0.8);
}
function catchFish(){
  if(G.state !== 'reeling' || !hookedSpecies) return;
  const sp = hookedSpecies;
  const weight = (hookedWeight || rollWeight(sp)).toFixed(1);
  const bonusBefore = coinBonus();
  const oldLevel=level(), lockedBefore=ISLANDS.filter(i=>!hasLicense(i.id)), isNew=!G.discoveries[sp.id];
  const earnedXP=catchXP(sp,Number(weight),isNew);
  G.xp+=earnedXP;
  const record=G.discoveries[sp.id]||(G.discoveries[sp.id]={count:0,best:0,first:new Date().toISOString().slice(0,10)});
  record.count++; record.best=Math.max(record.best,Number(weight));
  const bonus = coinBonus(), value = saleValue(sp,weight);
  $('collectionReward').classList.toggle('hidden',bonus<=bonusBefore);
  $('collectionReward').innerHTML = bonus>bonusBefore
    ? `<strong>${ISLANDS[sp.island].short} index complete!</strong><span>+${ISLAND_COLLECTION_BONUS}% sale coins forever · total +${bonus}%</span>` : '';
  G.score += sp.pts; G.caught++;
  G.caughtAnim=0;
  $('newDiscovery').classList.toggle('hidden',!isNew);
  $('catchLevel').classList.toggle('hidden',level()===oldLevel);
  const unlocked=lockedBefore.filter(i=>hasLicense(i.id));
  $('catchLevel').textContent=level()>oldLevel ? `LEVEL ${level()}!${unlocked.length?' · '+unlocked.map(i=>i.short).join(', ')+' license unlocked':level()===99?' · maximum level reached':lockedBefore.length?' · one step closer to the next island':' · all island licenses unlocked'}`:'';
  const isBest = !G.best || parseFloat(weight) > parseFloat(G.best.weight);
  if(!G.best || parseFloat(weight) > parseFloat(G.best.weight)) G.best = { name:sp.name, weight };
  log.unshift({ sp, weight });
  if(log.length>200) log.length=200;
  bag.push({ sp, weight });
  renderLog(); updateStats(); saveGame();

  $('catchRarity').textContent = sp.rarity.toUpperCase() + ' CATCH';
  $('catchRarity').className = 'modal-eyebrow' + (sp.rarity !== 'common' ? ' ' + sp.rarity : '');
  $('catchIcon').innerHTML = fishSVG(sp);
  $('catchName').textContent = sp.name;
  $('catchWeight').textContent = weight + ' lbs';
  $('catchPoints').innerHTML = '+' + fmt(earnedXP) + ' XP' + (isNew?' · 50% discovery bonus':'') + '<span class="catch-value">WORTH ' + fmt(value) + 'c AT THE MARKET</span>';
  $('catchDesc').textContent = sp.desc;
  catchModal.querySelector('.modal-card').className = 'modal-card ' + sp.rarity;
  catchModal.classList.remove('hidden');
  lockHint.classList.add('hidden');
  setState('caught');
  releasePointer();
  $('continueBtn').focus({preventScroll:true});
  if(RARITY[sp.rarity].tier >= 4) sfx.legendary(); else sfx.caught();
  spawnSplash(bobberPos, 18, 1.1);
  if(isBest && G.caught > 1) showToast('New best — ' + weight + ' lb ' + sp.name + '!');
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
let pCursor = 0;
function spawnSplash(pos, n, spread){
  for(let k=0;k<n;k++){
    const p = pData[pCursor];
    pCursor = (pCursor + 1) % P_MAX;
    p.life = rand(0.35, 0.7);
    p.x = pos.x + rand(-0.2,0.2); p.y = pos.y + 0.1; p.z = pos.z + rand(-0.2,0.2);
    p.vx = rand(-spread, spread); p.vy = rand(1.6, 3.4); p.vz = rand(-spread, spread);
  }
}
function spawnRipple(pos){
  for(const r of ripples){
    if(r.life <= 0){
      r.life = 1;
      r.mesh.visible = true;
      r.mesh.position.set(pos.x, 0.16, pos.z);
      r.mesh.scale.setScalar(0.6);
      r.mesh.material.opacity = 0.85;
      return;
    }
  }
}
function updateParticles(dt){
  for(let i=0;i<P_MAX;i++){
    const p = pData[i];
    if(p.life > 0){
      p.life -= dt;
      p.vy -= 9 * dt;
      p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt;
      const s = Math.max(0, Math.min(0.14, p.life * 0.2));
      D.position.set(p.x, Math.max(0.02, p.y), p.z);
      D.rotation.set(0,0,0);
      D.scale.set(s, s, s);
    } else {
      D.scale.set(0,0,0);
      D.position.set(0, -50, 0);
    }
    D.updateMatrix();
    pMesh.setMatrixAt(i, D.matrix);
  }
  pMesh.instanceMatrix.needsUpdate = true;

  for(const r of ripples){
    if(r.life > 0){
      r.life -= dt * 1.1;
      const s = 1 + (1 - r.life) * 5;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = Math.max(0, r.life) * 0.8;
      if(r.life <= 0) r.mesh.visible = false;
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
  if(kind === 'line') return `MAX FISH ${g.rating} lb · STRAIN ${Math.round((2 - g.strain) * 100)}`;
  const lo = RARITY[RARITY_ORDER[g.lo]].label, hi = RARITY[RARITY_ORDER[g.hi]].label;
  const size = g.minSize ? `SPECIES MAX ${g.minSize}LB+` : 'ANY SPECIES SIZE';
  const weight = g.weightBonus ? `WEIGHT UP TO +${fmt(g.weightBonus * 100)}%` : 'STANDARD WEIGHT';
  return `CATCHES ${lo === hi ? lo : lo + '–' + hi} · ${size} · LUCK +${Math.round(g.luck * 100)}% · ${weight}`;
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
    return `<small class="gear-delta">${p} · +${c}m reach</small>`;
  }
  if(kind === 'line'){
    const d = g.rating - cur.rating;
    return `<small class="gear-delta">${d >= 0 ? '+' : ''}${d} lb rating</small>`;
  }
  const d = Math.round((g.luck - cur.luck) * 100);
  const parts = [];
  const winChanged = g.hi > cur.hi || g.lo > cur.lo;
  if(g.hi > cur.hi) parts.push(`unlocks ${RARITY[RARITY_ORDER[g.hi]].label}`);
  if(g.lo > cur.lo) parts.push(`drops ${RARITY[RARITY_ORDER[g.lo - 1]].label} and below`);
  if(!winChanged && g.minSize > cur.minSize) parts.push(`species max ${g.minSize}lb+`);
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

const bagTotal = () => bag.reduce((a,e) => a + saleValue(e.sp,e.weight),0);

function renderShop(){
  if(!shopOpen) return;
  $('shopCoins').textContent=fmt(G.coins);
  document.querySelector('#shopOverlay .shop-tabs').classList.toggle('hidden',!kitOpen);
  document.querySelectorAll('#shopOverlay .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===shopTab));
  const kind=kitOpen?(shopTab==='lines'?'line':shopTab==='bait'?'bait':'rod'):shopKind;
  const i=ISLANDS[G.zone];
  $('shopTitle').textContent=kitOpen?'Your tackle bag':{rod:'Rod Works',line:'Line & Spool',bait:'Bait Shack'}[kind];
  $('shopEyebrow').textContent=kitOpen?'OWNED GEAR · EQUIP ANYWHERE':i.name.toUpperCase()+' · LOCAL OUTFITTER';
  $('shopNote').textContent=kitOpen?'Switch to any gear you already own. Earlier bait is useful when revisiting old waters.':`Only tiers ${i.id*4+1}–${i.id*4+4} are sold here. Explore new islands for the next four. Prices below are the exact coins charged.`;
  if(kind==='bait')$('shopNote').textContent+=' Luck favors rarer eligible fish; it is not a catch percentage. The small weight boost tapers near each species’ maximum.';
  const items=GEAR[kind].list.map((g,index)=>({g,index})).filter(({index})=>kitOpen?G.owned[kind].includes(index):gearIsland(index)===G.zone);
  shopBody.innerHTML=items.map(({g,index})=>{
    let row=gearRow(kind,g,index);
    if(kind==='bait'){
      const count=eligibleSpecies(G.zone,index).length;
      row=row.replace('</b>','</b><small class="local-pool '+(count?'':'no-bites')+'">'+(count?count+' possible species in '+i.short:'NO BITES IN THESE WATERS')+'</small>');
    }
    return row;
  }).join('');
  if(!kitOpen && G.zone<5)shopBody.innerHTML+=`<div class="next-stock">Next shipment: tiers ${i.id*4+5}–${i.id*4+8} at <b>${ISLANDS[i.id+1].name}</b> · Level ${ISLANDS[i.id+1].level}</div>`;
}
function openShop(kind){
  if(uiBusy()||G.state!=='aim')return;
  const nearest=nearestVendor();
  const wanted=typeof kind==='string'?kind:nearest?.kind;
  if(!GEAR[wanted]||!isNearVendor(wanted)){showToast('Walk up to a rod, line or bait stall first.',true);return;}
  shopKind=wanted;kitOpen=false;shopOpen=true;
  shopOverlay.classList.remove('hidden');shopBtnEl.classList.add('hidden');
  renderShop();ensureAudio();focusPanel('shopClose');
}
function closeShop(){
  if(!shopOpen)return;
  shopOpen=false;kitOpen=false;shopOverlay.classList.add('hidden');resumeWorld();
}

function buyGear(kind, i){
  const g = GEAR[kind]?.list[i];
  if(!g || !Number.isInteger(i) || !shopOpen || G.state !== 'aim') return;
  if(!G.owned[kind].includes(i) && (kitOpen || shopKind !== kind || gearIsland(i) !== G.zone || !hasLicense(G.zone) || !isNearVendor(kind))){
    showToast(`Sold at ${ISLANDS[gearIsland(i)].name}'s ${kind} stall.`,true);return;
  }
  if(G.owned[kind].includes(i)){
    if(G.gear[kind] === i) return;
    G.gear[kind] = i;
    applyGear(); sfx.buy(); showToast('Equipped the ' + g.name + '.');
    saveGame(); updateStats(); renderShop();
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
  applyGear(); updateStats(); saveGame(); sfx.buy(); renderShop();
  showToast('Bought the ' + g.name + '!');
}
function applyGear(){
  const r = RODS[G.gear.rod] || RODS[0];
  rodMat.color.setHex(r.color);
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
  const body = $('marketBody');
  if(!bag.length){
    body.innerHTML = '<p class="shop-empty">Your catch bag is empty.<br>Catch something, then bring it here.</p>';
    return;
  }
  body.innerHTML =
    `<div class="bag-total"><span>${bag.length} fish in the bag</span><span>${fmt(bagTotal())}c</span></div>` +
    bag.map((e, i) => `<div class="sell-row">
      <div class="e">${fishSVG(e.sp)}</div>
      <div><b>${e.sp.name}</b><small>${e.weight} lbs · ${RARITY[e.sp.rarity].label}</small></div>
      <div class="val">${fmt(saleValue(e.sp,e.weight))}c</div>
      <button class="buy-btn" data-sell="${i}">Sell</button>
    </div>`).join('') +
    `<button class="sell-all" id="sellAll">SELL ALL · ${fmt(bagTotal())}c</button>`;
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
  resumeWorld();
}
function sellFish(i){
  if(!marketOpen || !isNearVendor('market') || !Number.isInteger(i))return;
  const e = bag[i];
  if(!e) return;
  const v = saleValue(e.sp,e.weight);
  bag.splice(i, 1);
  G.coins += v;
  sfx.coin(); updateStats(); saveGame(); renderMarket();
  showToast('+' + fmt(v) + ' coins');
}
function sellAll(){
  if(!marketOpen || !isNearVendor('market') || !bag.length) return;
  const total = bagTotal();
  G.coins += total;
  bag.length = 0;
  sfx.coin(); updateStats(); saveGame(); renderMarket();
  showToast('Sold the lot for ' + fmt(total) + ' coins!');
}

// ---------- Island vendors, field guide and voyages ----------
function nearestVendor(){
  let closest=null, distance=6.3;
  for(const s of world.stalls){
    if(s.zone!==G.zone)continue;
    const d=Math.hypot(G.px-s.x,G.pz-s.z);
    if(d<distance){distance=d;closest=s;}
  }
  return closest;
}
function isNearVendor(kind){
  return world.stalls.some(s=>s.zone===G.zone&&s.kind===kind&&Math.hypot(G.px-s.x,G.pz-s.z)<6.3);
}
function clearInput(){
  clearKeys(); G.reelHeld=false;
  stick.active=false;stick.x=stick.y=0;stick.id=-1;stickKnob.style.transform='';
  dragging=false; fishingPointer=null;
}
function focusPanel(id){
  clearInput(); releasePointer(); hidePrompt(); lockHint.classList.add('hidden');
  requestAnimationFrame(()=>$(id).focus({preventScroll:true}));
}
function resumeWorld(){
  clearInput();
  if(document.activeElement?.tagName==='BUTTON')document.activeElement.blur();
  if(G.state==='aim')setState('aim');
  updateLockHint();
}
function openKit(){
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Finish your cast before opening the tackle bag.');return;}
  kitOpen=true;shopOpen=true;
  shopOverlay.classList.remove('hidden');renderShop();focusPanel('shopClose');
}

function unknownFishSVG(){
  return '<svg viewBox="0 0 64 40" role="img" aria-label="Undiscovered fish" shape-rendering="crispEdges"><path d="M8 14h8v-4h24v4h8v4h4V8h8v24h-8V22h-4v6h-8v4H16v-4H8v-4H4v-6h4z" fill="#13282d"/></svg>';
}
function openIndex(){
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Land this catch first, then open the index.');return;}
  indexOpen=true;$('indexOverlay').classList.remove('hidden');renderIndex();focusPanel('indexClose');
}
function closeIndex(){indexOpen=false;$('indexOverlay').classList.add('hidden');resumeWorld();}
function renderIndex(){
  const found=Object.keys(G.discoveries).length;
  const collections=islandCollectionProgress(G.discoveries), bonus=coinBonus();
  $('collectionTotal').textContent=`${found} / 120`;
  $('collectionFill').style.width=(found/120*100)+'%';
  $('indexIslands').innerHTML=[{id:-1,short:'All waters'},...ISLANDS].map(i=>{
    const complete=collections[i.id]?.complete;
    return `<button class="island-filter ${i.id===indexIsland?'active':''} ${complete?'complete':''}" data-index-island="${i.id}" aria-label="${i.short}${complete?', index complete, +'+ISLAND_COLLECTION_BONUS+'% coin bonus earned':''}">${i.short}${complete?' <span aria-hidden="true">✓</span>':''}</button>`;
  }).join('');
  const local=collections[indexIsland];
  $('collectionBonus').classList.toggle('earned',local?local.complete:bonus>0);
  $('collectionBonusTitle').textContent=local
    ? local.complete?`${ISLANDS[indexIsland].short} complete · +${ISLAND_COLLECTION_BONUS}% earned`:`${ISLANDS[indexIsland].short} · ${local.found}/${local.total} discovered`
    : `Permanent coin bonus: +${bonus}%`;
  $('collectionBonusDetail').textContent=local
    ? local.complete?`Total +${bonus}% on all fish sales, at every market.`:`Find all ${local.total} for permanent +${ISLAND_COLLECTION_BONUS}% sale coins · current total +${bonus}%.`
    : `${collections.filter(p=>p.complete).length}/${ISLANDS.length} islands completed · +${ISLAND_COLLECTION_BONUS}% each · applies at every market.`;
  const pool=sortFishIndex(SPECIES.filter(sp=>indexIsland<0||sp.island===indexIsland));
  const filter=$('indexFilter').value;
  const list=pool.filter(sp=>filter==='all'||(filter==='found'?!!G.discoveries[sp.id]:!G.discoveries[sp.id]));
  const count=pool.filter(sp=>G.discoveries[sp.id]).length;
  $('indexIslandCount').textContent=`${count} / ${pool.length} in these waters`;
  $('indexHint').textContent=indexIsland<0?'By island, then rarity · common → mythic.':ISLANDS[indexIsland].short+' · common → mythic.';
  $('fishGrid').innerHTML=list.length?list.map(sp=>{
    const r=G.discoveries[sp.id];
    // Unknown entries contain no species name, color, rarity, description,
    // title or accessible label. There is nothing for CSS/hover to reveal.
    if(!r)return `<article class="fish-entry undiscovered"><div class="entry-top"><span>#${String(sp.number).padStart(3,'0')}</span><span>UNDISCOVERED</span></div><div class="entry-fish">${unknownFishSVG()}</div><h3>???</h3><p>${ISLANDS[sp.island].short}</p><div class="entry-record">NOT YET CAUGHT</div></article>`;
    return `<details class="fish-entry discovered ${sp.rarity}"><summary><div class="entry-top"><span>#${String(sp.number).padStart(3,'0')}</span><span class="rarity-label ${sp.rarity}">${RARITY[sp.rarity].label}</span></div><div class="entry-fish">${fishSVG(sp)}</div><h3>${sp.name}</h3><p>${ISLANDS[sp.island].short}</p><div class="entry-record">BEST ${Number(r.best).toFixed(1)} LB <span>×${fmt(r.count)}</span></div></summary><p class="entry-lore">${sp.desc}<br><b>${sp.minW}–${sp.maxW} lb</b> · ${r.first?'First caught '+r.first:'From your earlier adventures'}</p></details>`;
  }).join(''):'<p class="empty">No entries in this filter yet. There is a whole sea to explore.</p>';
}

// Hand-drawn with square tiles, just like the world. No image assets required.
const CHART_POINTS=[[23,80],[28,61],[67,67],[47,43],[77,29],[51,15]];
function islandGlyph(i){
  const c=i.color;
  let landmark='';
  if(i.theme==='harbor')landmark='<rect x="38" y="18" width="12" height="39" fill="#f4e8ce"/><rect x="38" y="28" width="12" height="8" fill="#c77f6b"/><rect x="35" y="16" width="18" height="6" fill="#375e67"/><rect x="40" y="10" width="8" height="6" fill="#f1c976"/>';
  if(i.theme==='forest')landmark='<path d="M29 18h18v9h8v10H21V27h8zm25 9h14v9h6v9H48v-9h6" fill="#255f50"/><path d="M35 37h7v20h-7zm23 8h7v14h-7z" fill="#9e805b"/>';
  if(i.theme==='tropical')landmark='<path d="M29 28h7v29h-7zm29 0h7v29h-7z" fill="#ead4a2"/><rect x="28" y="21" width="38" height="9" fill="#f4dfb0"/><path d="M72 23h5v27h-5zM60 20h30v5H60z" fill="#467e68"/>';
  if(i.theme==='ice')landmark='<path d="M28 48V30h9V18h13V9h11v24h8v21z" fill="#d6edf2"/><path d="M52 54V34h11V22h9v32z" fill="#a2cedf"/>';
  if(i.theme==='volcanic')landmark='<path d="M23 54V42h8V30h8V19h22v11h9v12h9v12z" fill="#53566b"/><path d="M44 21h13v10h5v10h-7V31H44z" fill="#f3aa70"/>';
  if(i.theme==='lunar')landmark='<path d="M27 54V22h10v32zm36 0V22h10v32zM27 14h46v10H27z" fill="#c3b8e2"/><rect x="45" y="29" width="11" height="11" fill="#e8e1ff"/>';
  return `<svg viewBox="0 0 100 78" aria-hidden="true" shape-rendering="crispEdges"><path d="M8 53h12v-7h62v8h10v15H79v6H23v-6H8z" fill="#b5cbb6"/><path d="M14 48h11v-7h52v7h10v16H74v5H26v-6H14z" fill="${c}"/>${landmark}<path d="M50 64h6v14h-6z" fill="#dfc49b"/></svg>`;
}
function openChart(fleet=false){
  if(uiBusy()||G.state!=='aim'){if(G.state!=='aim')showToast('Finish fishing before planning a voyage.');return;}
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
  $('chartFooter').innerHTML=`<span>${atDock?'AT THE DOCK · '+ISLANDS[G.zone].name:'CHART ONLY · Visit a Boat Shop to buy or sail'}</span><span>${BOATS[G.boat].name} · Level ${level()}</span>`;
  const points=CHART_POINTS.map(p=>p.join(',')).join(' ');
  $('seaChart').innerHTML=`<div class="chart-caption"><b>THE SIX ISLES</b><span>CHART No. 001 · NOT TO SCALE</span></div><svg class="chart-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="#a9c3bc" stroke-width=".35" stroke-dasharray="1.4 1.4"/></svg><span class="chart-north">N<br>↑</span><span class="chart-ocean">THE WANDERING SEA</span>`+
    ISLANDS.map(i=>`<button class="map-island ${!hasLicense(i.id)?'locked':''} ${i.id===G.zone?'current':''} ${selectedIsland===i.id?'selected':''}" style="left:${CHART_POINTS[i.id][0]}%;top:${CHART_POINTS[i.id][1]}%" data-destination="${i.id}" aria-label="${i.name}, level ${i.level}${i.id===G.zone?', current island':''}">${islandGlyph(i)}<b>${i.short}</b><span>${i.id===G.zone?'YOU ARE HERE':!hasLicense(i.id)?'LOCKED · LV '+i.level:G.visited.includes(i.id)?'VISITED':'LICENSE READY'}</span></button>`).join('');
  const i=ISLANDS[selectedIsland],requirement=travelRequirement(i.id,G.xp,G.boat,G.licenses),here=i.id===G.zone;
  const reason=here?'You are already here.':requirement||(!atDock?'Walk to a Boat Shop to depart.':'');
  const discovered=SPECIES.filter(s=>s.island===i.id&&G.discoveries[s.id]).length;
  $('destinationDetail').innerHTML=`<div class="destination-art" style="--island-color:${i.color}">${islandGlyph(i)}<span>ISLAND 0${i.id+1}</span></div><div class="destination-copy"><span class="eyebrow">LEVEL ${i.level} LICENSE${hasLicense(i.id)&&level()<i.level?' · RETAINED':''}</span><h3>${i.name}</h3><p>${i.description}</p><dl><div><dt>LOCAL GEAR</dt><dd>Tiers ${i.id*4+1}–${i.id*4+4}</dd></div><div><dt>FIELD GUIDE</dt><dd>${discovered} / 20 discovered</dd></div><div><dt>LANDMARK</dt><dd>${i.landmark}</dd></div></dl><p class="destination-requirement ${reason&&!here?'blocked':''}">${reason||'License ready. Boat ready. Let’s cast off.'}</p><button id="sailBtn" class="primary-btn" ${reason?'disabled':''}>${here?'Current island':'Sail to '+i.short+' →'}</button>${requirement&&hasLicense(i.id)?'<button id="viewBoats" class="text-btn">Find a seaworthy boat →</button>':''}</div>`;
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
    const reason=equipped?'IN USE':!atDock?'VISIT A BOAT SHOP':!hasLicense(b.range)?`LEVEL ${b.level} REQUIRED`:!owned&&G.coins<b.cost?`NEED ${fmt(b.cost-G.coins)}c MORE`:'';
    return `<article class="boat-card ${equipped?'equipped':''}"><div class="boat-art">${boatSVG(b)}<span>CLASS 0${b.id+1}</span></div><div class="boat-copy"><span class="eyebrow">${b.id===0?'HOME WATERS':'UP TO '+ISLANDS[b.range].short.toUpperCase()}</span><h3>${b.name}</h3><p>${b.description}</p><div class="boat-specs"><span>LEVEL ${b.level}${hasLicense(b.range)&&level()<b.level?' · RETAINED':''}</span><span>${b.cost?fmt(b.cost)+'c':'FREE'}</span><span>${b.speed} KNOTS</span></div><button class="buy-btn ${owned?'equip':''}" data-boat="${b.id}" ${reason?'disabled':''}>${reason|| (owned?'Launch this boat':fmt(b.cost)+'c · BUY BOAT')}</button></div></article>`;
  }).join('');
}
function buyBoat(id){
  const b=BOATS[id];
  if(!b||!chartOpen||!isNearVendor('port')||G.state!=='aim')return;
  if(!hasLicense(b.range)){showToast(`This boat requires level ${b.level}.`,true);return;}
  if(!G.ownedBoats.includes(id)){
    if(G.coins<b.cost){showToast(`You need ${fmt(b.cost-G.coins)} more coins.`,true);return;}
    G.coins-=b.cost;G.ownedBoats.push(id);
  }
  G.boat=id;world.setBoat(id);sfx.buy();saveGame();updateStats();renderChart();showToast(b.name+' ready at the dock.');
}
function sailTo(target){
  if(!Number.isInteger(target)||!ISLANDS[target]||target===G.zone||G.state!=='aim'||!chartOpen)return false;
  const reason=travelRequirement(target,G.xp,G.boat,G.licenses);
  if(reason||!isNearVendor('port')){showToast(reason||'Depart from a Boat Shop.',true);return false;}
  const curve=world.route(G.zone,target);
  if(!curve){showToast('No clear sailing route. Try another destination.',true);return false;}
  const duration=clamp(curve.getLength()/BOATS[G.boat].speed,4,11);
  closeChart();clearInput();
  voyage={from:G.zone,to:target,t:0,duration,curve};
  setState('voyage');hidePrompt();rodRig.visible=false;aimMarker.visible=false;
  $('app').classList.add('voyaging');$('voyageHUD').classList.remove('hidden');
  $('voyageName').textContent=ISLANDS[target].name;
  $('voyageDetail').textContent=`${ISLANDS[G.zone].short} → ${ISLANDS[target].short} · aboard the ${BOATS[G.boat].name}`;
  $('voyageFill').style.width='0%';lockHint.classList.add('hidden');
  sfx.splash();return true;
}
function tickVoyage(dt){
  if(!voyage)return;
  voyage.t=Math.min(1,voyage.t+dt/voyage.duration);
  const p=voyage.curve.getPointAt(voyage.t),direction=voyage.curve.getTangentAt(voyage.t).normalize();
  const ship=world.boat;
  ship.position.copy(p);ship.position.y=.1+Math.sin(G.time*2)*.08;
  ship.rotation.set(0,Math.atan2(-direction.x,-direction.z),Math.sin(G.time*1.4)*.025);
  camera.position.copy(p).addScaledVector(direction,-10);camera.position.y=6;
  camera.lookAt(p.clone().addScaledVector(direction,10).add(new THREE.Vector3(0,1.5,0)));
  $('voyageFill').style.width=(voyage.t*100)+'%';
  if(Math.random()<dt*8)spawnSplash(p.clone().addScaledVector(direction,-3),2,.7);
  if(voyage.t>=1)finishVoyage();
}
function spawnAtIsland(id){
  const i=ISLANDS[id];G.zone=id;G.px=i.x;G.pz=i.z+4;
  G.yaw=0.35;G.pitch=-.1;G.camY=1.15+EYE;
  camera.position.set(G.px,G.camY,G.pz);camera.rotation.set(G.pitch,G.yaw,0,'YXZ');
  nearbyStall=null;G.nearShop=G.nearMarket=G.nearPort=false;
}
function finishVoyage(){
  if(!voyage)return;
  const id=voyage.to;voyage=null;
  spawnAtIsland(id);if(!G.visited.includes(id))G.visited.push(id);
  rodRig.visible=true;$('app').classList.remove('voyaging');$('voyageHUD').classList.add('hidden');
  setState('aim');saveGame();updateStats();updateLockHint();
  $('arrivalName').textContent=ISLANDS[id].name;$('arrivalDesc').textContent=ISLANDS[id].tagline;
  $('arrivalBanner').classList.remove('hidden');clearTimeout(finishVoyage._t);
  finishVoyage._t=setTimeout(()=>$('arrivalBanner').classList.add('hidden'),3400);
  if(!eligibleSpecies(id,G.gear.bait).length)showToast('New waters need different bait. Open your tackle bag (I) or visit the Bait Shack.',true);
  else showToast('Land ahoy! Turn around to explore the village.');
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
  const show = !pointerLocked && supportsLock && !lockFallback && G.state !== 'menu'
    && !G.thirdPerson && !heldCatch && !uiBusy() && !voyage && catchModal.classList.contains('hidden');
  lockHint.classList.toggle('hidden', !show);
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
  if(!pointerLocked) return;
  const now = performance.now();
  if(now - lockTime < 180) return;                 // skip the jump on lock
  if(now - lastButtonT < 130) return;              // browsers warp the pointer on click
  applyLook(clamp(e.movementX, -45, 45) * SENS, clamp(e.movementY, -45, 45) * SENS);
});
canvas.addEventListener('pointermove', e => {
  if(uiBusy() || voyage || pointerLocked || !dragging || fishingPointer!==e.pointerId)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;
  touchDrag+=Math.hypot(dx,dy);lastX=e.clientX;lastY=e.clientY;
  applyLook(dx*(e.pointerType==='mouse'?.004:.005),dy*(e.pointerType==='mouse'?.004:.005));
  if(touchDrag>12&&G.state==='charging')setState('aim');
},{passive:true});
canvas.addEventListener('pointerdown', e => {
  if(uiBusy()||voyage||e.button>0)return;
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
  if(uiBusy() || voyage) return;
  if(G.state === 'aim') startCharge();
  else if(G.state === 'bite') hookFish();
  else if(G.state === 'waiting') reelInEarly();
  else if(G.state === 'reeling') G.reelHeld = true;
}
function handleRelease(){
  if(uiBusy() || voyage) return;
  if(G.state === 'charging') releaseCast();
  else if(G.state === 'reeling') G.reelHeld = false;
}
addEventListener('keydown', e => {
  if(e.code==='Escape'){
    if(fishBagOpen){closeFishBag();return;}
    if(shopOpen){closeShop();return;}
    if(marketOpen){closeMarket();resumeWorld();return;}
    if(chartOpen){closeChart();return;}
    if(indexOpen){closeIndex();return;}
    if(drawerOpen){logDrawer.classList.add('hidden');drawerOpen=false;resumeWorld();return;}
  }
  if(e.code==='Tab'&&uiBusy()){
    const panel=fishBagOpen?$('fishBagOverlay'):shopOpen?shopOverlay:marketOpen?marketOverlayEl:chartOpen?$('chartOverlay'):indexOpen?$('indexOverlay'):logDrawer;
    const focusable=Array.from(panel.querySelectorAll('button:not(:disabled),select,summary')).filter(n=>n.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}
    else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}
    return;
  }
  if(e.code==='KeyM'&&!e.repeat){if(chartOpen)closeChart();else openChart();return;}
  if(e.code==='KeyF'&&!e.repeat){if(indexOpen)closeIndex();else openIndex();return;}
  if(e.code==='KeyI'&&!e.repeat){if(kitOpen)closeShop();else openKit();return;}
  if(e.code==='KeyB'&&!e.repeat){e.preventDefault();if(fishBagOpen)closeFishBag();else openFishBag();return;}
  if(e.code==='KeyV'&&!e.repeat){e.preventDefault();toggleView();return;}
  if(e.code==='KeyX'&&!e.repeat){if(G.state==='aim'&&!uiBusy()&&!voyage)stowFish();return;}
  if(e.code==='KeyE'&&!e.repeat&&G.state==='aim'){
    if(shopOpen)closeShop();
    else if(marketOpen)closeMarket();
    else if(chartOpen)closeChart();
    else if(!uiBusy()){
      const st=nearestVendor();
      if(st?.kind==='port')openChart();
      else if(st?.kind==='market')openMarket();
      else if(st)openShop(st.kind);
      else showToast('No stall nearby. Follow the village paths.');
    }
    return;
  }
  if(uiBusy()||voyage)return;
  if(setKey(e.code,true))e.preventDefault();
  if(e.code==='Space'){
    e.preventDefault();if(e.repeat||document.activeElement?.tagName==='BUTTON')return;
    handlePress();
  }
  if((e.code==='Enter'||e.code==='NumpadEnter')&&G.state==='caught')$('continueBtn').click();
});
addEventListener('keyup', e=>{
  setKey(e.code,false);
  if(e.code==='Space'&&!uiBusy()&&!voyage)handleRelease();
});
addEventListener('blur',()=>{clearInput();if(G.state==='charging')setState('aim');});

// ---------- UI wiring ----------
$('startArt').innerHTML = ICON.startArt;
$('soundBtn').innerHTML = ICON.soundOn;

$('startBtn').addEventListener('click', () => {
  ensureAudio();
  $('startOverlay').classList.add('hidden');
  G.yaw = .35; G.pitch = -.10;
  applyGear();
  setState('aim');
  requestLock();
  $('startBtn').blur();
  showToast('Welcome to '+ISLANDS[G.zone].name+'! Turn around for shops; M opens the sea chart.');
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
  if(!open){releasePointer();$('closeLog').focus();}
  updateLockHint();
});
$('closeLog').addEventListener('click', () => { logDrawer.classList.add('hidden'); drawerOpen = false; resumeWorld(); });

// ---- shop wiring ----
shopBtnEl.addEventListener('click', openShop);
$('shopClose').addEventListener('click', closeShop);
shopOverlay.addEventListener('click', e => { if(e.target === shopOverlay) closeShop(); });
document.querySelectorAll('#shopOverlay .tab').forEach(t => t.addEventListener('click', () => {
  shopTab = t.dataset.tab;
  renderShop();
}));
shopBody.addEventListener('click', e => {
  const buy = e.target.closest('[data-buy]');
  if(!buy) return;
  const kind = shopTab === 'lines' ? 'line' : shopTab === 'bait' ? 'bait' : 'rod';
  buyGear(kitOpen?kind:shopKind, +buy.dataset.buy);
});
marketBtnEl.addEventListener('click', openMarket);
$('marketClose').addEventListener('click', closeMarket);
marketOverlayEl.addEventListener('click', e => { if(e.target === marketOverlayEl) closeMarket(); });
marketBody.addEventListener('click', e => {
  const one = e.target.closest('[data-sell]');
  if(one){ sellFish(+one.dataset.sell); return; }
  if(e.target.closest('#sellAll')) sellAll();
});

// ---- archipelago UI ----
$('mapBtn').addEventListener('click',()=>openChart());
$('portBtn').addEventListener('click',()=>openChart());
$('chartClose').addEventListener('click',closeChart);
$('chartOverlay').addEventListener('click',e=>{if(e.target===$('chartOverlay'))closeChart();});
$('destinationsTab').addEventListener('click',()=>{fleetTab=false;renderChart();});
$('boatsTab').addEventListener('click',()=>{fleetTab=true;renderChart();});
$('seaChart').addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(b){selectedIsland=Number(b.dataset.destination);renderChart();}});
$('destinationDetail').addEventListener('click',e=>{
  if(e.target.closest('#sailBtn'))sailTo(selectedIsland);
  if(e.target.closest('#viewBoats')){fleetTab=true;renderChart();}
});
$('fleetView').addEventListener('click',e=>{const b=e.target.closest('[data-boat]');if(b)buyBoat(Number(b.dataset.boat));});
$('skipVoyage').addEventListener('click',finishVoyage);
$('indexBtn').addEventListener('click',openIndex);
$('indexClose').addEventListener('click',closeIndex);
$('indexOverlay').addEventListener('click',e=>{if(e.target===$('indexOverlay'))closeIndex();});
$('indexIslands').addEventListener('click',e=>{const b=e.target.closest('[data-index-island]');if(b){indexIsland=Number(b.dataset.indexIsland);renderIndex();$('fishGrid').scrollTop=0;}});
$('indexFilter').addEventListener('change',renderIndex);
$('kitBtn').addEventListener('click',openKit);
$('bagBtn').addEventListener('click',openFishBag);
$('fishBagClose').addEventListener('click',closeFishBag);
$('fishBagOverlay').addEventListener('click',e=>{if(e.target===$('fishBagOverlay'))closeFishBag();});
$('fishBagBody').addEventListener('click',e=>{const b=e.target.closest('[data-hold-fish]');if(b)holdFish(Number(b.dataset.holdFish));});
$('viewBtn').addEventListener('click',toggleView);
$('putAwayBtn').addEventListener('click',()=>{if(G.state==='aim'&&!uiBusy()&&!voyage)stowFish();});

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
  stowFish();G.thirdPerson=false;
  const fresh=normalizeSave({version:SAVE_VERSION});const {bag:emptyBag,log:emptyLog,...state}=fresh;
  Object.assign(G,state);bag.length=0;log.length=0;G.castPower=0.5;G.power=0;
  logDrawer.classList.add('hidden');drawerOpen=false;world.setBoat(0);spawnAtIsland(0);
  applyGear();renderLog();saveGame();resumeWorld();showToast('A fresh adventure. Tight lines!');
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Adaptive quality ----------
let perfFrames = 0, perfTime = 0, perfChecked = 0;
function checkPerformance(dt){
  if(perfChecked >= 2) return;
  perfFrames++; perfTime += dt;
  if(perfFrames < 70) return;
  const fps = perfFrames / perfTime;
  if(perfChecked === 0){
    if(fps < 50) renderer.setPixelRatio(1);
    if(fps < 32) renderer.setPixelRatio(0.75);
    perfChecked = 1;
  } else {
    if(fps < 30) renderer.setPixelRatio(0.6);
    perfChecked = 2;
  }
  perfFrames = 0; perfTime = 0;
}

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
  G.time += dt;
  checkPerformance(rawDt);

  // camera look
  camera.rotation.y = G.yaw;
  camera.rotation.x = G.pitch;

  // ---- walking ----
  let mf = 0, ms = 0;
  if(G.state === 'aim' && !uiBusy() && !voyage){
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
    if(walkable(G.px + dx, G.pz + dz)){ G.px += dx; G.pz += dz; }
    else if(walkable(G.px + dx, G.pz)){ G.px += dx; }
    else if(walkable(G.px, G.pz + dz)){ G.pz += dz; }
    G.bob += dt * 11;
    G.walked += spd;
    if(G.walked > 2.6){ G.walked = 0; sfx.step(); }
    if(G.state === 'aim') hidePrompt();
  }
  const gY = groundAt(G.px, G.pz);
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
  shopBtnEl.classList.toggle('hidden',!idle||!G.nearShop);
  marketBtnEl.classList.toggle('hidden',!idle||!G.nearMarket);
  $('portBtn').classList.toggle('hidden',!idle||nearbyStall?.kind!=='port');
  if(idle&&G.nearShop)shopBtnEl.innerHTML=nearbyStall.name+' <b>E</b>';
  stickEl.classList.toggle('hidden',!(isTouch&&idle));
  if(voyage)tickVoyage(dt);

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

  // ---- reeling minigame ----
  // Green band = the line does the work, it winds in by itself. Yellow on either
  // side = nothing happens, the fish just sits there. Red at the far ends = gone.
  // The needle is deliberately twitchy: surges, random yanks and constant wobble.
  if(G.state === 'reeling'){
    const r2 = RODS[G.gear.rod], l2 = LINES[G.gear.line];

    // surges: the fish bolts
    G.surgeTimer -= dt;
    if(G.surgeTimer <= 0){ G.surgeTimer = rand(0.6, 1.5); G.surgeDur = rand(0.35, 1.0); }
    if(G.surgeDur > 0) G.surgeDur -= dt;
    const surging = G.surgeDur > 0;

    // yanks: short violent jerks in either direction
    G.yankTimer = (G.yankTimer || 0) - dt;
    if(G.yankTimer <= 0){
      G.yankTimer = rand(0.30, 1.00);
      G.yank = (Math.random() < 0.5 ? -1 : 1) * rand(45, 115);
      G.yankDur = 0.12;
    }
    if(G.yankDur > 0) G.yankDur -= dt;

    const base = 12 + G.fishStrength * 18;              // 15..43 per second
    const rise = base * G.rateMul * rand(0.86, 1.16) * (surging ? 1.9 : 1);
    const fall = 24 * (0.7 + 0.3 * G.rateMul) * rand(0.88, 1.14);
    let rate = G.reelHeld ? rise : -fall;
    rate += rand(-1, 1) * (26 + G.fishStrength * 34);   // the lake is never still
    if(G.yankDur > 0) rate += G.yank;

    G.tension = clamp(G.tension + rate * dt, 0, 100);
    const inSafe = G.tension >= G.bandLo && G.tension <= G.bandHi;

    // Green progress depends on reel speed only, NEVER cast charge or distance.
    if(inSafe){
      G.progress += dt * 20 * 0.85 * r2.reel;
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
    progressFill.style.width = G.progress + '%';
    reelPct.textContent = Math.floor(G.progress) + '%';

    const track = $('tensionTrack');
    track.classList.toggle('danger', G.tension > G.bandHi);
    track.classList.toggle('slack', G.tension < G.bandLo);
    reelWarn.textContent =
      G.over > 0.25 ? 'LINE OVERLOADED — ' + Math.round(G.fishWeight) + 'lb ON ' + l2.rating + 'lb LINE' :
      G.tension > G.bandHi ? 'TOO TIGHT — RELEASE TO LOWER IT' :
      G.tension < G.bandLo ? 'TOO SLACK — HOLD TO RAISE IT' :
      surging ? "IT'S SURGING — STAY ON IT" : 'WINDING IN';
    reelWarn.classList.toggle('warn', !!reelWarn.textContent);

    if(hookedFish){
      hookedFish.position.set(
        bobberPos.x + Math.sin(G.time*9) * 0.25,
        -0.55 + Math.sin(G.time * 12) * 0.25,
        bobberPos.z
      );
      hookedFish.rotation.y = G.time * 2.4;
      hookedFish.rotation.z = Math.sin(G.time * 14) * 0.35;
      hookedFish.userData.tail.rotation.y = Math.sin(G.time * 18) * 0.6;
      const toCamX = camera.position.x - bobberPos.x, toCamZ = camera.position.z - bobberPos.z;
      const d = Math.hypot(toCamX, toCamZ);
      if(d > 2.5){
        bobberPos.x += (toCamX / d) * dt * (G.reelHeld ? 1.8 : 0.35);
        bobberPos.z += (toCamZ / d) * dt * (G.reelHeld ? 1.8 : 0.35);
      }
      if(Math.random() < dt * 2.5) spawnSplash(bobberPos, 2, 0.4);
    }
  } else {
    if(reelWarn.textContent){ reelWarn.textContent = ''; reelWarn.classList.remove('warn'); }
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

  world.update(G.time, dt, G.zone, activeCamera(), voyage);
  updateParticles(dt);
  renderer.render(scene, activeCamera());
}

// ---------- boot ----------
loadGame();
spawnAtIsland(G.zone);
world.setBoat(G.boat);
applyGear();
updateStats();
renderLog();
setRodDir(DIR_IDLE);
setState('menu');
promptEl.style.display = 'none';
animate();

// Compatibility handle plus a name that matches the current title.
window.__reelDeal = window.__reelLife = {
  G, SPECIES, RODS, LINES, BAITS, ISLANDS, BOATS, RARITY, RARITY_ORDER,
  renderer, scene, camera, world, bobber, bobberPos, water, rodRig, aimMarker, bag,
  get shopOpen(){return shopOpen;},get chartOpen(){return chartOpen;},get indexOpen(){return indexOpen;},get voyage(){return voyage;},
  get fishBagOpen(){return fishBagOpen;},get heldCatch(){return heldCatch;},get carriedModel(){return carriedModel;},
  playerModel,frontCamera,heldFishRig,activeCamera,activeRodTip,toggleView,openFishBag,closeFishBag,holdFish,stowFish,renderFishBag,updatePlayerView,
  openShop,closeShop,openKit,openMarket,closeMarket,buyGear,sellAll,sellFish,
  openChart,closeChart,renderChart,buyBoat,sailTo,finishVoyage,openIndex,closeIndex,renderIndex,
  renderShop,renderMarket,fightSetup,pickSpecies,paintTensionBand,eligibleSpecies,
  updateStats,fishValue,rollWeight,catchXP,xpForLevel,level,hasLicense,saveGame,levelProgress,
  castLuckModifier,effectiveLuck,updateCastMeter,
  saleValue,bagTotal,collectionCoinBonus,islandCollectionProgress,fishSaleValue,sortFishIndex,
  walkable,groundAt,landBobber,triggerBite,hookFish,catchFish,SHOP_POS,MARKET_POS,
  startCharge,releaseCast,landingPoint,inWater,spawnAtIsland,nearestVendor
};
