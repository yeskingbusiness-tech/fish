import * as THREE from 'three';

// ============================================================
//  REEL LIFE 3D — blocky first-person fishing
//  Everything is built from boxes, one shared geometry,
//  Lambert materials, no shadow pass, instanced clutter.
// ============================================================

const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp  = (a,b,t) => a + (b-a) * t;
const rand  = (a,b) => a + Math.random() * (b-a);
const hexc  = c => '#' + c.toString(16).padStart(6,'0');

// ---------- Species ----------
const SPECIES = [
  { name:'Bluegill',        color:0x4a90d9, belly:0xbfe3ff, size:0.55, minW:0.3, maxW:1.4,  pts:10,  rarity:'common',    weight:26, strength:0.22, pattern:'none',     desc:'A scrappy little panfish. Every angler starts here.' },
  { name:'Yellow Perch',    color:0xf6c945, belly:0xfff3b0, size:0.6,  minW:0.4, maxW:1.8,  pts:15,  rarity:'common',    weight:22, strength:0.28, pattern:'stripes',  desc:'Golden stripes and a feisty fight on light tackle.' },
  { name:'Largemouth Bass', color:0x3d9970, belly:0xd8f3dc, size:0.85, minW:1.0, maxW:5.5,  pts:30,  rarity:'common',    weight:20, strength:0.45, pattern:'spots',    desc:'The king of the pond. Hits hard and runs deep.' },
  { name:'Rainbow Trout',   color:0xff8fab, belly:0xffe5ec, size:0.7,  minW:0.8, maxW:4.0,  pts:40,  rarity:'uncommon',  weight:13, strength:0.5,  pattern:'rainbow',  desc:'A rainbow flash beneath the surface. Acrobatic and quick.' },
  { name:'Channel Catfish', color:0x5d6d7e, belly:0xd6dbdf, size:1.0,  minW:2.0, maxW:9.0,  pts:55,  rarity:'uncommon',  weight:10, strength:0.62, pattern:'whiskers', desc:'A whiskered heavyweight that pulls like a truck.' },
  { name:'Golden Koi',      color:0xffb703, belly:0xfff3b0, size:0.8,  minW:1.5, maxW:6.0,  pts:120, rarity:'rare',      weight:6,  strength:0.55, pattern:'patches',  desc:'Shimmering gold in the shallows. A true prize catch!' },
  { name:'Ancient Carp',    color:0x9b5de5, belly:0xe0aaff, size:1.25, minW:5.0, maxW:18.0, pts:250, rarity:'legendary', weight:3,  strength:0.85, pattern:'scales',   desc:'The old giant of the lake. Legends say it has outsmarted a hundred anglers.' },
];
// ---------- Rods (shop) ----------
const RODS = [
  { id:'bamboo',     name:'Bamboo Pole',    cost:0,    color:0xc98a4b, cast:15, tension:1.15, reel:0.85, blurb:'Humble and whippy. Every legend starts here.' },
  { id:'fiberglass', name:'Fiberglass Rod', cost:160,  color:0x69c8db, cast:18, tension:1.00, reel:1.00, blurb:'Balanced all-rounder for the everyday angler.' },
  { id:'carbon',     name:'Carbon Rod',     cost:480,  color:0x3a424e, cast:21, tension:0.88, reel:1.15, blurb:'Light, stiff and quick to tame a stubborn fish.' },
  { id:'pro',        name:'Pro Carbon',     cost:1200, color:0xffb703, cast:24, tension:0.78, reel:1.32, blurb:'Tournament grade. Holds tension like a dream.' },
  { id:'mythril',    name:'Mythril Rod',    cost:3000, color:0x9b5de5, cast:27, tension:0.68, reel:1.50, blurb:'Lake legend. The old carp knows this rod by name.' },
];
function fishValue(sp, weight){
  return Math.max(6, Math.round(sp.pts * (0.75 + weight / sp.maxW) * 2.4));
}

function pickSpecies(){
  const total = SPECIES.reduce((s,x)=>s+x.weight,0);
  let r = Math.random()*total;
  for(const s of SPECIES){ r -= s.weight; if(r <= 0) return s; }
  return SPECIES[0];
}

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
scene.fog = new THREE.Fog(0x9fe0f5, 45, 150);

const PORTRAIT = () => innerHeight > innerWidth;
const camera = new THREE.PerspectiveCamera(PORTRAIT() ? 72 : 58, innerWidth/innerHeight, 0.1, 320);
camera.rotation.order = 'YXZ';
camera.position.set(0, 2.77, 5.0);

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

// ---------- Sky ----------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(280, 16, 12),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{
      top:{ value:new THREE.Color(0x2b86cc) },
      mid:{ value:new THREE.Color(0x8fd8f2) },
      bot:{ value:new THREE.Color(0xdff3ff) }
    },
    vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
      void main(){
        float h = clamp(vP.y/280.0, -1.0, 1.0);
        vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.5)) : mix(mid, bot, pow(-h, 0.5));
        // posterise into bands for a blocky sky
        c = floor(c * 5.0) / 5.0;
        gl_FragColor = vec4(c, 1.0);
      }`
  })
);
sky.frustumCulled = false;
scene.add(sky);

// pixel sun
const sunBox = box(16, 16, 1, new THREE.MeshBasicMaterial({ color:0xfff5b0, fog:false }), 52, 46, -95);
sunBox.rotation.y = 0;
scene.add(sunBox);

// ---------- Water ----------
const waterUniforms = {
  uTime:{ value:0 },
  uFog:{ value:new THREE.Color(0x9fe0f5) },
  uNear:{ value:45 }, uFar:{ value:150 }
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv; varying vec2 vCell; varying vec2 vGrid;
    varying float vWave; varying float vFog;
    void main(){
      vUv = uv;
      vec3 p = position;
      // stepped waves: the surface is a set of flat slabs
      float w = sin(p.x*0.5 + uTime*1.3)*0.07 + cos(p.y*0.62 + uTime*1.0)*0.07 + sin((p.x+p.y)*0.3 + uTime*0.6)*0.04;
      p.z += floor(w * 14.0) / 14.0;
      vWave = w;
      vCell = floor(position.xy / 4.0);
      vGrid = position.xy / 4.0;
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      vFog = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uTime;
    varying vec2 vUv; varying vec2 vCell; varying vec2 vGrid;
    varying float vWave; varying float vFog;
    void main(){
      vec3 deep  = vec3(0.06,0.40,0.52);
      vec3 mid   = vec3(0.10,0.50,0.60);
      vec3 mid2  = vec3(0.15,0.58,0.66);
      vec3 shal  = vec3(0.24,0.68,0.73);
      // hard quantised height bands
      float h = clamp(vWave * 4.0 + 0.5, 0.0, 1.0);
      float q = floor(h * 3.999) / 3.0;
      vec3 col = q < 0.34 ? deep : (q < 0.67 ? mid : (h < 0.9 ? mid2 : shal));
      // per-tile brightness so every slab reads as its own cube
      float rnd = fract(sin(dot(vCell, vec2(12.9898,78.233))) * 43758.5453);
      col *= 0.95 + rnd * 0.1;
      // tile seams
      vec2 g = abs(fract(vGrid) - 0.5);
      float edge = smoothstep(0.44, 0.5, max(g.x, g.y));
      col *= 1.0 - edge * 0.16 * smoothstep(70.0, 12.0, vFog);
      // sparkle
      float spark = step(0.988, fract(sin(dot(vCell, vec2(4.898,7.23)) + floor(uTime*2.0)) * 43758.5453));
      col += spark * 0.16 * smoothstep(80.0, 12.0, vFog);
      float fogF = smoothstep(uNear, uFar, vFog);
      col = mix(col, uFog, fogF);
      gl_FragColor = vec4(col, mix(0.93, 1.0, fogF));
    }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 100, 100), waterMat);
water.rotation.x = -Math.PI/2;
scene.add(water);

// ---------- Lake bed ----------
const bed = new THREE.Mesh(new THREE.PlaneGeometry(200,200), mat(0x276b5c));
bed.rotation.x = -Math.PI/2; bed.position.y = -4.4;
scene.add(bed);

// sand patches on the bed (instanced)
{
  const n = 12;
  const patch = new THREE.InstancedMesh(UNIT, mat(0xc9b487), n);
  for(let i=0;i<n;i++){
    D.position.set(rand(-45,45), -4.35, rand(-70,10));
    D.rotation.set(0, rand(0,3), 0);
    D.scale.set(rand(4,10), 0.06, rand(4,10));
    D.updateMatrix(); patch.setMatrixAt(i, D.matrix);
  }
  patch.instanceMatrix.needsUpdate = true;
  scene.add(patch);
}
// weeds (instanced)
{
  const n = 40;
  const weed = new THREE.InstancedMesh(UNIT, mat(0x2c8f5a), n);
  for(let i=0;i<n;i++){
    const h = rand(0.8,2.4);
    D.position.set(rand(-48,48), -4.3 + h/2, rand(-70,12));
    D.rotation.set(rand(-0.1,0.1), rand(0,3), rand(-0.1,0.1));
    D.scale.set(0.14, h, 0.14);
    D.updateMatrix(); weed.setMatrixAt(i, D.matrix);
  }
  weed.instanceMatrix.needsUpdate = true;
  scene.add(weed);
}

// ---------- Shore ----------
const grass = box(240, 1.2, 96, mat(0x5cbb63), 0, 0.05, 58);
scene.add(grass);
const sand = box(240, 0.9, 7, mat(0xead9a1), 0, -0.05, 11.5);
scene.add(sand);

// ---------- Dock (blocky) ----------
const dock = new THREE.Group();
const woodA = mat(0xa9743f), woodB = mat(0x8e5f31), woodC = mat(0x6f4826);
for(let i=0;i<11;i++){
  dock.add(box(4.6, 0.3, 0.95, i % 2 ? woodA : woodB, 0, 1.0, 12.6 - i*1.02));
}
for(const sx of [-2.1, 2.1]) for(let i=0;i<5;i++){
  dock.add(box(0.26, 1.7, 0.26, woodC, sx, 0.35, 12.3 - i*2.7));
  dock.add(box(0.26, 0.26, 0.26, woodC, sx, 1.15, 12.3 - i*2.7));
}
for(const sx of [-2.15, 2.15]){
  for(let i=0;i<4;i++) dock.add(box(0.3, 0.3, 0.3, woodC, sx, 1.3, 11.5 - i*3.2));
}
scene.add(dock);

// dock props
{
  const bucket = box(0.5, 0.5, 0.5, mat(0x3b82a0), -1.4, 1.4, 8.2);
  const handle = box(0.62, 0.06, 0.06, mat(0x9aa5ad), -1.4, 1.72, 8.2);
  const cooler = box(0.8, 0.5, 0.55, mat(0xf2f4f5), 1.45, 1.4, 8.0);
  const lid = box(0.84, 0.14, 0.6, mat(0x18a5b0), 1.45, 1.7, 8.0);
  const tackle = box(0.55, 0.32, 0.38, mat(0xd94f4f), -1.6, 1.31, 6.7);
  tackle.rotation.y = 0.5;
  const crate = box(0.6, 0.6, 0.6, mat(0xc9a06a), 1.6, 1.45, 9.6);
  const rope = box(0.7, 0.12, 0.7, mat(0xd9c9a3), -1.5, 1.2, 10.3);
  scene.add(bucket, handle, cooler, lid, tackle, crate, rope);
}

// ---------- Shop stall on the shore ----------
const SHOP_POS = { x:5.8, z:16.0 };
{
  const g = new THREE.Group();
  const wood = mat(0x8e5f31), woodDark = mat(0x6b4a29);
  const clothA = mat(0xef4056), clothB = mat(0xfdf3dd);
  g.add(box(3.8, 1.0, 1.4, woodDark, 0, 0.5, 0));            // counter body
  g.add(box(4.0, 0.18, 1.6, wood, 0, 1.05, 0));               // counter top
  for(const sx of [-1.8, 1.8]) for(const sz of [-0.6, 0.6])
    g.add(box(0.18, 2.6, 0.18, woodDark, sx, 2.25, sz));      // posts
  for(let i=0;i<7;i++)
    g.add(box(0.62, 0.16, 2.4, i % 2 ? clothA : clothB, -1.86 + i*0.62, 3.5, 0)); // awning
  g.add(box(2.9, 0.8, 0.8, mat(0xc9a06a), -3.0, 0.4, 0.9));   // crate
  g.add(box(0.5, 0.5, 0.5, mat(0x3b82a0), 2.9, 0.25, 1.0));   // bucket
  // rods for sale, leaning on the counter
  [[-0.9, 0.05], [0.15, -0.04], [1.15, 0.03]].forEach(([ox, tilt], i) => {
    const c = [0x69c8db, 0xffb703, 0x9b5de5][i];
    const rod = box(0.09, 3.0, 0.09, mat(c), ox, 1.5, 0.42);
    rod.rotation.z = tilt;
    g.add(rod);
    g.add(box(0.16, 0.16, 0.16, mat(0xef4056), ox - tilt * 1.4, 2.9, 0.42));
  });
  g.position.set(SHOP_POS.x, 0.65, SHOP_POS.z);
  g.rotation.y = -0.42;
  scene.add(g);

  // "TACKLE SHOP" banner across the counter front
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#12222b'; cx.fillRect(0, 0, 512, 96);
  cx.fillStyle = '#ffd166'; cx.fillRect(0, 0, 512, 6); cx.fillRect(0, 90, 512, 6);
  cx.fillStyle = '#ffd166';
  cx.font = 'bold 52px monospace';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('TACKLE SHOP', 256, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  const bannerMat = new THREE.MeshBasicMaterial({ map: tex });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.66), bannerMat);
  sign.position.set(0, 0.72, -0.715);
  sign.rotation.y = Math.PI;
  g.add(sign);
  const fascia = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.6), bannerMat);
  fascia.position.set(0, 3.36, -1.21);
  fascia.rotation.y = Math.PI;
  g.add(fascia);
}

// ---------- Islands ----------
function island(x,z,r){
  scene.add(box(r*2, 0.7, r*2, mat(0xead9a1), x, 0.1, z));
  scene.add(box(r*1.8, 0.55, r*1.8, mat(0x5cbb63), x, 0.62, z));
  scene.add(box(r*1.2, 0.5, r*1.2, mat(0x51ad58), x, 1.05, z));
}
island(-25,-18,7); island(28,-26,8); island(0,-54,12); island(-13,-36,4); island(16,-42,5);

// ---------- Distant hills (instanced boxes) ----------
{
  const peaks = [[-110,-126],[-40,-128],[30,-124],[100,-128]];
  const n = peaks.length * 3;
  const hills = new THREE.InstancedMesh(UNIT, mat(0x6f9f8b), n);
  let idx = 0;
  for(const [hx,hz] of peaks){
    for(let layer=0; layer<3; layer++){
      const w = 52 - layer*15, h = 6, d = 22 - layer*6;
      D.position.set(hx, h/2 - 3 + layer*5.2, hz);
      D.rotation.set(0,0,0);
      D.scale.set(w, h, d);
      D.updateMatrix(); hills.setMatrixAt(idx++, D.matrix);
    }
  }
  hills.instanceMatrix.needsUpdate = true;
  scene.add(hills);
}
// far shore + treeline
scene.add(box(300, 1, 14, mat(0xe6d09a), 0, 0.1, -100));
scene.add(box(300, 1, 70, mat(0x4e9e57), 0, 0.2, -128));
{
  const n = 40;
  const trunks = new THREE.InstancedMesh(UNIT, mat(0x6b4423), n);
  const leaves = new THREE.InstancedMesh(UNIT, mat(0x2f9159), n*2);
  for(let i=0;i<n;i++){
    const x = rand(-130,130), z = rand(-102,-122), s = rand(0.8,1.5);
    D.position.set(x, 0.35 + 0.8*s, z); D.rotation.set(0,0,0); D.scale.set(0.35*s, 1.6*s, 0.35*s);
    D.updateMatrix(); trunks.setMatrixAt(i, D.matrix);
    D.position.set(x, 0.35 + 2.1*s, z); D.scale.set(1.9*s, 2.2*s, 1.9*s);
    D.updateMatrix(); leaves.setMatrixAt(i*2, D.matrix);
    D.position.set(x, 0.35 + 3.4*s, z); D.scale.set(1.2*s, 1.5*s, 1.2*s);
    D.updateMatrix(); leaves.setMatrixAt(i*2+1, D.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);
}

// ---------- Nearby trees (blocky, instanced) ----------
{
  const spots = [[-13,21,1.3],[-18,29,1.6],[12,25,1.2],[18,20,1.5],[-7,33,1.1],[8,35,1.4],[-24,17,1.0],[24,29,1.2]];
  const n = spots.length;
  const trunks = new THREE.InstancedMesh(UNIT, mat(0x6b4423), n);
  const leaves = new THREE.InstancedMesh(UNIT, mat(0x2f9159), n*3);
  spots.forEach(([x,z,s], i) => {
    D.position.set(x, 0.6 + 0.9*s, z); D.rotation.set(0, rand(0,3), 0); D.scale.set(0.5*s, 1.8*s, 0.5*s);
    D.updateMatrix(); trunks.setMatrixAt(i, D.matrix);
    for(let k=0;k<3;k++){
      D.position.set(x, 0.6 + (1.9 + k*0.95)*s, z);
      const w = (2.9 - k*0.7)*s;
      D.scale.set(w, 1.1*s, w);
      D.updateMatrix(); leaves.setMatrixAt(i*3 + k, D.matrix);
    }
  });
  trunks.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);
}

// ---------- Dirty path from the dock to the shop ----------
{
  const n = 14;
  const path = new THREE.InstancedMesh(UNIT, mat(0xc2a878), n);
  for(let i=0;i<n;i++){
    const t = i / (n - 1);
    const x = lerp(-1.0, SHOP_POS.x - 1.2, t) + Math.sin(t * 7) * 0.45;
    const z = lerp(12.4, SHOP_POS.z - 2.4, t);
    D.rotation.set(0, rand(-0.3, 0.3), 0);
    D.position.set(x, 0.67, z);
    D.scale.set(1.7, 0.09, 1.6);
    D.updateMatrix(); path.setMatrixAt(i, D.matrix);
  }
  path.instanceMatrix.needsUpdate = true;
  scene.add(path);
}

// ---------- Distant hills behind the shore (closes the horizon) ----------
{
  const n = 16;
  const hills = new THREE.InstancedMesh(UNIT, mat(0x2f7a52), n*2);
  for(let i=0;i<n;i++){
    const x = -130 + i*17 + (i % 3) * 4;
    const z = 72 + (i % 4) * 9;
    const w = rand(16, 26), h = rand(7, 13);
    D.rotation.set(0, 0, 0);
    D.position.set(x, h/2, z); D.scale.set(w, h, w * 0.7);
    D.updateMatrix(); hills.setMatrixAt(i*2, D.matrix);
    D.position.set(x + w*0.15, h + h*0.3, z + 2); D.scale.set(w*0.5, h*0.6, w*0.4);
    D.updateMatrix(); hills.setMatrixAt(i*2+1, D.matrix);
  }
  hills.instanceMatrix.needsUpdate = true;
  scene.add(hills);
}

// ---------- Rocks (instanced) ----------
{
  const n = 18;
  const rocks = new THREE.InstancedMesh(UNIT, mat(0x8d99ae), n);
  for(let i=0;i<n;i++){
    const shore = i < 9;
    const s = rand(0.5, 1.4);
    D.position.set(rand(-40,40), shore ? 0.5 : -0.45, shore ? rand(10,14) : rand(-45,6));
    D.rotation.set(rand(0,1), rand(0,3), rand(0,1));
    D.scale.set(s, s*0.8, s);
    D.updateMatrix(); rocks.setMatrixAt(i, D.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);
}

// ---------- Reeds & lily pads (instanced) ----------
{
  const n = 34;
  const stalks = new THREE.InstancedMesh(UNIT, mat(0x2f9e44), n);
  const tips = new THREE.InstancedMesh(UNIT, mat(0x7a5230), n);
  for(let i=0;i<n;i++){
    const side = i % 2 ? 1 : -1;
    const x = side * rand(3.0, 7.0), z = rand(0.5, 6.6), h = rand(0.9, 1.7);
    D.position.set(x, h/2 - 0.15, z);
    D.rotation.set(rand(-0.12,0.12), rand(0,3), rand(-0.12,0.12));
    D.scale.set(0.11, h, 0.11);
    D.updateMatrix(); stalks.setMatrixAt(i, D.matrix);
    D.position.set(x, h - 0.05, z);
    D.scale.set(0.18, 0.45, 0.18);
    D.updateMatrix(); tips.setMatrixAt(i, D.matrix);
  }
  stalks.instanceMatrix.needsUpdate = true; tips.instanceMatrix.needsUpdate = true;
  scene.add(stalks, tips);
}
{
  const n = 12;
  const pads = new THREE.InstancedMesh(UNIT, mat(0x3faa4a), n);
  const flowers = new THREE.InstancedMesh(UNIT, mat(0xff9ec4), 4);
  for(let i=0;i<n;i++){
    D.position.set(rand(-18,18), 0.14, rand(-22,4));
    D.rotation.set(0, rand(0,3), 0);
    D.scale.set(rand(0.6,1.0), 0.08, rand(0.6,1.0));
    D.updateMatrix(); pads.setMatrixAt(i, D.matrix);
    if(i < 4){
      D.position.set(rand(-16,16), 0.34, rand(-20,2));
      D.rotation.set(0,0,0);
      D.scale.set(0.24, 0.24, 0.24);
      D.updateMatrix(); flowers.setMatrixAt(i, D.matrix);
    }
  }
  pads.instanceMatrix.needsUpdate = true; flowers.instanceMatrix.needsUpdate = true;
  scene.add(pads, flowers);
}

// ---------- Clouds (instanced) & birds ----------
const clouds = new THREE.InstancedMesh(UNIT, new THREE.MeshBasicMaterial({ color:0xf2fbff }), 27);
{
  for(let c=0;c<9;c++){
    const cx = rand(-90,90), cy = rand(26,40), cz = rand(-90,10);
    for(let k=0;k<3;k++){
      D.position.set(cx + (k-1)*3.4, cy + (k===1?0.7:0), cz + rand(-1,1));
      D.rotation.set(0,0,0);
      D.scale.set(7 - Math.abs(k-1)*1.6, k===1 ? 3.4 : 1.8, 5);
      D.updateMatrix(); clouds.setMatrixAt(c*3 + k, D.matrix);
    }
  }
  clouds.instanceMatrix.needsUpdate = true;
  scene.add(clouds);
}
const birds = [];
for(let i=0;i<3;i++){
  const g = new THREE.Group();
  const body = box(0.5, 0.16, 0.22, mat(0x33424f));
  const w1 = box(0.7, 0.06, 0.3, mat(0x33424f), -0.5, 0, 0);
  const w2 = box(0.7, 0.06, 0.3, mat(0x33424f), 0.5, 0, 0);
  g.add(body, w1, w2);
  g.userData = { w1, w2, r:rand(26,44), h:rand(16,22), sp:rand(1.2,2.2), ph:rand(0,6) };
  scene.add(g); birds.push(g);
}

// ---------- Ambient fish (2 instanced meshes) ----------
const FISH_N = 6;
const fishBodies = new THREE.InstancedMesh(UNIT, mat(0xffffff), FISH_N);
const fishTails  = new THREE.InstancedMesh(UNIT, mat(0xffffff), FISH_N);
{
  const pal = [0x4a90d9, 0xf6c945, 0x3d9970, 0xff8fab, 0xffb703, 0x5d6d7e];
  for(let i=0;i<FISH_N;i++){
    fishBodies.setColorAt(i, new THREE.Color(pal[i]));
    fishTails.setColorAt(i, new THREE.Color(pal[i]).multiplyScalar(0.85));
  }
  fishBodies.instanceColor.needsUpdate = true;
  fishTails.instanceColor.needsUpdate = true;
}
scene.add(fishBodies, fishTails);
const fishData = [];
for(let i=0;i<FISH_N;i++){
  fishData.push({ cx:rand(-22,22), cz:rand(-38,-2), r:rand(4,11), sp:rand(0.12,0.35)*(Math.random()<0.5?1:-1), y:rand(-3.0,-1.0), ph:rand(0,6.28), s:rand(0.7,1.3) });
}

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
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.8 }));
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
const rippleGeo = new THREE.RingGeometry(0.42, 0.62, 4);
rippleGeo.rotateZ(Math.PI/4);
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
tipJoint.position.y = 0.9;
rodRig.add(tipJoint);
tipJoint.add(box(0.04, 0.62, 0.04, rodMat, 0, 0.31, 0));
tipJoint.add(box(0.08, 0.08, 0.08, mat(0xef4056), 0, 0.66, 0));
const rodTipObj = new THREE.Object3D();
rodTipObj.position.y = 0.66;
tipJoint.add(rodTipObj);

// hands
const skin = mat(0xf0bd92);
rodRig.add(box(0.12, 0.13, 0.16, skin, 0.005, 0.1, 0.03));
rodRig.add(box(0.1, 0.11, 0.14, skin, 0.0, 0.26, 0.03));
rodRig.add(box(0.14, 0.16, 0.14, mat(0x2f5d78), 0, -0.02, 0.02));

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
  yaw:0, pitch:-0.12,
  power:0, powerDir:1,
  tension:15, progress:0, fishStrength:0.3,
  surgeTimer:0, surgeDur:0, snapTimer:0, slack:0, reelHeld:false,
  time:0, rodSwing:0, bobDip:0,
  castT:0, castDur:1, biteWindow:0, waitTimer:4,
  caughtAnim:0,
  // player + economy
  px:0, pz:5.0, camY:2.77, bob:0, walked:0, nearShop:false,
  coins:0, bag:[], owned:['bamboo'], rodIndex:0
};
const EYE = 1.62;
let shopOpen = false, shopTab = 'rods';
const bag = G.bag;
const bobberPos = new THREE.Vector3(0, 0.1, -6);
const rodTipWorld = new THREE.Vector3();
const castFrom = new THREE.Vector3();
const castTo = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const camFwd = new THREE.Vector3();

let hookedFish = null, hookedSpecies = null;
const log = [];

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const promptEl = $('prompt'), biteEl = $('biteIndicator'), castMeter = $('castMeter'), castFill = $('castFill');
const reelUI = $('reelUI'), tensionNeedle = $('tensionNeedle'), progressFill = $('progressFill');
const reelFishName = $('reelFishName'), reelPct = $('reelPct'), catchModal = $('catchModal');
const toastEl = $('toast'), logDrawer = $('logDrawer'), logList = $('logList'), logSummary = $('logSummary');
const lockHint = $('lockHint'), shopBtnEl = $('shopBtn'), shopOverlay = $('shopOverlay'), shopBody = $('shopBody');
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
  $('score').textContent = G.score;
  $('caughtCount').textContent = G.caught;
  $('coinCount').textContent = G.coins;
  const sc = $('shopCoins'); if(sc) sc.textContent = G.coins;
}
function renderLog(){
  if(!log.length){ logList.innerHTML = '<p class="empty">No fish yet. Cast your line!</p>'; logSummary.textContent = ''; return; }
  logList.innerHTML = log.map(e =>
    `<div class="log-item"><span class="e">${fishSVG(e.sp)}</span><div><b>${e.sp.name}</b><small>${e.weight} lbs • ${e.sp.rarity.toUpperCase()}</small></div><span class="pts">+${e.sp.pts}</span></div>`
  ).join('');
  const total = log.reduce((s,e)=>s + e.sp.pts, 0);
  logSummary.textContent = `${log.length} caught • ${total} pts • Best ${Math.max(...log.map(e=>e.weight))} lbs`;
}
const SAVE_KEY = 'reel-life-3d-save-v4';
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      score:G.score, caught:G.caught, best:G.best, coins:G.coins,
      owned:G.owned, rod:G.rodIndex,
      bag:bag.map(e=>({ n:e.sp.name, w:e.weight })),
      log:log.map(e=>({ n:e.sp.name, w:e.weight }))
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const d = JSON.parse(raw);
    if(!d) return;
    G.score = d.score || 0; G.caught = d.caught || 0; G.best = d.best || null;
    G.coins = d.coins || 0;
    if(Array.isArray(d.owned) && d.owned.length) G.owned = d.owned.filter(id => RODS.some(r => r.id === id));
    if(!G.owned.length) G.owned = ['bamboo'];
    G.rodIndex = clamp(d.rod || 0, 0, RODS.length - 1);
    if(!G.owned.includes(RODS[G.rodIndex].id)) G.rodIndex = 0;
    (d.log || []).forEach(e => {
      const sp = SPECIES.find(x => x.name === e.n);
      if(sp) log.push({ sp, weight:e.w });
    });
    (d.bag || []).forEach(e => {
      const sp = SPECIES.find(x => x.name === e.n);
      if(sp) bag.push({ sp, weight:e.w });
    });
  }catch(e){}
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
  if(s === 'waiting'){ promptEl.style.display = ''; setPrompt(isTouch ? 'Waiting for a bite… <b>tap</b> to reel in early' : 'Waiting for a bite… <b>click</b> to reel in early', 'waiting'); }
  if(s === 'bite'){ promptEl.style.display = ''; setPrompt('BITE! <b>CLICK / SPACE</b> NOW!', 'bite'); biteEl.classList.add('show'); }
  if(s === 'reeling') promptEl.style.display = 'none';
  if(s === 'casting'){ promptEl.style.display = ''; setPrompt('Splash!', 'waiting'); }
  if(s === 'caught') promptEl.style.display = 'none';
  if(s === 'charging') promptEl.style.display = 'none';
}

// ---------- Walking ----------
// small round blockers so you don't walk through dock props
const BLOCKERS = [
  [1.45, 8.0, 0.75], [1.6, 9.6, 0.65], [-1.4, 8.2, 0.65], [-1.6, 6.7, 0.65], [-1.5, 10.3, 0.65],
];
function groundAt(x, z){
  // dock deck
  if(Math.abs(x) <= 2.30 && z >= 1.30 && z <= 13.40){
    for(const b of BLOCKERS){
      if((x - b[0]) * (x - b[0]) + (z - b[1]) * (z - b[1]) < b[2] * b[2]) return null;
    }
    return 1.15;
  }
  // keep clear of the shop stall
  if((x - SHOP_POS.x) * (x - SHOP_POS.x) + (z - SHOP_POS.z) * (z - SHOP_POS.z) < 8.4) return null;
  // shore: wet sand strip, then grass
  if(z >= 8.20 && z <= 25.0 && Math.abs(x) <= 20) return z < 10.10 ? 0.40 : 0.65;
  return null;
}
const walkable = (x,z) => groundAt(x,z) !== null;

// ---------- Casting ----------
function landingPoint(power, out){
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  if(camFwd.lengthSq() < 0.0001) camFwd.set(0,0,-1);
  camFwd.normalize();
  const rod = RODS[G.rodIndex];
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
function inWater(p){
  return p.z < 8.0 && p.z > -92 && Math.abs(p.x) < 72;
}
function startCharge(){
  if(G.state !== 'aim') return;
  ensureAudio();
  setState('charging');
  G.power = 0; G.powerDir = 1;
}
function releaseCast(){
  if(G.state !== 'charging') return;
  const power = G.power;
  rodTipObj.getWorldPosition(castFrom);
  if(!landingPoint(power, castTo)){
    showToast('Aim at the water to cast.', true);
    aimMarker.visible = true;
    setState('aim');
    return;
  }
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
  G.waitTimer = rand(2.5, 6);
  setState('waiting');
}
function triggerBite(){
  G.biteWindow = 1.4; G.bobDip = 1;
  setState('bite');
  sfx.bite();
  spawnSplash(bobberPos, 8, 0.5);
}
function makeFish3D(sp, scale){
  const g = new THREE.Group();
  const bodyMat = mat(sp.color), bellyMat = mat(sp.belly), darkMat = mat(shade(sp.color, 0.7));
  g.add(box(1.15, 0.5, 0.34, bodyMat, 0, 0, 0));
  g.add(box(0.9, 0.2, 0.36, bellyMat, 0.05, -0.2, 0));
  const tail = box(0.34, 0.46, 0.1, darkMat, -0.72, 0, 0);
  g.add(tail);
  g.add(box(0.34, 0.26, 0.08, darkMat, 0.05, 0.34, 0));       // dorsal
  g.add(box(0.05, 0.1, 0.05, mat(0x10242a), 0.44, 0.1, 0.18)); // eyes
  g.add(box(0.05, 0.1, 0.05, mat(0x10242a), 0.44, 0.1, -0.18));
  g.userData = { tail };
  g.scale.setScalar(scale * sp.size);
  return g;
}
function hookFish(){
  hookedSpecies = pickSpecies();
  if(hookedFish){ scene.remove(hookedFish); }
  hookedFish = makeFish3D(hookedSpecies, 1.25);
  hookedFish.position.copy(bobberPos); hookedFish.position.y = -0.7;
  scene.add(hookedFish);
  G.tension = 26; G.progress = 6; G.slack = 0;
  G.fishStrength = hookedSpecies.strength;
  G.surgeTimer = rand(0.6, 1.4); G.surgeDur = 0; G.snapTimer = 0; G.reelHeld = true;
  reelFishName.innerHTML = `<span class="reel-fish">${fishSVG(hookedSpecies)}</span>${hookedSpecies.name}`;
  setState('reeling');
  sfx.hook();
  spawnSplash(bobberPos, 12, 0.8);
}
function catchFish(){
  const sp = hookedSpecies;
  const weight = (rand(sp.minW, sp.maxW)).toFixed(1);
  const value = fishValue(sp, parseFloat(weight));
  G.score += sp.pts; G.caught++;
  if(!G.best || parseFloat(weight) > parseFloat(G.best.weight)) G.best = { name:sp.name, weight };
  log.unshift({ sp, weight });
  bag.push({ sp, weight, value });
  renderLog(); updateStats(); saveGame();

  $('catchRarity').textContent = sp.rarity.toUpperCase() + ' CATCH';
  $('catchRarity').className = 'modal-eyebrow' + (sp.rarity !== 'common' ? ' ' + sp.rarity : '');
  $('catchIcon').innerHTML = fishSVG(sp);
  $('catchName').textContent = sp.name;
  $('catchWeight').textContent = weight + ' lbs';
  $('catchPoints').innerHTML = '+' + sp.pts + ' pts <span class="catch-value">WORTH ' + value + 'c AT THE SHOP</span>';
  $('catchDesc').textContent = sp.desc;
  catchModal.querySelector('.modal-card').className = 'modal-card ' + sp.rarity;
  catchModal.classList.remove('hidden');
  lockHint.classList.add('hidden');
  setState('caught');
  releasePointer();
  if(sp.rarity === 'legendary') sfx.legendary(); else sfx.caught();
  spawnSplash(bobberPos, 18, 1.1);
}
function escapeFish(reason){
  if(hookedFish){ scene.remove(hookedFish); hookedFish = null; }
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

// ---------- Shop ----------
const rodCard = (r, i) => {
  const owned = G.owned.includes(r.id);
  const equipped = G.rodIndex === i;
  const afford = G.coins >= r.cost;
  const hex = '#' + r.color.toString(16).padStart(6, '0');
  const state = equipped
    ? '<button class="buy-btn equip" disabled>EQUIPPED</button>'
    : owned
      ? `<button class="buy-btn equip" data-buy="${i}">EQUIP</button>`
      : `<button class="buy-btn" data-buy="${i}" ${afford ? '' : 'disabled'}>${r.cost}c</button>`;
  return `<div class="rod-card${equipped ? ' equipped' : ''}">
    <div class="rod-swatch" style="background:${hex}"></div>
    <div class="rod-info">
      <b>${r.name}</b>
      <small>CAST ${r.cast}m · REEL ${r.reel.toFixed(2)}x · LINE ${r.tension >= 1.05 ? 'HARD' : r.tension >= 0.95 ? 'NORMAL' : r.tension >= 0.8 ? 'EASY' : 'FORGIVING'}</small>
      <small class="${owned ? '' : 'locked'}">${owned ? r.blurb : 'LOCKED · ' + r.cost + ' coins'}</small>
    </div>
    ${state}
  </div>`;
};
const bagTotal = () => bag.reduce((a, e) => a + (e.value || fishValue(e.sp, parseFloat(e.weight))), 0);

function renderShop(){
  if(!shopOpen) return;
  $('shopCoins').textContent = G.coins;
  $('sellCount').textContent = bag.length;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === shopTab));
  if(shopTab === 'rods'){
    shopBody.innerHTML = RODS.map(rodCard).join('');
  } else if(!bag.length){
    shopBody.innerHTML = '<p class="shop-empty">Your catch bag is empty.<br>Catch something first, then sell it here.</p>';
  } else {
    shopBody.innerHTML = bag.map((e, i) => `<div class="sell-row">
        <div class="e">${fishSVG(e.sp)}</div>
        <div><b>${e.sp.name}</b><small>${e.weight} lbs</small></div>
        <div class="val">${e.value || fishValue(e.sp, parseFloat(e.weight))}c</div>
        <button class="buy-btn" data-sell="${i}">Sell</button>
      </div>`).join('')
      + `<button class="sell-all" id="sellAll">SELL ALL · ${bagTotal()}c</button>`;
  }
}
function openShop(){
  if(shopOpen || G.state !== 'aim') return;
  if(!G.nearShop){ showToast('Walk over to the tackle shop first.', true); return; }
  shopOpen = true;
  releasePointer();
  hidePrompt();
  shopOverlay.classList.remove('hidden');
  shopBtnEl.classList.add('hidden');
  renderShop();
  ensureAudio();
}
function closeShop(){
  if(!shopOpen) return;
  shopOpen = false;
  shopOverlay.classList.add('hidden');
  clearKeys();
  updateLockHint();
}
function buyRod(i){
  const r = RODS[i];
  if(!r) return;
  if(G.owned.includes(r.id)){
    if(G.rodIndex === i) return;
    G.rodIndex = i; applyRod(); sfx.buy(); showToast('Equipped the ' + r.name + '.'); saveGame(); renderShop();
    return;
  }
  if(G.coins < r.cost){ sfx.deny(); showToast('Not enough coins — sell some fish!', true); return; }
  G.coins -= r.cost;
  G.owned.push(r.id);
  G.rodIndex = i;
  applyRod(); updateStats(); saveGame(); sfx.buy(); renderShop();
  showToast('Bought the ' + r.name + '!');
}
function applyRod(){
  const r = RODS[G.rodIndex] || RODS[0];
  rodMat.color.setHex(r.color);
  updateStats();
}
function sellFish(i){
  const e = bag[i];
  if(!e) return;
  const v = e.value || fishValue(e.sp, parseFloat(e.weight));
  bag.splice(i, 1);
  G.coins += v;
  sfx.coin(); updateStats(); saveGame(); renderShop();
  showToast('+' + v + ' coins');
}
function sellAll(){
  if(!bag.length) return;
  const total = bagTotal();
  G.coins += total;
  bag.length = 0;
  sfx.coin(); updateStats(); saveGame(); renderShop();
  showToast('Sold the lot for ' + total + ' coins!');
}

// ---------- Pointer lock / input ----------
let pointerLocked = false, lockFallback = false, everLocked = false;
const supportsLock = !isTouch && typeof canvas.requestPointerLock === 'function';
function requestLock(){
  if(!supportsLock){ lockFallback = true; return; }
  try { canvas.requestPointerLock(); }catch(e){ if(!everLocked) lockFallback = true; return; }
  setTimeout(() => { if(!document.pointerLockElement && !everLocked) lockFallback = true; }, 400);
}
function updateLockHint(){
  const show = !pointerLocked && supportsLock && !lockFallback && G.state !== 'menu'
    && !shopOpen && catchModal.classList.contains('hidden') && logDrawer.classList.contains('hidden');
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
let dragging = false, lastX = 0, lastY = 0, lockTime = 0, lastButtonT = 0, touchDrag = 0;

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
  if(e.pointerType === 'mouse'){
    if(!pointerLocked && lockFallback){
      // no pointer lock available: absolute mouse position steers the view
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      G.yaw = clamp(-nx * 1.1, -1.45, 1.45);
      G.pitch = clamp(-0.14 - ny * 0.4, -0.62, 0.42);
    }
    return;
  }
  if(dragging){
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    touchDrag += Math.hypot(dx, dy);
    applyLook(dx * 0.005, dy * 0.005);
    lastX = e.clientX; lastY = e.clientY;
    // a real drag means "look", not "cast"
    if(touchDrag > 30 && G.state === 'charging') setState('aim');
  }
}, { passive:true });

canvas.addEventListener('pointerdown', e => {
  if(shopOpen) return;
  ensureAudio();
  lastButtonT = performance.now();
  if(e.pointerType === 'mouse'){
    if(!pointerLocked && !lockFallback){
      requestLock();
      return;
    }
    handlePress();
    return;
  }
  // touch: drag to look, hold still to charge
  dragging = true; lastX = e.clientX; lastY = e.clientY; touchDrag = 0;
  if(G.state === 'reeling') G.reelHeld = true;
  else if(G.state === 'aim') startCharge();
});
addEventListener('pointerup', (e) => {
  lastButtonT = performance.now();
  dragging = false;
  if(e.pointerType !== 'mouse'){
    if(G.state === 'charging') releaseCast();
    else if(G.state === 'reeling') G.reelHeld = false;
    else if(touchDrag < 30){
      if(G.state === 'waiting') reelInEarly();
      else if(G.state === 'bite') hookFish();
    }
    return;
  }
  handleRelease();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

function handlePress(){
  if(shopOpen) return;
  if(G.state === 'aim') startCharge();
  else if(G.state === 'bite') hookFish();
  else if(G.state === 'waiting') reelInEarly();
  else if(G.state === 'reeling') G.reelHeld = true;
}
function handleRelease(){
  if(shopOpen) return;
  if(G.state === 'charging') releaseCast();
  else if(G.state === 'reeling') G.reelHeld = false;
}
addEventListener('keydown', e => {
  if(e.code === 'Escape'){
    if(shopOpen){ closeShop(); return; }
    if(!logDrawer.classList.contains('hidden')){ logDrawer.classList.add('hidden'); drawerOpen = false; updateLockHint(); return; }
  }
  if(e.code === 'KeyE' && !e.repeat && G.state === 'aim'){
    if(shopOpen) closeShop(); else openShop();
    return;
  }
  if(shopOpen) return;
  if(setKey(e.code, true)) e.preventDefault();
  if(e.code === 'Space'){
    e.preventDefault();
    if(e.repeat) return;
    ensureAudio();
    if(G.state === 'aim') startCharge();
    else if(G.state === 'bite') hookFish();
    else if(G.state === 'waiting') reelInEarly();
    else if(G.state === 'reeling') G.reelHeld = true;
  }
  if((e.code === 'Enter' || e.code === 'NumpadEnter') && G.state === 'caught') $('continueBtn').click();
});
addEventListener('keyup', e => {
  setKey(e.code, false);
  if(e.code === 'Space'){
    if(G.state === 'charging') releaseCast();
    else if(G.state === 'reeling') G.reelHeld = false;
  }
});
addEventListener('blur', clearKeys);

// ---------- UI wiring ----------
$('startArt').innerHTML = ICON.startArt;
$('soundBtn').innerHTML = ICON.soundOn;

$('startBtn').addEventListener('click', () => {
  ensureAudio();
  $('startOverlay').classList.add('hidden');
  G.yaw = 0; G.pitch = -0.15;
  applyRod();
  setState('aim');
  requestLock();
  showToast('Good luck, angler!');
});
$('continueBtn').addEventListener('click', () => {
  catchModal.classList.add('hidden');
  if(hookedFish){ scene.remove(hookedFish); hookedFish = null; }
  setState('aim');
  updateLockHint();
});
$('logBtn').addEventListener('click', () => {
  const open = logDrawer.classList.toggle('hidden');
  drawerOpen = !open;
  if(!open) releasePointer();
  updateLockHint();
});
$('closeLog').addEventListener('click', () => { logDrawer.classList.add('hidden'); drawerOpen = false; updateLockHint(); });

// ---- shop wiring ----
shopBtnEl.addEventListener('click', openShop);
$('shopClose').addEventListener('click', closeShop);
shopOverlay.addEventListener('click', e => { if(e.target === shopOverlay) closeShop(); });
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  shopTab = t.dataset.tab;
  renderShop();
}));
shopBody.addEventListener('click', e => {
  const buy = e.target.closest('[data-buy]');
  if(buy){ buyRod(+buy.dataset.buy); return; }
  const one = e.target.closest('[data-sell]');
  if(one){ sellFish(+one.dataset.sell); return; }
  if(e.target.closest('#sellAll')) sellAll();
});

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
$('resetBtn').addEventListener('click', () => {
  G.score = 0; G.caught = 0; G.best = null; log.length = 0;
  G.coins = 0; bag.length = 0; G.owned = ['bamboo']; G.rodIndex = 0;
  applyRod(); updateStats(); renderLog(); saveGame();
  if(shopOpen) renderShop();
  showToast('Session reset — tight lines!');
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
  placeRodForAspect();
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
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  G.time += dt;
  checkPerformance(rawDt);

  // camera look
  camera.rotation.y = G.yaw;
  camera.rotation.x = G.pitch;

  // ---- walking ----
  let mf = 0, ms = 0;
  if(G.state === 'aim' && !shopOpen && !drawerOpen){
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

  // shop proximity
  const dShop = Math.hypot(G.px - SHOP_POS.x, G.pz - SHOP_POS.z);
  G.nearShop = dShop < 5.6;
  const shopBtnEl = $('shopBtn');
  const showShopBtn = G.nearShop && G.state === 'aim' && !shopOpen;
  shopBtnEl.classList.toggle('hidden', !showShopBtn);
  stickEl.classList.toggle('hidden', !(isTouch && G.state === 'aim' && !shopOpen));

  // world ambience (cheap: only a handful of updates)
  waterUniforms.uTime.value = G.time;
  for(let i=0;i<birds.length;i++){
    const b = birds[i], u = b.userData;
    const a = G.time * 0.09 * u.sp + u.ph;
    b.position.set(Math.cos(a)*u.r, u.h + Math.sin(G.time + u.ph)*0.6, Math.sin(a)*u.r - 14);
    b.rotation.y = -a;
    const flap = Math.sin(G.time*9 + u.ph) * 0.5;
    u.w1.rotation.z = flap; u.w2.rotation.z = -flap;
  }
  // ambient fish swim
  for(let i=0;i<FISH_N;i++){
    const f = fishData[i], a = G.time * f.sp + f.ph;
    const fx = f.cx + Math.cos(a)*f.r, fz = f.cz + Math.sin(a)*f.r;
    const fy = f.y + Math.sin(G.time*0.9 + f.ph)*0.25;
    D.position.set(fx, fy, fz);
    D.rotation.set(0, -a - Math.PI/2 + (f.sp < 0 ? Math.PI : 0), 0);
    D.scale.set(f.s*1.2, f.s*0.55, f.s*0.45);
    D.updateMatrix(); fishBodies.setMatrixAt(i, D.matrix);
    D.position.set(fx + Math.cos(-a - Math.PI/2 + (f.sp < 0 ? Math.PI : 0)) * -0.75 * f.s, fy, fz);
    D.rotation.y += Math.sin(G.time*8 + f.ph) * 0.4;
    D.scale.set(f.s*0.35, f.s*0.5, f.s*0.18);
    D.updateMatrix(); fishTails.setMatrixAt(i, D.matrix);
  }
  fishBodies.instanceMatrix.needsUpdate = true;
  fishTails.instanceMatrix.needsUpdate = true;

  // ---- state machine / timers ----
  if(G.state === 'menu'){
    G.yaw = Math.sin(G.time * 0.22) * 0.5;
    G.pitch = -0.08 + Math.sin(G.time * 0.3) * 0.03;
  }

  if(G.state === 'charging'){
    G.power += G.powerDir * dt * 1.15;
    if(G.power >= 1){ G.power = 1; G.powerDir = -1; }
    if(G.power <= 0){ G.power = 0; G.powerDir = 1; }
    castFill.style.width = (G.power * 100) + '%';
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

  // ---- reeling minigame (harder: rod stats + surges + slack) ----
  if(G.state === 'reeling'){
    const rod = RODS[G.rodIndex];
    // surge windows: the fish bolts and the line screams
    G.surgeTimer -= dt;
    if(G.surgeTimer <= 0){ G.surgeTimer = rand(0.9, 2.0); G.surgeDur = rand(0.5, 1.1); }
    if(G.surgeDur > 0) G.surgeDur -= dt;
    const surging = G.surgeDur > 0;

    let rate = -24;                                     // line relaxes fast when you let go
    if(G.reelHeld) rate = (12 + G.fishStrength * 18) * rod.tension * (surging ? 1.9 : 1);
    G.tension = clamp(G.tension + rate * dt, 0, 100);

    if(G.reelHeld) G.progress += dt * (G.tension > 78 ? 6 : 20) * rod.reel;
    else G.progress -= dt * 1.0;
    G.progress = clamp(G.progress, 0, 100);

    if(G.reelHeld && Math.random() < dt * 9) sfx.reelTick();

    // slack line: fish spits the hook
    if(G.tension < 14){ G.slack += dt; } else { G.slack = Math.max(0, G.slack - dt * 1.8); }
    if(G.slack > 2.0){ escapeFish('Slack line — it spat the hook!'); }

    // over-tension: snap
    if(G.tension >= 96){
      G.snapTimer += dt;
      if(G.snapTimer > 0.3){ sfx.snap(); escapeFish('Snap! The line couldn\'t take it.'); }
    } else G.snapTimer = 0;

    if(G.state === 'reeling' && G.progress >= 100) catchFish();

    tensionNeedle.style.left = `calc(${G.tension}% - 3px)`;
    progressFill.style.width = G.progress + '%';
    reelPct.textContent = Math.floor(G.progress) + '%';

    const track = document.querySelector('.tension-track');
    track.classList.toggle('danger', G.tension > 82);
    track.classList.toggle('slack', G.tension < 22);
    reelWarn.textContent =
      G.slack > 0.6 ? 'SLACK LINE — REEL!' :
      G.tension > 82 ? 'TOO TIGHT — LET GO!' :
      surging ? 'IT\'S SURGING — EASE OFF!' : '';
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
    if(G.snapTimer !== 0) G.snapTimer = 0;
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
  rodTipObj.getWorldPosition(rodTipWorld);

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

  updateParticles(dt);
  renderer.render(scene, camera);
}

// ---------- boot ----------
loadGame();
applyRod();
updateStats();
renderLog();
setRodDir(DIR_IDLE);
setState('menu');
promptEl.style.display = 'none';
animate();

// handy debug handle
window.__reelLife = {
  G, SPECIES, RODS, renderer, scene, camera, bobber, bobberPos, water, rodRig, aimMarker,
  get shopOpen(){ return shopOpen; },
  openShop, closeShop, buyRod, sellAll, renderShop,
  walkable, groundAt, landBobber, triggerBite, hookFish, catchFish, SHOP_POS
};
