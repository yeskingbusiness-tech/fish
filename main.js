import * as THREE from 'three';

// ============================================================
// REEL LIFE 3D — a tiny 3D fishing game
// ============================================================

// ---------- Species data ----------
const SPECIES = [
  { name:'Bluegill',        color:0x4a90d9, belly:0xbfe3ff, size:0.55, minW:0.3, maxW:1.4, pts:10,  rarity:'common',    weight:26, strength:0.22, pattern:'none',    desc:'A scrappy little panfish. Every angler starts here.' },
  { name:'Yellow Perch',    color:0xf6c945, belly:0xfff3b0, size:0.6,  minW:0.4, maxW:1.8, pts:15,  rarity:'common',    weight:22, strength:0.28, pattern:'stripes', desc:'Golden stripes and a feisty fight on light tackle.' },
  { name:'Largemouth Bass', color:0x3d9970, belly:0xd8f3dc, size:0.85, minW:1.0, maxW:5.5, pts:30,  rarity:'common',    weight:20, strength:0.45, pattern:'spots',   desc:'The king of the pond. Hits hard and runs deep.' },
  { name:'Rainbow Trout',   color:0xff8fab, belly:0xffe5ec, size:0.7,  minW:0.8, maxW:4.0, pts:40,  rarity:'uncommon',  weight:13, strength:0.5,  pattern:'rainbow', desc:'A rainbow flash beneath the surface. Acrobatic and quick.' },
  { name:'Channel Catfish', color:0x5d6d7e, belly:0xd6dbdf, size:1.0,  minW:2.0, maxW:9.0, pts:55,  rarity:'uncommon',  weight:10, strength:0.62, pattern:'whiskers',desc:'A whiskered heavyweight that pulls like a truck.' },
  { name:'Golden Koi',      color:0xffb703, belly:0xfff3b0, size:0.8,  minW:1.5, maxW:6.0, pts:120, rarity:'rare',      weight:6,  strength:0.55, pattern:'patches', desc:'Shimmering gold in the shallows. A true prize catch!' },
  { name:'Ancient Carp',    color:0x9b5de5, belly:0xe0aaff, size:1.25, minW:5.0, maxW:18.0,pts:250, rarity:'legendary', weight:3,  strength:0.85, pattern:'scales',  desc:'The old giant of the lake. Legends say it has outsmarted a hundred anglers.' },
];

function pickSpecies(){
  const total = SPECIES.reduce((s,x)=>s+x.weight,0);
  let r = Math.random()*total;
  for(const s of SPECIES){ r -= s.weight; if(r<=0) return s; }
  return SPECIES[0];
}
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function hex(c){ return '#' + c.toString(16).padStart(6,'0'); }

let _svgId = 0;
// A cute little fish illustration, tinted per species.
function fishSVG(sp){
  const id = 'fishgrad' + (_svgId++);
  const col = hex(sp.color), bel = hex(sp.belly);
  let pattern = '';
  if(sp.pattern === 'stripes'){
    pattern = [16,26,36,46].map(x=>`<path d="M${x} 13 C${x-3} 20 ${x-3} 28 ${x} 35" stroke="rgba(80,50,0,.28)" stroke-width="3.2" fill="none" stroke-linecap="round"/>`).join('');
  } else if(sp.pattern === 'spots'){
    pattern = [[24,17],[32,26],[40,19],[27,30],[44,30],[20,25]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.9" fill="rgba(10,60,40,.30)"/>`).join('');
  } else if(sp.pattern === 'rainbow'){
    pattern = `<path d="M9 24 C20 33 40 34 52 26" stroke="rgba(255,110,150,.55)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M10 21 C22 27 40 28 52 22" stroke="rgba(120,200,255,.45)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else if(sp.pattern === 'patches'){
    pattern = [[22,20,6],[34,30,4.5],[44,20,5],[29,14,3.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(255,255,255,.55)"/>`).join('');
  } else if(sp.pattern === 'scales'){
    pattern = [14,22,30,38,46].flatMap(x=>[18,26,34].map(y=>`<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.3"/>`)).join('');
  }
  const whiskers = sp.pattern === 'whiskers' ? `<path d="M8 30 C2 33 1 38 4 41 M9 33 C5 39 6 43 9 45" stroke="rgba(40,55,65,.75)" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 76 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${sp.name}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${bel}"/>
      </linearGradient>
    </defs>
    <path d="M52 24 C57 14 65 8 71 6 C67 16 67 32 71 42 C65 40 57 34 52 24 Z" fill="${col}" opacity=".92"/>
    <path d="M30 10 C33 3 42 2 44 8 C39 10 34 11 30 10 Z" fill="${col}"/>
    <path d="M33 38 C36 45 44 46 45 40 C40 39 36 39 33 38 Z" fill="${col}" opacity=".85"/>
    <path d="M6 24 C12 12 30 7 44 12 C52 15 55 19 55 24 C55 29 52 33 44 36 C30 41 12 36 6 24 Z" fill="url(#${id})" stroke="rgba(0,0,0,.12)" stroke-width="1"/>
    ${pattern}
    <path d="M12 20 C20 13 32 12 40 14" stroke="rgba(255,255,255,.5)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="18" cy="21" r="3.4" fill="#0d2228"/><circle cx="19.2" cy="19.9" r="1.2" fill="#fff"/>
    ${whiskers}
  </svg>`;
}

const ICON = {
  rod: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M20.5 3.2C13.5 5.8 7.6 11 5.2 20.4"/><circle cx="19" cy="7.4" r="2.6"/><path d="M5.2 20.4c-.2-2.6 1.3-4.4 3.9-4.6"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="M16.5 9a4.6 4.6 0 0 1 0 6"/><path d="M19 6.5a8 8 0 0 1 0 11"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3l5-4v13l-5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>`,
  startArt: `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="artWa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#59c7dd"/><stop offset="1" stop-color="#1d8fa3"/></linearGradient></defs>
    <ellipse cx="70" cy="70" rx="62" ry="12" fill="url(#artWa)" opacity=".85"/>
    <path d="M104 12 L60 58" stroke="#8b5e3c" stroke-width="4" stroke-linecap="round"/>
    <circle cx="98" cy="17" r="5.5" fill="none" stroke="#0ea5b7" stroke-width="3"/>
    <path d="M104 12 C112 34 96 46 84 56" stroke="#e8eef0" stroke-width="1.6" fill="none"/>
    <circle cx="84" cy="58" r="6" fill="#ff4757"/><path d="M78 58 a6 6 0 0 1 12 0" fill="#fff"/>
    <ellipse cx="84" cy="70" rx="16" ry="3.4" fill="none" stroke="#fff" stroke-width="1.4" opacity=".8"/>
    <ellipse cx="84" cy="70" rx="26" ry="5.5" fill="none" stroke="#fff" stroke-width="1.1" opacity=".5"/>
    <path d="M22 76 C28 66 46 62 58 67 C64 69 66 73 66 77 C66 81 63 84 58 85 C46 89 28 86 22 76 Z" fill="#ffb703" stroke="rgba(0,0,0,.12)"/>
    <path d="M20 76 C15 69 9 65 5 64 C8 71 8 81 5 88 C9 87 15 83 20 76 Z" fill="#ffb703"/>
    <circle cx="30" cy="74" r="2.6" fill="#0d2228"/><circle cx="31" cy="73" r="1" fill="#fff"/>
  </svg>`,
};

// ---------- Audio (synthesized, no files) ----------
let audioCtx = null, soundOn = true;
function ensureAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); }
function tone(freq, dur, type='sine', vol=0.15, when=0, slideTo=null){
  if(!soundOn || !audioCtx) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t+dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t+dur+0.02);
}
function noiseBurst(dur=0.3, vol=0.2, freq=800){
  if(!soundOn || !audioCtx) return;
  const len = audioCtx.sampleRate * dur;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type='lowpass'; f.frequency.value = freq;
  const g = audioCtx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(audioCtx.destination); src.start();
}
const sfx = {
  cast(){ noiseBurst(0.25, 0.12, 1200); tone(600,0.2,'sine',0.06,0,900); },
  splash(){ noiseBurst(0.4, 0.25, 900); tone(300,0.25,'sine',0.08,0,120); },
  plip(){ tone(900,0.08,'sine',0.1,0,500); },
  bite(){ tone(1200,0.1,'square',0.12); tone(1200,0.1,'square',0.12,0.14); },
  hook(){ tone(500,0.15,'square',0.12,0,900); noiseBurst(0.2,0.15,1000); },
  reelTick(){ tone(rand(700,900),0.03,'square',0.03); },
  snap(){ tone(800,0.2,'sawtooth',0.12,0,100); noiseBurst(0.2,0.15,2000); },
  escape(){ tone(400,0.4,'sine',0.1,0,150); },
  catch_(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.18,'triangle',0.14,i*0.09)); },
  legendary(){ [523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,0.25,'triangle',0.15,i*0.1)); },
};

// ---------- Renderer / Scene ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd8f2);
scene.fog = new THREE.Fog(0x8fd8f2, 45, 150);

// Gradient sky dome
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{ top:{value:new THREE.Color(0x2f8fd6)}, mid:{value:new THREE.Color(0x8fd8f2)}, bot:{value:new THREE.Color(0xdff3ff)} },
    vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
      void main(){
        float h = clamp(vP.y/300.0, -1.0, 1.0);
        vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.5));
        gl_FragColor = vec4(c, 1.0);
      }`
  })
);
sky.frustumCulled = false;
scene.add(sky);

const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 400);
camera.position.set(0, 5, 18);

// Lights
const hemi = new THREE.HemisphereLight(0xbfefff, 0x3a7d5d, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2c4, 2.2);
sun.position.set(25, 38, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.far = 120;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x88ccff, 0.4);
fill.position.set(-20, 15, -20);
scene.add(fill);

// Sun disc + glow
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), new THREE.MeshBasicMaterial({ color:0xfff3a0, fog:false }));
sunMesh.position.set(60, 55, -80);
scene.add(sunMesh);

// ---------- Water ----------
const waterUniforms = {
  uTime:{ value:0 },
  uFogColor:{ value:new THREE.Color(0x8fd8f2) },
  uFogNear:{ value:45 },
  uFogFar:{ value:150 }
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv; varying float vWave; varying float vFogDepth;
    void main(){
      vUv = uv;
      vec3 p = position;
      float w = sin(p.x*0.35 + uTime*1.4)*0.12 + cos(p.y*0.4 + uTime*1.1)*0.12 + sin((p.x+p.y)*0.18 + uTime*0.7)*0.08;
      p.z += w; vWave = w;
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uFogColor;
    uniform float uFogNear; uniform float uFogFar;
    varying vec2 vUv; varying float vWave; varying float vFogDepth;
    void main(){
      vec3 deep = vec3(0.02,0.32,0.42);
      vec3 shal = vec3(0.15,0.62,0.68);
      float m = 0.5 + vWave*2.2;
      vec3 col = mix(deep, shal, clamp(m,0.0,1.0));
      float sparkle = pow(max(0.0, sin(vUv.x*420.0 + uTime*2.0)*sin(vUv.y*380.0 - uTime*1.6)), 12.0)*0.22;
      col += sparkle * smoothstep(120.0, 20.0, vFogDepth);
      float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
      col = mix(col, uFogColor, fogFactor);
      gl_FragColor = vec4(col, mix(0.82, 1.0, fogFactor));
    }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 72, 72), waterMat);
water.rotation.x = -Math.PI/2;
water.position.y = 0;
scene.add(water);

// Seabed (visible through water)
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(220,220), new THREE.MeshStandardMaterial({ color:0x2e6b5e, roughness:1 }));
seabed.rotation.x = -Math.PI/2; seabed.position.y = -4.2;
scene.add(seabed);
// sandy patches
for(let i=0;i<14;i++){
  const s = new THREE.Mesh(new THREE.CircleGeometry(rand(2,6), 20), new THREE.MeshStandardMaterial({ color:0xc2b280, roughness:1 }));
  s.rotation.x = -Math.PI/2; s.position.set(rand(-50,50), -4.15, rand(-60,20));
  scene.add(s);
}
// underwater plants
const plantMat = new THREE.MeshStandardMaterial({ color:0x1e7a4c, roughness:1 });
for(let i=0;i<40;i++){
  const h = rand(0.6,1.8);
  const p = new THREE.Mesh(new THREE.ConeGeometry(0.12, h, 5), plantMat);
  p.position.set(rand(-45,45), -4.2 + h/2, rand(-55,15));
  scene.add(p);
}

// ---------- Shore / grass ----------
const grass = new THREE.Mesh(new THREE.PlaneGeometry(240, 100), new THREE.MeshStandardMaterial({ color:0x5dbb63, roughness:1 }));
grass.rotation.x = -Math.PI/2; grass.position.set(0, 0.38, 62);
grass.receiveShadow = true;
scene.add(grass);
// shoreline sand strip
const sand = new THREE.Mesh(new THREE.PlaneGeometry(240, 7), new THREE.MeshStandardMaterial({ color:0xf0dc9e, roughness:1 }));
sand.rotation.x = -Math.PI/2; sand.position.set(0, 0.22, 11.5);
sand.receiveShadow = true;
scene.add(sand);

// ---------- Dock ----------
const dock = new THREE.Group();
const woodMat = new THREE.MeshStandardMaterial({ color:0x9c6b3c, roughness:0.9 });
const woodDark = new THREE.MeshStandardMaterial({ color:0x7a5230, roughness:0.9 });
for(let i=0;i<12;i++){
  const plank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 0.9), i%2? woodMat : woodDark);
  plank.position.set(0, 1.05, 13 - i*1.05);
  plank.castShadow = plank.receiveShadow = true;
  dock.add(plank);
}
for(const sx of [-2, 2]) for(let i=0;i<5;i++){
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,2.4,8), woodDark);
  post.position.set(sx, 0, 12.5 - i*2.6);
  post.castShadow = true;
  dock.add(post);
}
// dock rails
for(const sx of [-2.1, 2.1]){
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,11), woodDark);
  rail.position.set(sx, 2.0, 7.5); rail.castShadow = true; dock.add(rail);
  for(let i=0;i<4;i++){
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.0,0.12), woodDark);
    post.position.set(sx, 1.5, 12 - i*3); dock.add(post);
  }
}
// little bits of dock life
{
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.2,0.42,12), new THREE.MeshStandardMaterial({color:0x3b82a0,roughness:0.6}));
  bucket.position.set(-1.5, 1.35, 7.2); bucket.castShadow = true; dock.add(bucket);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26,0.02,6,12,Math.PI), new THREE.MeshStandardMaterial({color:0x9aa5ad,metalness:0.6,roughness:0.4}));
  handle.position.set(-1.5, 1.56, 7.2); dock.add(handle);

  const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.45,0.45), new THREE.MeshStandardMaterial({color:0xf2f4f5,roughness:0.5}));
  cooler.position.set(1.55, 1.36, 5.6); cooler.castShadow = true; dock.add(cooler);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74,0.1,0.49), new THREE.MeshStandardMaterial({color:0x0ea5b7,roughness:0.5}));
  lid.position.set(1.55, 1.63, 5.6); dock.add(lid);

  const tackle = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.28,0.34), new THREE.MeshStandardMaterial({color:0xd94f4f,roughness:0.6}));
  tackle.position.set(-1.65, 1.3, 4.6); tackle.rotation.y = 0.5; tackle.castShadow = true; dock.add(tackle);

  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.3,0.055,8,20), new THREE.MeshStandardMaterial({color:0xd9c9a3,roughness:1}));
  rope.rotation.x = -Math.PI/2; rope.position.set(1.7, 1.17, 3.4); dock.add(rope);
}
scene.add(dock);

// ---------- Trees, rocks, reeds ----------
function makeTree(x,z,s=1,baseY=0.35){
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.3*s,1.6*s,8), new THREE.MeshStandardMaterial({color:0x6b4423,roughness:1}));
  trunk.position.y = 0.8*s; trunk.castShadow = true; g.add(trunk);
  const greens = [0x2e8b57, 0x3cb371, 0x228b22];
  for(let i=0;i<3;i++){
    const c = new THREE.Mesh(new THREE.ConeGeometry((1.5-i*0.35)*s, 1.6*s, 8), new THREE.MeshStandardMaterial({color:greens[i%3],roughness:1}));
    c.position.y = (1.8 + i*0.9)*s; c.castShadow = true; g.add(c);
  }
  g.position.set(x, baseY, z);
  scene.add(g);
  return g;
}
makeTree(-14, 22, 1.3); makeTree(-18, 30, 1.6); makeTree(12, 26, 1.2); makeTree(18, 20, 1.5);
makeTree(-8, 34, 1.1); makeTree(8, 36, 1.4); makeTree(-24, 18, 1.0); makeTree(24, 30, 1.2);
makeTree(-30, -20, 1.4); makeTree(32, -28, 1.5); makeTree(-38, -8, 1.2); makeTree(40, -14, 1.3); // island trees

// small islands
const rockMat = new THREE.MeshStandardMaterial({color:0x8d99ae,roughness:1});

function makeIsland(x,z,r){
  // sandy skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r*0.94, r*1.12, 0.7, 20), new THREE.MeshStandardMaterial({color:0xf0dc9e,roughness:1}));
  skirt.position.set(x, 0.12, z); skirt.receiveShadow = true; scene.add(skirt);
  // grassy mound
  const mound = new THREE.Mesh(new THREE.SphereGeometry(r*0.95, 20, 12), new THREE.MeshStandardMaterial({color:0x64c46a,roughness:1}));
  mound.scale.y = 0.24; mound.position.set(x, 0.32, z); mound.castShadow = true; mound.receiveShadow = true; scene.add(mound);
  // a couple of inland rocks
  for(let i=0;i<3;i++){
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4,0.9),0), rockMat);
    rock.position.set(x + rand(-r*0.4,r*0.4), 0.75, z + rand(-r*0.4,r*0.4));
    rock.castShadow = true; scene.add(rock);
  }
}
makeIsland(-30,-20,7); makeIsland(32,-28,8); makeIsland(0,-58,13);
makeIsland(-14,-38,4); makeIsland(18,-44,5);

// rocks
for(let i=0;i<16;i++){
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4,1.1),0), rockMat);
  const onShore = i<8;
  r.position.set(onShore? rand(-40,40) : rand(-45,45), onShore? 0.5 : -0.4, onShore? rand(10,16) : rand(-50,8));
  r.castShadow = true; scene.add(r);
}
// reeds near dock
const reedMat = new THREE.MeshStandardMaterial({color:0x2f9e44,roughness:1});
for(let i=0;i<26;i++){
  const h = rand(1.0,2.0);
  const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,h,5), reedMat);
  const side = Math.random()<0.5 ? -1 : 1;
  reed.position.set(side*rand(3.2,5.5), h/2 - 0.2, rand(2,12));
  reed.rotation.z = rand(-0.12,0.12);
  scene.add(reed);
  if(Math.random()<0.5){
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.09,0.25,3,6), new THREE.MeshStandardMaterial({color:0x6b4423}));
    tip.position.y = h/2; reed.add(tip);
  }
}
// lily pads
const lilyMat = new THREE.MeshStandardMaterial({color:0x2f9e44,roughness:0.8});
for(let i=0;i<10;i++){
  const pad = new THREE.Mesh(new THREE.CircleGeometry(rand(0.3,0.6), 10), lilyMat);
  pad.rotation.x = -Math.PI/2;
  pad.position.set(rand(-20,20), 0.19, rand(-25,5));
  scene.add(pad);
  if(Math.random()<0.4){
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8), new THREE.MeshStandardMaterial({color:0xffb7d5}));
    fl.position.set(pad.position.x, 0.3, pad.position.z); scene.add(fl);
  }
}

// far shore across the lake (hides the water plane's edge)
{
  const shoreSand = new THREE.Mesh(new THREE.PlaneGeometry(300, 14), new THREE.MeshStandardMaterial({color:0xe6d09a,roughness:1}));
  shoreSand.rotation.x = -Math.PI/2; shoreSand.position.set(0, 0.16, -103); scene.add(shoreSand);
  const shoreGrass = new THREE.Mesh(new THREE.PlaneGeometry(300, 70), new THREE.MeshStandardMaterial({color:0x4e9e57,roughness:1}));
  shoreGrass.rotation.x = -Math.PI/2; shoreGrass.position.set(0, 0.3, -122); scene.add(shoreGrass);

  // soft hills behind the treeline
  const hillMat = new THREE.MeshStandardMaterial({color:0x6f9b83,roughness:1,flatShading:true});
  for(let i=0;i<4;i++){
    const hh = rand(7,13), rr = rand(52,78);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), hillMat);
    hill.position.set(-120 + i*80 + rand(-16,16), hh/2 - 3, -150 + rand(-14,8));
    hill.rotation.y = rand(0,3);
    scene.add(hill);
  }

  // instanced treeline — cheap and dense
  const N = 44;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.3, 6);
  const leafGeo = new THREE.ConeGeometry(1.15, 2.8, 7);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({color:0x6b4423,roughness:1}), N);
  const leafMesh = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({color:0x2e8b57,roughness:1}), N);
  const dummy = new THREE.Object3D();
  for(let i=0;i<N;i++){
    const x = -120 + Math.random()*240;
    const z = -105 - Math.random()*22;
    const sc = rand(0.75, 1.45);
    dummy.position.set(x, 0.3 + 0.65*sc, z); dummy.scale.setScalar(sc); dummy.rotation.y = rand(0,3);
    dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.3 + 1.3*sc + 1.4*sc, z);
    dummy.updateMatrix(); leafMesh.setMatrixAt(i, dummy.matrix);
  }
  trunkMesh.instanceMatrix.needsUpdate = true; leafMesh.instanceMatrix.needsUpdate = true;
  scene.add(trunkMesh, leafMesh);
}

// clouds
const clouds = [];
const cloudMat = new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:0.92});
for(let i=0;i<9;i++){
  const g = new THREE.Group();
  for(let j=0;j<4;j++){
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(1.2,2.4),10,10), cloudMat);
    s.position.set(j*1.6-2.4, rand(-0.3,0.3), rand(-0.5,0.5));
    s.scale.y = 0.55; g.add(s);
  }
  g.position.set(rand(-70,70), rand(22,34), rand(-70,10));
  scene.add(g); clouds.push(g);
}

// birds
const birds = [];
for(let i=0;i<4;i++){
  const b = new THREE.Group();
  const wmat = new THREE.MeshBasicMaterial({color:0x334155, side:THREE.DoubleSide});
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.28), wmat); w1.position.x = -0.5;
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.28), wmat); w2.position.x = 0.5;
  b.add(w1,w2); b.userData = {w1,w2, speed:rand(2,4), r:rand(25,45), h:rand(14,20), phase:rand(0,6)};
  scene.add(b); birds.push(b);
}

// ---------- Player + Rod ----------
const player = new THREE.Group();
player.position.set(0, 1.15, 2.9);
scene.add(player);
{
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32,0.55,4,10), new THREE.MeshStandardMaterial({color:0xff6b35,roughness:0.8}));
  body.position.y = 0.75; body.castShadow = true; player.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26,14,14), new THREE.MeshStandardMaterial({color:0xffd9b3,roughness:0.7}));
  head.position.y = 1.45; head.castShadow = true; player.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.46,0.12,14), new THREE.MeshStandardMaterial({color:0xf5e6c8,roughness:0.9}));
  hat.position.y = 1.62; player.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.05,14), new THREE.MeshStandardMaterial({color:0xe8d5a8,roughness:0.9}));
  brim.position.y = 1.57; player.add(brim);
  const eyeMat = new THREE.MeshBasicMaterial({color:0x1a1a1a});
  for(const sx of [-0.09,0.09]){
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6), eyeMat);
    eye.position.set(sx, 1.48, 0.23); player.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08,0.02,6,10,Math.PI), eyeMat);
  smile.position.set(0,1.38,0.24); smile.rotation.x = Math.PI; player.add(smile);
  // arms
  const armMat = new THREE.MeshStandardMaterial({color:0xff6b35,roughness:0.8});
  for(const sx of [-0.38,0.38]){
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09,0.4,3,8), armMat);
    arm.position.set(sx, 1.05, 0.25); arm.rotation.x = -0.9; arm.castShadow = true; player.add(arm);
  }
  // legs
  const legMat = new THREE.MeshStandardMaterial({color:0x2d5a88,roughness:0.9});
  for(const sx of [-0.16,0.16]){
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11,0.35,3,8), legMat);
    leg.position.set(sx, 0.28, 0); player.add(leg);
  }
}

// Rod: pivot group at hands, two segments so tip can bend
const rodPivot = new THREE.Group();
rodPivot.position.set(0.22, 1.15, 0.5);
rodPivot.rotation.y = 0.42; // angle the rod off-axis so it reads clearly on screen
player.add(rodPivot);
const rodBase = new THREE.Group();
rodPivot.add(rodBase);
const rodMat = new THREE.MeshStandardMaterial({color:0xc98a4b,roughness:0.55});
const rodGrip = new THREE.MeshStandardMaterial({color:0x2b3a42,roughness:0.8});
const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.085,1.5,10), rodMat);
seg1.position.y = 0.75; seg1.castShadow = true; rodBase.add(seg1);
const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.45,10), rodGrip);
grip.position.y = 0.1; rodBase.add(grip);
const rodTipJoint = new THREE.Group();
rodTipJoint.position.y = 1.5;
rodBase.add(rodTipJoint);
const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.05,1.25,8), rodMat);
seg2.position.y = 0.62; seg2.castShadow = true; rodTipJoint.add(seg2);
const tipBead = new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8), new THREE.MeshBasicMaterial({color:0xff4757}));
tipBead.position.y = 1.26; rodTipJoint.add(tipBead);
const reelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.1,14), new THREE.MeshStandardMaterial({color:0xd7dde2,metalness:0.65,roughness:0.28}));
reelMesh.rotation.z = Math.PI/2; reelMesh.position.set(0,0.42,0.14); rodBase.add(reelMesh);
rodBase.rotation.x = -1.05; // point forward/up
const rodTipObj = new THREE.Object3D();
rodTipObj.position.y = 1.26;
rodTipJoint.add(rodTipObj);

// ---------- Fish factory ----------
function createFish(species, scale=1){
  const g = new THREE.Group();
  const col = new THREE.Color(species.color);
  const belly = new THREE.Color(species.belly);
  const bodyMat = new THREE.MeshStandardMaterial({color:col, roughness:0.5, metalness:0.15});
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyMat);
  body.scale.set(1.6, 0.75, 0.55);
  body.castShadow = true;
  g.add(body);
  const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), new THREE.MeshStandardMaterial({color:belly, roughness:0.6}));
  bellyMesh.scale.set(1.5, 0.55, 0.5); bellyMesh.position.y = -0.12;
  g.add(bellyMesh);
  // tail
  const tail = new THREE.Group();
  tail.position.x = -0.78;
  const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 4), bodyMat);
  tailMesh.rotation.z = Math.PI/2; tailMesh.scale.set(1,1,0.25);
  tail.add(tailMesh); g.add(tail);
  // dorsal fin
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 4), bodyMat);
  fin.position.set(0.1, 0.42, 0); fin.scale.set(1,1,0.2); g.add(fin);
  // side fins
  for(const sz of [-0.28,0.28]){
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.3,4), bodyMat);
    f.position.set(0.25,-0.15,sz); f.rotation.x = sz>0? 0.9 : -0.9; f.scale.set(1,1,0.3); g.add(f);
  }
  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({color:0x111111});
  for(const sz of [-0.22,0.22]){
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06,8,8), eyeMat);
    eye.position.set(0.55, 0.12, sz); g.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.02,6,6), new THREE.MeshBasicMaterial({color:0xffffff}));
    hl.position.set(0.59, 0.16, sz); g.add(hl);
  }
  // stripes for perch/trout
  if(species.name.includes('Perch') || species.name.includes('Trout')){
    for(let i=0;i<3;i++){
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.36,0.03,6,14), new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.5}));
      stripe.position.x = 0.3 - i*0.3; stripe.rotation.y = Math.PI/2; stripe.scale.set(1,0.7,1);
      g.add(stripe);
    }
  }
  g.scale.setScalar(scale * species.size);
  g.userData.tail = tail;
  g.userData.baseScale = scale * species.size;
  return g;
}

// Ambient fish swimming under water
const ambientFish = [];
for(let i=0;i<16;i++){
  const sp = SPECIES[i % 5];
  const f = createFish(sp, rand(0.7,1.1));
  f.userData = { ...f.userData, cx:rand(-25,25), cz:rand(-40,0), r:rand(4,12), speed:rand(0.15,0.4)*(Math.random()<0.5?1:-1), y:rand(-3.2,-1.2), phase:rand(0,6.28) };
  scene.add(f); ambientFish.push(f);
}

// Hooked fish (single reusable)
let hookedFish = null;
let hookedSpecies = null;

// ---------- Bobber + Line ----------
const bobber = new THREE.Group();
{
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.25,14,12,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({color:0xff4757,roughness:0.3,emissive:0x551111,emissiveIntensity:0.25}));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.25,14,12,0,Math.PI*2,Math.PI/2,Math.PI/2), new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.3}));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.95,8), new THREE.MeshStandardMaterial({color:0xff4757}));
  stick.position.y = 0.5;
  const stickTip = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.16,8), new THREE.MeshStandardMaterial({color:0xffffff}));
  stickTip.position.y = 0.98;
  const flag = new THREE.Mesh(new THREE.SphereGeometry(0.085,10,10), new THREE.MeshBasicMaterial({color:0xffe066}));
  flag.position.y = 1.12;
  bobber.add(top,bot,stick,stickTip,flag);
  bobber.scale.setScalar(1.35);
  bobber.visible = false;
}
scene.add(bobber);
const bobberRing = new THREE.Mesh(
  new THREE.RingGeometry(0.78, 1.0, 32),
  new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.92, side:THREE.DoubleSide, depthWrite:false})
);
bobberRing.rotation.x = -Math.PI/2;
bobberRing.visible = false;
scene.add(bobberRing);
const bobberRing2 = new THREE.Mesh(
  new THREE.RingGeometry(1.35, 1.5, 32),
  new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.35, side:THREE.DoubleSide, depthWrite:false})
);
bobberRing2.rotation.x = -Math.PI/2;
bobberRing2.visible = false;
scene.add(bobberRing2);

const LINE_POINTS = 24;
const lineGeo = new THREE.BufferGeometry();
const linePos = new Float32Array(LINE_POINTS*3);
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color:0xf5f5f5, transparent:true, opacity:0.85}));
line.frustumCulled = false;
line.visible = false;
scene.add(line);

function updateLine(from, to, sag=0.4){
  const mid = from.clone().lerp(to, 0.5); mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const pts = curve.getPoints(LINE_POINTS-1);
  for(let i=0;i<LINE_POINTS;i++){
    linePos[i*3] = pts[i].x; linePos[i*3+1] = pts[i].y; linePos[i*3+2] = pts[i].z;
  }
  lineGeo.attributes.position.needsUpdate = true;
}

// ---------- Splash particles + ripples ----------
const particles = [];
const particleGeo = new THREE.SphereGeometry(0.05, 6, 6);
const particleMat = new THREE.MeshBasicMaterial({color:0xdff6ff, transparent:true});
function spawnSplash(pos, n=18, spread=1){
  for(let i=0;i<n;i++){
    const m = new THREE.Mesh(particleGeo, particleMat.clone());
    m.position.copy(pos);
    m.userData.vel = new THREE.Vector3(rand(-spread,spread), rand(1.5,3.5), rand(-spread,spread));
    m.userData.life = rand(0.4,0.8);
    m.material.opacity = 0.9;
    scene.add(m); particles.push(m);
  }
}
const ripples = [];
function spawnRipple(pos){
  const r = new THREE.Mesh(new THREE.RingGeometry(0.3,0.42,24), new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.7,side:THREE.DoubleSide}));
  r.rotation.x = -Math.PI/2; r.position.set(pos.x, 0.08, pos.z);
  r.userData.life = 1.2;
  scene.add(r); ripples.push(r);
}

// ---------- Game state ----------
const G = {
  state: 'menu', // menu | aim | charging | casting | waiting | bite | reeling | caught
  score: 0, caught: 0, best: null,
  aimYaw: 0, // radians, 0 = straight ahead (-Z)
  castPower: 0, castDir: 1,
  bobberVel: new THREE.Vector3(),
  waitTimer: 0, biteWindow: 0,
  tension: 15, progress: 0, fishStrength: 0.3, surgeTimer: 0, snapTimer: 0,
  reelHeld: false, fishDist: 10,
  biteDip: 0,
  camYaw: 0, camPitch: 0.32, dragging: false, lastPX: 0, lastPY: 0,
  camLook: new THREE.Vector3(0, 0.6, -6),
  time: 0,
};
const bobberPos = new THREE.Vector3();
const rodTipWorld = new THREE.Vector3();

// DOM
const $ = id => document.getElementById(id);
const promptEl = $('prompt'), biteEl = $('biteIndicator'), castMeter = $('castMeter'), castFill = $('castFill');
const reelUI = $('reelUI'), tensionNeedle = $('tensionNeedle'), progressFill = $('progressFill'), reelFishName = $('reelFishName'), reelPct = $('reelPct');
const catchModal = $('catchModal');
const toastEl = $('toast');
const logDrawer = $('logDrawer'), logList = $('logList'), logSummary = $('logSummary');
const log = [];

function setPrompt(html, mode=''){
  promptEl.innerHTML = html;
  promptEl.className = 'prompt' + (mode? ' '+mode : '');
}
function showToast(msg, bad=false){
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (bad? ' bad':'');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.classList.add('hidden'), 2200);
}
const SAVE_KEY = 'reel-life-3d-save-v1';
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      score: G.score, caught: G.caught, best: G.best,
      log: log.map(e => ({ n: e.sp.name, w: e.weight }))
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
    (d.log || []).forEach(e => {
      const sp = SPECIES.find(x => x.name === e.n);
      if(sp) log.push({ sp, weight: e.w });
    });
  }catch(e){}
}
function updateStats(){
  $('score').textContent = G.score;
  $('caughtCount').textContent = G.caught;
  $('bestCatch').textContent = G.best ? `${G.best.name} ${G.best.weight}lb` : '—';
}
function addToLog(sp, weight){
  log.unshift({sp, weight});
  renderLog();
}
function renderLog(){
  if(!log.length){ logList.innerHTML = '<p class="empty">No fish yet. Cast your line!</p>'; logSummary.textContent=''; return; }
  logList.innerHTML = log.map(e=>`<div class="log-item"><span class="e">${fishSVG(e.sp)}</span><div><b>${e.sp.name}</b><small>${e.weight} lbs • ${e.sp.rarity.toUpperCase()}</small></div><span class="pts">+${e.sp.pts}</span></div>`).join('');
  const total = log.reduce((s,e)=>s+e.sp.pts,0);
  logSummary.textContent = `${log.length} caught • ${total} total pts • Best: ${Math.max(...log.map(e=>e.weight))} lbs`;
}

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function setState(s){
  G.state = s;
  biteEl.classList.remove('show');
  castMeter.classList.toggle('hidden', s!=='charging');
  reelUI.classList.toggle('hidden', s!=='reeling');
  if(s==='aim'){ setPrompt(isTouch
      ? 'Drag to aim — <b>hold</b> to charge, release to cast!'
      : 'Move mouse to aim — <b>hold CLICK</b> to charge, release to cast!'); bobber.visible=false; line.visible=false; bobberRing.visible=false; bobberRing2.visible=false; }
  if(s==='waiting'){ setPrompt('Waiting for a bite… <b>click</b> to reel in early', 'waiting'); }
  if(s==='bite'){ setPrompt('BITE! <b>CLICK / SPACE</b> NOW!', 'bite'); biteEl.classList.add('show'); }
  if(s==='reeling'){ promptEl.style.display = 'none'; }
  else promptEl.style.display = '';
}

// ---------- Casting ----------
function startCharge(){
  if(G.state!=='aim') return;
  ensureAudio();
  setState('charging');
  G.castPower = 0; G.castDir = 1;
}
function releaseCast(){
  if(G.state!=='charging') return;
  const power = G.castPower; // 0..1
  const dist = lerp(5.5, 16, power);
  const yaw = G.aimYaw;
  const dir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  bobber.visible = true; line.visible = true;
  bobberPos.copy(rodTipWorld);
  bobber.position.copy(bobberPos);
  G.bobberVel.copy(dir.multiplyScalar(lerp(6, 16, power)));
  G.bobberVel.y = lerp(4, 7, power);
  G.state = 'casting';
  setPrompt('Splash!', 'waiting');
  sfx.cast();
  // rod swing animation via rodPivot rotation handled in loop
  G.rodSwing = 1;
}
function landBobber(){
  bobberPos.y = 0.1;
  bobber.position.copy(bobberPos);
  spawnSplash(bobberPos, 20, 1.2);
  spawnRipple(bobberPos);
  sfx.splash();
  G.waitTimer = rand(2.5, 6.5);
  setState('waiting');
}
function triggerBite(){
  G.biteWindow = 1.4;
  G.biteDip = 1;
  setState('bite');
  sfx.bite();
  spawnSplash(bobberPos, 10, 0.6);
}
function setRing(){
  const show = ['waiting','bite','reeling'].includes(G.state);
  bobberRing.visible = show; bobberRing2.visible = show;
  bobberRing.position.set(bobberPos.x, 0.34, bobberPos.z);
  bobberRing2.position.set(bobberPos.x, 0.3, bobberPos.z);
  const pulse = 1 + Math.sin(G.time*2.6)*0.08;
  bobberRing.scale.set(pulse, pulse, pulse);
  const p2 = 1 + Math.sin(G.time*1.7+1)*0.1;
  bobberRing2.scale.set(p2, p2, p2);
}
function hookFish(){
  hookedSpecies = pickSpecies();
  if(hookedFish) scene.remove(hookedFish);
  hookedFish = createFish(hookedSpecies, 1);
  hookedFish.position.copy(bobberPos); hookedFish.position.y = -0.8;
  scene.add(hookedFish);
  G.tension = 25; G.progress = 0;
  G.fishStrength = hookedSpecies.strength;
  G.fishDist = clamp(bobberPos.distanceTo(player.position), 4, 30);
  G.surgeTimer = 0; G.snapTimer = 0;
  reelFishName.innerHTML = `<span class="reel-fish">${fishSVG(hookedSpecies)}</span> ${hookedSpecies.name} on the line!`;
  setState('reeling');
  sfx.hook();
  spawnSplash(bobberPos, 16, 1);
}
function catchFish(){
  const sp = hookedSpecies;
  const weight = (rand(sp.minW, sp.maxW)).toFixed(1);
  G.score += sp.pts; G.caught++;
  if(!G.best || parseFloat(weight) > parseFloat(G.best.weight)) G.best = {name:sp.name, weight};
  addToLog(sp, weight);
  updateStats();
  saveGame();
  // fly fish to player
  if(hookedFish){
    hookedFish.position.copy(bobberPos);
    // simple arc handled in 'caught' state
    G.caughtAnim = 0;
  }
  $('catchRarity').textContent = sp.rarity.toUpperCase() + ' CATCH';
  $('catchRarity').className = 'modal-eyebrow' + (sp.rarity!=='common' ? ' '+sp.rarity : '');
  catchModal.querySelector('.modal-card').className = 'modal-card ' + sp.rarity;
  $('catchIcon').innerHTML = fishSVG(sp);
  $('catchName').textContent = sp.name;
  $('catchWeight').textContent = weight + ' lbs';
  $('catchPoints').textContent = '+' + sp.pts + ' pts';
  $('catchDesc').textContent = sp.desc;
  catchModal.classList.remove('hidden');
  setState('caught');
  if(sp.rarity==='legendary') sfx.legendary(); else sfx.catch_();
  spawnSplash(bobberPos, 24, 1.4);
}
function escapeFish(reason){
  if(hookedFish){ scene.remove(hookedFish); hookedFish = null; }
  showToast(reason, true);
  sfx.escape();
  setState('aim');
}
function reelInEarly(){
  // cancel waiting/bite -> back to aim
  bobber.visible = false; line.visible = false;
  spawnRipple(bobberPos);
  sfx.plip();
  setState('aim');
}

// ---------- Input ----------
let pointerDown = false;
canvas.addEventListener('pointermove', e=>{
  if(['aim','charging','casting'].includes(G.state)){
    const nx = (e.clientX / innerWidth) * 2 - 1; // -1..1
    G.aimYaw = clamp(nx * 0.9, -1.0, 1.0);
  }
  if(G.dragging){
    G.camYaw += (e.clientX - G.lastPX) * 0.005;
    G.camPitch = clamp(G.camPitch - (e.clientY - G.lastPY) * 0.004, 0.12, 0.9);
    G.lastPX = e.clientX; G.lastPY = e.clientY;
  }
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('pointerdown', e=>{
  ensureAudio();
  pointerDown = true;
  if(e.button === 2 || e.button === 1){
    // right / middle drag orbits the camera
    G.dragging = true; G.lastPX = e.clientX; G.lastPY = e.clientY;
    return;
  }
  handlePress();
});
addEventListener('pointerup', ()=>{
  pointerDown = false; G.dragging = false;
  handleRelease();
});
function handlePress(){
  if(G.state==='aim') startCharge();
  else if(G.state==='bite'){ hookFish(); G.reelHeld = true; }
  else if(G.state==='waiting') reelInEarly();
  else if(G.state==='reeling') G.reelHeld = true;
}
function handleRelease(){
  if(G.state==='charging') releaseCast();
  else if(G.state==='reeling') G.reelHeld = false;
}
addEventListener('keydown', e=>{
  if(e.code==='Space'){
    e.preventDefault();
    if(e.repeat) return;
    ensureAudio();
    if(G.state==='aim') startCharge();
    else if(G.state==='bite'){ hookFish(); G.reelHeld = true; }
    else if(G.state==='waiting') reelInEarly();
    else if(G.state==='reeling') G.reelHeld = true;
  }
  if((e.code==='Enter' || e.code==='NumpadEnter') && G.state==='caught'){ $('continueBtn').click(); }
  if(e.code==='KeyA' || e.code==='ArrowLeft') G.aimYaw = clamp(G.aimYaw - 0.08, -1, 1);
  if(e.code==='KeyD' || e.code==='ArrowRight') G.aimYaw = clamp(G.aimYaw + 0.08, -1, 1);
});
addEventListener('keyup', e=>{
  if(e.code==='Space'){
    if(G.state==='charging') releaseCast();
    else if(G.state==='reeling') G.reelHeld = false;
  }
});

// UI buttons
$('startArt').innerHTML = ICON.startArt;
$('soundBtn').innerHTML = ICON.soundOn;
$('startBtn').addEventListener('click', ()=>{
  ensureAudio();
  $('startOverlay').classList.add('hidden');
  setState('aim');
  showToast('Good luck, angler!');
});
$('continueBtn').addEventListener('click', ()=>{
  catchModal.classList.add('hidden');
  if(hookedFish){ scene.remove(hookedFish); hookedFish = null; }
  setState('aim');
});
$('logBtn').addEventListener('click', ()=>logDrawer.classList.toggle('hidden'));
$('resetBtn').addEventListener('click', ()=>{
  G.score = 0; G.caught = 0; G.best = null; log.length = 0;
  updateStats(); renderLog(); saveGame();
  showToast('Session reset — tight lines!');
});
$('closeLog').addEventListener('click', ()=>logDrawer.classList.add('hidden'));
$('soundBtn').addEventListener('click', function(){
  soundOn = !soundOn;
  this.innerHTML = soundOn ? ICON.soundOn : ICON.soundOff;
  this.classList.toggle('off', !soundOn);
  if(soundOn) ensureAudio();
  showToast(soundOn ? 'Sound on' : 'Sound off');
});

// ---------- Resize ----------
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Adaptive quality (helps low-end devices / software GL) ----------
let perfFrames = 0, perfTime = 0, perfChecked = false;
function checkPerformance(dt){
  if(perfChecked) return;
  perfFrames++; perfTime += dt;
  if(perfFrames < 90) return;
  perfChecked = true;
  const fps = perfFrames / perfTime;
  if(fps < 40) renderer.setPixelRatio(Math.min(1, devicePixelRatio));
  if(fps < 22){
    renderer.shadowMap.enabled = false;
    scene.traverse(o => { if(o.material) o.material.needsUpdate = true; });
  }
}

// ---------- Animation loop ----------
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
let menuOrbit = 0;

function animate(){
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  G.time += dt;
  checkPerformance(rawDt);
  waterUniforms.uTime.value = G.time;

  // far shore across the lake (hides the water plane's edge)
{
  const shoreSand = new THREE.Mesh(new THREE.PlaneGeometry(300, 14), new THREE.MeshStandardMaterial({color:0xe6d09a,roughness:1}));
  shoreSand.rotation.x = -Math.PI/2; shoreSand.position.set(0, 0.16, -103); scene.add(shoreSand);
  const shoreGrass = new THREE.Mesh(new THREE.PlaneGeometry(300, 70), new THREE.MeshStandardMaterial({color:0x4e9e57,roughness:1}));
  shoreGrass.rotation.x = -Math.PI/2; shoreGrass.position.set(0, 0.3, -122); scene.add(shoreGrass);
  // a soft hill line behind the treeline
  const hillMat = new THREE.MeshStandardMaterial({color:0x6f9b83,roughness:1,flatShading:true});
  for(let i=0;i<5;i++){
    const hh = rand(10,20), rr = rand(36,58);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), hillMat);
    hill.position.set(-135 + i*70 + rand(-18,18), hh/2 - 3, -152 + rand(-16,10));
    hill.rotation.y = rand(0,3);
    scene.add(hill);
  }
  // treeline
  for(let i=0;i<54;i++){
    const x = -125 + Math.random()*250;
    const z = -104 - Math.random()*26;
    const sc = rand(0.75, 1.5);
    makeTree(x, z, sc, 0.3);
  }
}

// clouds drift
  for(const c of clouds){ c.position.x += dt*0.6; if(c.position.x>85) c.position.x=-85; }
  // birds
  for(const b of birds){
    const u = b.userData;
    const a = G.time * u.speed * 0.08 + u.phase;
    b.position.set(Math.cos(a)*u.r, u.h + Math.sin(G.time+u.phase)*0.5, Math.sin(a)*u.r - 15);
    b.rotation.y = -a;
    const flap = Math.sin(G.time*10 + u.phase)*0.6;
    u.w1.rotation.z = flap; u.w2.rotation.z = -flap;
  }
  // ambient fish
  for(const f of ambientFish){
    const u = f.userData;
    const a = G.time * u.speed + u.phase;
    f.position.set(u.cx + Math.cos(a)*u.r, u.y + Math.sin(G.time*0.8+u.phase)*0.2, u.cz + Math.sin(a)*u.r);
    f.rotation.y = -a - Math.PI/2 + (u.speed<0 ? Math.PI : 0);
    f.userData.tail.rotation.y = Math.sin(G.time*8 + u.phase)*0.5;
  }

  // player faces aim direction
  player.rotation.y = G.aimYaw;
  // rod pose
  let rodPitch = -1.05 + Math.sin(G.time*1.5)*0.025; // idle sway
  let bend = 0;
  if(G.state==='charging'){ rodPitch = -1.05 - G.castPower*0.4; }
  if(G.state==='casting' && G.rodSwing>0){ rodPitch = -1.05 + Math.sin(G.rodSwing*Math.PI)*0.7; G.rodSwing -= dt*2.2; }
  if(G.state==='reeling'){ bend = G.tension/100 * 0.45; rodPitch = -0.95; }
  if(G.state==='waiting' || G.state==='bite'){ rodPitch = -1.08; }
  rodBase.rotation.x = rodPitch;
  rodTipJoint.rotation.x = bend;
  rodTipObj.getWorldPosition(rodTipWorld);

  // bobber physics / float
  if(G.state==='casting'){
    G.bobberVel.y -= 14*dt;
    bobberPos.addScaledVector(G.bobberVel, dt);
    bobber.position.copy(bobberPos);
    bobber.rotation.x += dt*6;
    if(bobberPos.y <= 0.1){ landBobber(); }
  } else if(G.state==='waiting' || G.state==='bite' || G.state==='reeling'){
    bobberPos.y = 0.12 + Math.sin(G.time*2.2)*0.05;
    if(G.state==='bite') bobberPos.y -= G.biteDip*0.18;
    bobber.position.copy(bobberPos);
    bobber.rotation.z = Math.sin(G.time*2)*0.15;
    setRing();
    // line to bobber
    updateLine(rodTipWorld, bobberPos, 0.35);
    line.visible = true;
  } else if(G.state==='charging' || G.state==='aim'){
    // line dangling from rod tip
    const hang = rodTipWorld.clone(); hang.y -= 1.2; hang.z += 0.3;
    updateLine(rodTipWorld, hang, 0.15);
    line.visible = G.state==='charging';
  }
  if(G.state==='casting'){ updateLine(rodTipWorld, bobberPos, 0.2); bobberRing.visible = false; bobberRing2.visible = false; }

  // waiting -> bite
  if(G.state==='waiting'){
    G.waitTimer -= dt;
    if(Math.random()<dt*0.3) spawnRipple(bobberPos);
    if(G.waitTimer<=0) triggerBite();
  }
  if(G.state==='bite'){
    G.biteWindow -= dt;
    G.biteDip = Math.max(0, G.biteDip - dt*2);
    if(G.biteWindow<=0){
      showToast('It got away… too slow!', true);
      sfx.escape();
      setState('aim');
    }
  }

  // charging power ping-pong
  if(G.state==='charging'){
    G.castPower += G.castDir * dt * 1.1;
    if(G.castPower>=1){ G.castPower=1; G.castDir=-1; }
    if(G.castPower<=0){ G.castPower=0; G.castDir=1; }
    castFill.style.width = (G.castPower*100)+'%';
  }

  // reeling minigame
  if(G.state==='reeling'){
    // fish surges
    G.surgeTimer -= dt;
    let surge = 0;
    if(G.surgeTimer<=0){ G.surgeTimer = rand(0.8, 2.0); G.surge = rand(0.5,1.0); }
    surge = (G.surge||0) * Math.max(0, Math.sin(G.time*3));
    const pull = G.fishStrength * (0.6 + surge*0.9) * 30; // 0..~30
    if(G.reelHeld){
      G.tension += (22 + pull*0.4) * dt;
      G.fishDist -= dt * 2.2;
      if(Math.random()<dt*8) sfx.reelTick();
      reelMesh.rotation.x += dt*20;
    } else {
      G.tension -= (14 + pull*0.3) * dt;
      G.fishDist += dt * 0.6;
    }
    G.tension = clamp(G.tension, 0, 100);
    G.fishDist = clamp(G.fishDist, 1.5, 32);
    // progress only in safe zone
    const inSafe = G.tension>=18 && G.tension<=78;
    if(inSafe) G.progress += dt * (14 + (78-G.tension)*0.08);
    else if(G.tension>78) G.progress -= dt*4;
    G.progress = clamp(G.progress, 0, 100);
    // snap check
    if(G.tension>=98){ G.snapTimer += dt; if(G.snapTimer>0.55){ sfx.snap(); escapeFish('Line snapped! Too much tension!'); } }
    else G.snapTimer = 0;
    if(G.tension<=2 && G.progress<30){ /* fish slack - slow escape pressure */ }
    if(G.progress>=100){ catchFish(); }
    // hooked fish thrash near bobber
    if(hookedFish){
      hookedFish.position.lerp(new THREE.Vector3(bobberPos.x, -0.7 + Math.sin(G.time*14)*0.25, bobberPos.z), 0.2);
      hookedFish.rotation.y = G.time*6;
      hookedFish.rotation.z = Math.sin(G.time*16)*0.5;
      hookedFish.userData.tail.rotation.y = Math.sin(G.time*22)*0.8;
      // pull bobber toward player as you reel
      const toPlayer = player.position.clone().sub(bobberPos); toPlayer.y = 0;
      const d = toPlayer.length();
      if(d>2){ toPlayer.normalize(); bobberPos.addScaledVector(toPlayer, dt * (G.reelHeld? 1.6 : 0.3)); }
      if(Math.random()<dt*3) spawnSplash(bobberPos, 3, 0.5);
    }
    // UI
    tensionNeedle.style.left = `calc(${G.tension}% - 3px)`;
    progressFill.style.width = G.progress+'%';
    reelPct.textContent = Math.floor(G.progress)+'%';
    // camera shake on surge
    if(surge>0.7){ camera.position.x += rand(-0.06,0.06); camera.position.y += rand(-0.04,0.04); }
  }

  // caught: fish flies to player
  if(G.state==='caught' && hookedFish){
    G.caughtAnim = Math.min(1, (G.caughtAnim||0) + dt*1.4);
    const t = G.caughtAnim;
    const start = bobberPos.clone();
    const end = player.position.clone(); end.y += 1.6;
    hookedFish.position.lerpVectors(start, end, t);
    hookedFish.position.y += Math.sin(t*Math.PI)*2.2;
    hookedFish.rotation.y += dt*8;
    hookedFish.rotation.z = Math.sin(G.time*10)*0.3;
    bobber.visible = false; line.visible = false;
  }

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.userData.life -= dt;
    p.userData.vel.y -= 9*dt;
    p.position.addScaledVector(p.userData.vel, dt);
    p.material.opacity = Math.max(0, p.userData.life);
    if(p.userData.life<=0 || p.position.y<-0.5){ scene.remove(p); particles.splice(i,1); }
  }
  for(let i=ripples.length-1;i>=0;i--){
    const r = ripples[i];
    r.userData.life -= dt;
    const s = 1 + (1.2 - r.userData.life)*4;
    r.scale.set(s,s,s);
    r.material.opacity = Math.max(0, r.userData.life*0.6);
    if(r.userData.life<=0){ scene.remove(r); ripples.splice(i,1); }
  }

  // camera
  const portrait = innerHeight > innerWidth;
  const baseFov = portrait ? 64 : 52;
  const wantFov = ['waiting','bite','reeling'].includes(G.state) ? baseFov - 10 : baseFov;
  if(Math.abs(camera.fov - wantFov) > 0.05){
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt*3.5);
    camera.updateProjectionMatrix();
  }
  if(G.state==='menu'){
    menuOrbit += dt*0.12;
    camera.position.set(Math.sin(menuOrbit)*17, 5.4, Math.cos(menuOrbit)*17 + 4);
    camera.lookAt(0, 1.2, -2);
  } else {
    const baseYaw = G.aimYaw*0.55 + G.camYaw;
    const castDist = G.state==='aim' ? 0 : Math.min(6, Math.hypot(bobberPos.x-player.position.x, bobberPos.z-player.position.z)*0.18);
    const portrait = innerHeight > innerWidth;
    const dist = (G.state==='reeling' ? 9.6 : 9.0) + castDist + (portrait ? 1.4 : 0);
    // over-the-shoulder offset keeps the player from blocking the bobber
    const side = (G.state==='aim' || G.state==='charging' ? 1.6 : 2.9) * (portrait ? 0.8 : 1);
    const cx = player.position.x + Math.sin(baseYaw)*dist + Math.cos(baseYaw)*side;
    const cz = player.position.z + Math.cos(baseYaw)*dist - Math.sin(baseYaw)*side;
    const cy = player.position.y + 1.05 + G.camPitch*2.2;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.07);
    const castOut = ['waiting','bite','reeling','casting'].includes(G.state);
    if(castOut){
      // frame the bobber, nudged so the angler sits left of centre
      const pan = innerWidth > innerHeight ? 1.25 : 0;
      camTarget.set(
        bobberPos.x + Math.cos(G.aimYaw)*pan,
        0.58,
        bobberPos.z - Math.sin(G.aimYaw)*pan
      );
    } else {
      camTarget.set(
        player.position.x + Math.sin(G.aimYaw)*9,
        player.position.y - 0.55,
        player.position.z - Math.cos(G.aimYaw)*9
      );
    }
    G.camLook.lerp(camTarget, 0.05);
    camera.lookAt(G.camLook);
  }

  renderer.render(scene, camera);
}
loadGame();
updateStats();
renderLog();
animate();
window.__reelLife = { G, SPECIES, renderer, sun, scene, camera, bobberPos, bobber, bobberRing, water };
