import * as THREE from 'three';
import { exposedCuboidFaces } from './voxel-geometry.mjs?v=44';
import { ISLANDS, BOATS } from './archipelago.mjs?v=46';
import { dockLocation, SEA_BOUNDS, territoryCenter } from './navigation.mjs?v=44';
import { islandToWorld, worldToIsland, islandSurfaces } from './island-layout.mjs?v=45';
import { islandServices } from './island-data.mjs?v=45';
import { villagePathTiles } from './village-paths.mjs?v=44';

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const scratch = new THREE.Object3D();
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a + (b-a)*t;
const STORE_DETAILS = [
  { kind:'rod', name:'Rod Works', color:0x6aafcc, banner:'ROD WORKS' },
  { kind:'line', name:'Line & Spool', color:0xba9bd2, banner:'LINE & SPOOL' },
  { kind:'bait', name:'Bait Shack', color:0xe4a568, banner:'BAIT SHACK' },
  { kind:'market', name:'Fish Market', color:0x77b88b, banner:'FISH MARKET' },
  { kind:'port', name:'Boatyard & Dock', color:0x6ea3b5, banner:'BOATYARD & DOCK' },
];

// One vertex-coloured draw call for hundreds of cuboids; no imported models.
function mergeBoxes(specs,unlit=false){
  const pos=[], normals=[], colors=[], indices=[];
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
  let offset=0;
  const rotated=specs.filter(s=>s.rx||s.ry||s.rz);
  const tones=new Map();
  for(const face of exposedCuboidFaces(specs.filter(s=>!s.rx&&!s.ry&&!s.rz))){
    if(!tones.has(face.color))tones.set(face.color,new THREE.Color(face.color));const c=tones.get(face.color);
    for(const p of face.points){pos.push(...p);normals.push(...face.normal);colors.push(c.r,c.g,c.b);}
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);offset+=4;
  }
  for(const s of rotated){
    const g = new THREE.BoxGeometry(s.w,s.h,s.d);
    q.setFromEuler(new THREE.Euler(s.rx||0,s.ry||0,s.rz||0));
    matrix.compose(new THREE.Vector3(s.x,s.y,s.z),q,new THREE.Vector3(1,1,1));
    g.applyMatrix4(matrix);
    pos.push(...g.attributes.position.array);
    normals.push(...g.attributes.normal.array);
    const color = new THREE.Color(s.c);
    for(let i=0;i<24;i++) colors.push(color.r,color.g,color.b);
    for(const i of g.index.array) indices.push(i+offset);
    offset+=24; g.dispose();
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices); g.computeBoundingSphere();
  return new THREE.Mesh(g,unlit?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshLambertMaterial({vertexColors:true}));
}
function cube(w,h,d,color,x=0,y=0,z=0){
  const m=new THREE.Mesh(UNIT,new THREE.MeshLambertMaterial({color}));
  m.scale.set(w,h,d); m.position.set(x,y,z); return m;
}
const signMaterials=new Map();
function label(text, x,y,z,w=4.4,h=.65, color='#f4e5c5'){
  let front=signMaterials.get(text);
  if(!front){
  const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=128;
  const c=canvas.getContext('2d');
  c.fillStyle='#193d45'; c.fillRect(0,0,768,128);
  c.fillStyle=color; c.fillRect(12,12,744,4); c.fillRect(12,112,744,4);
  c.textAlign='center'; c.textBaseline='middle'; c.font='bold 52px monospace';
  c.fillText(text,384,67,720);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace; texture.magFilter=THREE.NearestFilter;
  front=new THREE.MeshBasicMaterial({map:texture});signMaterials.set(text,front);
  }
  // One material keeps a sign to one draw call (six material groups cost six).
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),front);
  m.position.set(x,y,z); return m;
}
function boatMesh(id){
  const b=BOATS[id], S=[];
  const add=(w,h,d,x,y,z,c)=>S.push({w,h,d,x,y,z,c});
  add(2.5,.55,5.7,0,.15,0,b.color);
  add(2.9,.45,4.6,0,.55,.25,b.color);
  add(2,.4,1.2,0,.5,-2.5,b.color);
  add(1.25,.35,.8,0,.5,-3.35,b.color);
  add(2.4,.18,4.8,0,.79,.2,0xdbc394);
  for(const x of [-1.35,1.35]) add(.16,.48,4.8,x,.9,.25,b.stripe);
  add(2.6,.5,.18,0,.9,2.6,b.stripe);
  add(2.45,.3,.46,0,.98,1.5,0x7f674e);
  add(.65,.7,.65,0,.95,-1.15,0x485563);
  add(.95,.15,.18,0,1.35,-1.15,b.stripe);
  if(id===0){
    // Refined starter Harbor Skiff: one merged mesh keeps its low draw-call cost.
    add(1.45,.18,2.7,0,1.02,-.3,0x936b45); // inset floor
    add(2.05,.16,.32,0,1.18,.75,0xc29a66); // rowing seat
    add(.18,.12,.32,-.8,1.15,-1.15,0xd5b982);add(.18,.12,.32,.8,1.15,-1.15,0xd5b982);
    add(.28,.45,.28,0,1.35,-1.35,0x52656a);add(.36,.1,.36,0,1.6,-1.35,0xf0c76d); // lantern
    add(.11,.15,.58,-1.18,1.12,.2,0x71543a);add(.11,.15,.58,1.18,1.12,.2,0x71543a); // gunwale trim
    add(.12,.12,2.6,-1.05,1.22,.05,0xdeb77b);add(.12,.12,2.6,1.05,1.22,.05,0xdeb77b);
    add(.18,.12,.42,-.55,1.12,1.2,0xd0b27d);add(.18,.12,.42,.55,1.12,1.2,0xd0b27d); // cleats
  }
  if(id>=2){
    for(const x of [-1.2,1.2]) for(const z of [-.9,2]) add(.13,1.8,.13,x,1.7,z,0x45576a);
    add(2.9,.18,3.5,0,2.65,.55,b.stripe);
    add(.35,.18,3.6,0,2.79,.55,b.color);
  } else {
    for(const x of [-1,1]) add(.12,.12,3.8,x*1.8,1,.1,0xdac09a);
  }
  if(id>=3){
    add(2.3,.62,.13,0,1.45,-1.08,0xbedfe6);
    add(.7,.35,.2,0,.5,-3.85,0x536578);
  }
  if(id>=4){ add(.35,1,.35,-.7,3.1,1.45,0x535a6d); add(.8,.18,.65,0,2.9,-.6,b.color); }
  if(id===5){ for(const x of [-1.48,1.48]) add(.16,.17,4.6,x,.65,.25,0xc6e8ff); add(.3,.9,.3,0,3.2,-.5,0xd0c3ff); }
  const g=new THREE.Group();g.name='player-boat';g.add(mergeBoxes(S));g.scale.setScalar(b.size);return g;
}

export function createWorld(scene){
  const root=new THREE.Group(); scene.add(root);
  const colliders=[], islands=[], distantIslands=[], stalls=[],questGivers=[],hubBuildings=[],aquariumTankSlots=[];
  const surfaces=ISLANDS.map(islandSurfaces);
  const waterUniforms={uTime:{value:0},uDeep:{value:new THREE.Color(0x16748b)},uLight:{value:new THREE.Color(0x58bdc4)},uFog:{value:new THREE.Color(0x9bd9ed)}};
  const waterMat=new THREE.ShaderMaterial({
    uniforms:waterUniforms, transparent:true,
    vertexShader:`uniform float uTime; varying vec2 vGrid; varying float vWave; varying float vDepth;
      void main(){ vec3 p=position; float w=sin(p.x*.13+uTime*.9)*.10+cos(p.z*.16+uTime*.7)*.10;
      p.y+=floor(w*16.)/16.; vWave=w; vGrid=p.xz/7.;
      vec4 mv=modelViewMatrix*vec4(p,1.); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform float uTime; uniform vec3 uDeep; uniform vec3 uLight; uniform vec3 uFog;
      varying vec2 vGrid; varying float vWave; varying float vDepth;
      void main(){ vec2 cell=floor(vGrid); float noise=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
      float q=floor(clamp(vWave*2.+.5,0.,1.)*4.)/4.; vec3 c=mix(uDeep,uLight,q)*(.94+noise*.12);
      vec2 edge=abs(fract(vGrid)-.5); c*=1.-step(.485,max(edge.x,edge.y))*.12*(1.-smoothstep(35.,140.,vDepth));
      float glint=step(.994,fract(sin(dot(cell,vec2(6.45,8.92))+floor(uTime*1.5))*41758.5));
      c+=glint*.19*(1.-smoothstep(35.,110.,vDepth));
      c=mix(c,uFog,smoothstep(100.,850.,vDepth)); gl_FragColor=vec4(c,.97); }`
  });
  const width=SEA_BOUNDS.maxX-SEA_BOUNDS.minX+800,depth=SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ+800;
  const centerX=(SEA_BOUNDS.minX+SEA_BOUNDS.maxX)/2,centerZ=(SEA_BOUNDS.minZ+SEA_BOUNDS.maxZ)/2;
  const water=new THREE.Mesh(new THREE.BoxGeometry(width,.10,depth,64,1,64),waterMat);
  water.position.set(centerX,-.08,centerZ); root.add(water);
  root.add(cube(width,1,depth,0x376f71,centerX,-4,centerZ));

  const sky=new THREE.Mesh(new THREE.BoxGeometry(2200,2200,2200),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{uTop:{value:new THREE.Color(0x559cbd)},uBottom:{value:new THREE.Color(0xd9edf0)}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}',
    fragmentShader:'uniform vec3 uTop;uniform vec3 uBottom;varying vec3 vP;void main(){float h=clamp(vP.y/800.,0.,1.);h=floor(h*8.)/8.;gl_FragColor=vec4(mix(uBottom,uTop,h),1.);}'
  }));
  sky.frustumCulled=false; scene.add(sky);
  const sun=cube(22,22,2,0xffefd0,120,120,-250); sun.material=new THREE.MeshBasicMaterial({color:0xffefd0,fog:false}); root.add(sun);

  for(const zone of ISLANDS){
    const layout=zone.layout,d=layout.dockX,side=layout.berthSide;
    const services=new Set(islandServices(zone.id));
    const stallLayout=layout.stalls.filter(st=>services.has(st.kind)).map(st=>({...STORE_DETAILS.find(meta=>meta.kind===st.kind),...st}));
    const localColliders=[];
    const group=new THREE.Group();group.name='island-'+zone.id;group.position.set(zone.x,0,zone.z);group.rotation.y=layout.yaw;root.add(group);
    const S=[],glows=[];
    const glow=(w,h,d,x,y,z,c)=>glows.push({w,h,d,x,y,z,c});
    const add=(w,h,d,x,y,z,c,more={})=>S.push({w,h,d,x,y,z,c,...more});
    const block=(x,z,r,top)=>localColliders.push({zone:zone.id,x,z,r,top});
    const blockRect=(x,z,w,d,top)=>localColliders.push({zone:zone.id,x,z,top,rect:{minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}});
    // Stepped, genuinely walkable island footprint. No invisible terrain walls.
    const islandWidth=zone.id===0?104:58,islandDepth=zone.id===0?104:46,islandCenterZ=zone.id===0?54:34;
    add(islandWidth,3.2,islandDepth,0,-1.2,islandCenterZ,zone.rock);
    add(islandWidth,.5,islandDepth,0,.25,islandCenterZ,zone.sand);
    add(islandWidth-4,.45,islandDepth-4,0,.725,islandCenterZ+.5,zone.land);
    for(const f of zone.landforms){
      // Build landforms as stacked, shrinking strata instead of a single
      // giant cuboid. Offset alternate tiers for a fractured voxel silhouette.
      const tiers=Math.max(2,Math.ceil(f.h/2.6)),th=f.h/tiers;
      for(let k=0;k<tiers;k++){
        const taper=1-k*.105,offset=k%2?(zone.id%2?.38:-.38):0;
        const layerColor=k===tiers-1?zone.land:k===0?zone.sand:zone.rock;
        add(f.w*taper,th+.03,f.d*taper,f.x+offset,.8+k*th+th/2,f.z+offset*.5,layerColor);
      }
      if(f.h>7){
        const cap=zone.theme==='ice'||zone.theme==='fjord'?0xdcebf0:zone.theme==='volcanic'||zone.theme==='vents'?0x4b4d59:zone.accent;
        add(f.w*.32,Math.min(3,f.h*.14),f.d*.3,f.x+zone.id%3-1,.8+f.h+.25,f.z,cap);
      }
    }
    // A connected peninsula carries each island's signature landmark.
    add(11,2.9,18,layout.landmarkX,-1.05,8,zone.rock);
    add(11,.5,18,layout.landmarkX,.25,8,zone.sand);
    add(10,.45,16,layout.landmarkX,.725,9,zone.land);
    // Pier, crosswalk and a separate boat berth.
    for(let i=0;i<16;i++){
      add(4.9,.3,.94,d,1,13-i, i%2 ? 0xba9465 : 0xa68357);
      if(i<13) add(3.4,.3,.94,d+side*9,1,13-i,i%2 ? 0xba9465 : 0xa68357);
    }
    add(12,.3,2.6,d+side*4.5,1,11.6,0xb38e60);
    for(const x of [-2.2,2.2,7.6,10.4].map(x=>d+side*x)) for(let z=0;z<14;z+=3){
      add(.23,2.2,.23,x,.25,z,0x68573e); add(.31,.22,.31,x,1.4,z,0xe7d6af);
    }
    // Low square foam/sand shelves read as a voxel shoreline.
    for(let i=0;i<14;i++){
      const x=-28+i*4.2;
      if(Math.abs(x-d)<3||Math.abs(x-(d+side*9))<2) continue;
      add(3.5,.12,.8,x,.12,10.6,0xd5eeea);
    }
    // One paving stone per grid cell. Paths meet at shared EDGES, not
    // coplanar overlapping blocks (the old radial paths flickered at the plaza).
    const paving=villagePathTiles(layout);
    for(const {x,z}of paving)add(1.72,.08,1.72,x,1.005,z,zone.sand);
    // Signature plants, using only cuboids. Keep the central village clear.
    function tree(x,z,s=1){
      add(.55*s,3.7*s,.55*s,x,.95+1.85*s,z,0x715a43);
      if(['tropical','jungle','coral'].includes(zone.theme)){
        for(const dir of [-1,1]){
          add(5*s,.55*s,1.3*s,x+dir*1.2*s,4.7*s,z,0x68a56b);
          add(1.3*s,.55*s,4.6*s,x,4.55*s,z+dir*1.2*s,0x7eb96e);
        }
        add(.6*s,.6*s,.6*s,x+.6*s,4.25*s,z,0x96724c);
      }else if(zone.theme==='swamp'){
        for(const side of [-1,1]){add(.35,2,.35,x+side*.65*s,1.9,z,0x5a6346,{rz:side*.3});add(3.8*s,.8*s,3.2*s,x,4.8*s,z,0x667d50);add(.17,1.5*s,.17,x+side*1.5*s,3.7*s,z,0x9aab77);}
      }else if(['canyon','wreck','vents','void','time','origin','celestial','fjord','coast','storm'].includes(zone.theme)){
        // Stone/crystal/ice pillars, not the same forest with a new tint.
        add(1.6*s,4*s,1.3*s,x,2.7*s,z,zone.rock);add(.9*s,2.4*s,.8*s,x+.4*s,5*s,z,zone.accent);
      }else{
        const leaf=zone.theme==='ice'?0xa5c5c2:zone.theme==='lunar'?0xb3a3d4:zone.theme==='volcanic'?0x846b70:zone.theme==='forest'?0x337969:0x529865;
        for(let j=0;j<4;j++){
          const w=(3.8-j*.7)*s;
          add(w,1.4*s,w,x,.95+(2.1+j*1.05)*s,z,leaf);
          if(zone.theme==='ice') add(w+.1,.25,w+.1,x,.95+(2.85+j*1.05)*s,z,0xf0f5ee);
        }
      }
      add(3.8*s,.03,3.8*s,x,.98,z,zone.theme==='ice'?0xc5dddf:zone.theme==='lunar'?0x6c6a91:0x628c63);
      block(x,z,.65*s,.95+6.6*s);
    }
    layout.trees.forEach(t=>tree(t.x,t.z,t.size));
    // Cubic grasses, mushrooms / coral / crystals around the edges.
    let seed=77+zone.id*100;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<60;i++){
      const side=i%2?1:-1,x=side*(21+random()*6),z=17+random()*36;
      const h=.18+random()*.45;
      const c=zone.theme==='lunar'?0xc3b9ef:zone.theme==='ice'?0xeaf7f4:zone.theme==='volcanic'?0xcf8d68:zone.theme==='tropical'?0xe39b87:0xb1ce86;
      add(.18,h,.18,x,.96+h/2,z,c);
      if(i%4===0) add(.5,.16,.5,x,1+h,z,c);
    }
    // Village lanterns and resting spots.
    for(const {x,z} of layout.lamps.filter(p=>paving.every(t=>Math.hypot(p.x-t.x,p.z-t.z)>1.15))){
      block(x,z,.35,4.3);
      add(.18,2.8,.18,x,2.3,z,0x4c6262); glow(.65,.65,.65,x,3.8,z,0xffdfa0); add(.85,.16,.85,x,4.2,z,0x3e5961);
      add(.6,.16,.6,x,1,z,0x657575);
    }
    {const {x,z}=layout.bench;if(stallLayout.every(st=>Math.hypot(st.x-x,st.z-z)>6)&&paving.every(t=>Math.hypot(t.x-x,t.z-z)>2.3)){block(x,z,1.4,2.4);add(2.5,.25,.8,x,1.55,z,0xa58863);add(2.5,.75,.15,x,2,z+.4,0xa58863);for(const dx of [-.85,.85])add(.18,.65,.6,x+dx,1.25,z,0x5b665f);}}
    // Dock props, all collidable where appropriate.
    add(.75,.6,.7,d-1.4,1.45,8,0x6f9ca3); add(.8,.14,.75,d-1.4,1.81,8,0xe4e7cd); block(d-1.4,8,.6,1.9);
    add(.6,.5,.6,d+1.5,1.4,6.8,0xcc8d65); block(d+1.5,6.8,.55,1.7);

    // A distinct silhouette for every island, visible from its fishing pier.
    const landmarkStart=S.length,colliderStart=localColliders.length,glowStart=glows.length,childStart=group.children.length;
    if(zone.theme==='harbor'){
      block(-22,6,2.8,15.8);
      for(let j=0;j<5;j++) add(3.6-j*.35,2.2,3.6-j*.35,-22,2+j*2.1,6,j%2?0xc47765:0xf1e5ce);
      add(3.7,.3,3.7,-22,11.8,6,0x3e6874); glow(2.5,1.5,2.5,-22,12.7,6,0xffdb84); add(3.8,.5,3.8,-22,13.6,6,0x3e6874);
      add(.4,2,.4,-22,14.7,6,0x536875); add(2,.8,.12,-21,15.3,6,zone.accent);
      for(let i=0;i<12;i++){add(.15,1.4,.15,-7-i*.65,.65,1+i%3,0x659c64);add(.3,.5,.3,-7-i*.65,1.4,1+i%3,0x9b7955);}
    }else if(zone.theme==='forest'){
      block(-22,7,3.3,7.1);
      add(5,5,6,-22,3.4,7,0x786b54); add(6,.6,7,-22,6.2,7,0x3c6f60); add(4.8,.5,7,-22,6.75,7,0x457e6a);
      add(2.6,1.7,.13,-22,4,3.95,0xc0dcce); add(.18,2,.2,-22,4,3.8,0x685842);
      const wheel=new THREE.Group();
      const bars=[]; for(let k=0;k<8;k++){const a=k*Math.PI/4;bars.push({w:.5,h:.65,d:2,x:Math.cos(a)*2,y:Math.sin(a)*2,z:0,c:0xb99461,rz:a});}
      bars.push({w:4.8,h:.24,d:.24,x:0,y:0,z:0,c:0xb99461},{w:.24,h:4.8,d:.24,x:0,y:0,z:0,c:0xb99461});
      wheel.add(mergeBoxes(bars)); wheel.position.set(-19,3.6,7);wheel.rotation.y=Math.PI/2; group.add(wheel); group.userData.wheel=wheel;
    }else if(zone.theme==='tropical'){
      for(const x of [-25,-18]){add(2.7,8,3.2,x,4.9,6,0xd3b582);add(3.1,.45,3.7,x,7.7,6,0xe8cc92);block(x,6,1.8,11);}
      add(10,2.1,3.7,-21.5,9.3,6,0xe1c28c);add(8.6,.6,3.3,-21.5,10.65,6,0xf0d6a2);
      for(let i=0;i<12;i++)add(.7,.8+(i%3)*.35,.7,-13+i,0,-9-(i%3),i%2?0xe0a09b:0x8dc8be);
    }else if(zone.theme==='ice'){
      block(-22,6,3.2,15);
      for(let k=0;k<5;k++)add(7-k,2.2,6-k*.7,-22,1+k*1.8,6,k%2?0xaadce7:0xc5e9ed);
      add(3.4,4,3.4,-22,11,6,0x6d8f9d);add(4.2,.6,4.2,-22,13,6,0xe4f4ef);glow(2,1.5,2,-22,14,6,0xc4efff);
      for(let i=0;i<6;i++)add(4-i*.35,2+i*.6,3,-20+i*6,0,-15-i%2*4,0xc5e9ed);
    }else if(zone.theme==='volcanic'){
      block(-22,6,4.8,18.5);
      for(let k=0;k<6;k++){
        add(10-k*1.4,2.3,9-k*1.2,-22,1.2+k*1.8,6,k%2?0x575869:0x4e4f61);
        glow(.65,2.35,.2,-21+k*.1,1.3+k*1.8,1.4+k*.6,0xee9b65);
        glow(.18,2.35,.7,-16.9-k*.7,1.3+k*1.8,6+k*.15,0xffae6d);
      }
      glow(2.2,.3,2.2,-22,11.6,6,0xffbd72);
      for(let k=0;k<4;k++)add(1.4+k*.5,.9,1.3+k*.4,-22+k*.3,13+k*1.6,6,0x9b949a);
    }else if(zone.theme==='river'){
      block(-22,6,4,14);
      for(let k=0;k<4;k++){add(10-k*1.8,3,9-k,-22,1.8+k*2.5,6,zone.rock);}
      // Twin falls part around a dark, framed cave mouth; the chamber recedes
      // behind the curtain to a still pool with a few luminous mineral seams.
      for(const [x,h] of [[-25.1,7],[-19.1,5]]){glow(1.5,h,.24,x,1+h/2,1.05,0x84cdda);add(2.4,.18,1.2,x,1.1,0,0xc2e4e4);}
      add(3.05,2.5,.16,-22,2.45,10.68,0x14242b);add(.62,3.25,.65,-23.72,2.63,10.72,0x687b7b);add(.62,3.25,.65,-20.28,2.63,10.72,0x687b7b);add(4.05,.7,.72,-22,4.4,10.7,0x718486);
      add(2.9,.18,5.6,-22,.83,7.7,0x384b50);add(3.1,.1,3.8,-22,.11,5.55,0x3b9eaf);
      for(const [x,y,z,c] of [[-23,1.7,8.5,0x7bd3ca],[-21.1,1.3,7.3,0x79bfce],[-23.1,2.5,9.2,0x89cfc1]]){add(.34,y,.38,x,y/2,z,c);glow(.55,.5,.55,x,y+.35,z,c);}
      for(const z of [3,9]){add(1.4,12,1.4,-17,6.5,z,0x8b9183);block(-17,z,1,13);}
      add(1.8,1.4,9,-17,12.8,6,0xb9bda4);
    }else if(zone.theme==='swamp'){
      for(let k=0;k<6;k++){const a=k*Math.PI/3,x=-22+Math.cos(a)*3,z=6+Math.sin(a)*3;add(1,8+(k%2)*2,1,x,5,z,0x626447,{rz:Math.cos(a)*.16});block(x,z,.8,11);add(2.8,1,2.6,x,9.7,z,0x738356);}
      for(let k=0;k<8;k++){add(.18,2.4,.18,-25+k*.9,7.5,3,0xadb98a);add(1.5,.16,1,-23+k%3*3,.12,-4-Math.floor(k/3)*2,0x7e9c63);}
      add(8,1.6,5,-22,10.8,6,0x526a48);
    }else if(zone.theme==='coral'){
      for(let k=0;k<7;k++){const x=-26+k*1.4,h=4+(k%3)*2;add(.9,h,1,x,1+h/2,6,0xd89caa);add(2.4,.6,1.3,x+.3,h,6,0xf0b6b0);add(.6,2, .8,x+1,h+1,6,0xe3b98f);block(x,6,.7,h+2);}
      for(let k=0;k<16;k++)add(1,.8+k%4*.6,1,-20+k*2,.2,-8-k%3*2,[0xde969e,0x89c7ba,0xe9c695][k%3]);
    }else if(zone.theme==='coast'){
      for(const z of [2,10]){add(4,10,3,-22,5.8,z,0x697786);add(3,3,2.5,-22,12,z,0x82929b);block(-22,z,2.4,14);}
      add(4.2,2.8,12,-22,14,6,0x7a8692);add(2,5,3,-14,1,-16,0x647787);add(3,7,4,-30,2,-14,0x74838b);
    }else if(zone.theme==='storm'){
      block(-22,6,3,19);for(let k=0;k<4;k++)add(6-k,2,6-k,-22,1.8+k*1.5,6,zone.rock);
      add(.7,11,.7,-22,12,6,0x9a785b);for(const y of [10,14,18]){add(5,.4,.5,-22,y,6,0xb89b6d);glow(.5,.6,.5,-19.5,y,6,0xcce9ef);}
      add(2.6,.35,2.6,-22,17,6,0x6d8798);
    }else if(zone.theme==='jungle'){
      block(-22,6,4.7,15);for(let k=0;k<5;k++)add(10-k*1.6,2,9-k*1.4,-22,1.8+k*1.8,6,k%2?0x78956b:0x697c5b);
      add(2.5,3,3,-22,11.3,6,0x405f48);for(const x of [-25,-19])add(.25,7,.25,x,7,1.8,0x3d784c);
      add(12,.8,3,-22,15,6,0x327c50);add(3,.8,10,-22,14.3,6,0x4d9356);
    }else if(zone.theme==='fjord'){
      for(const z of [1,11]){for(let k=0;k<4;k++)add(9-k*1.7,4,3.5,-22,2.4+k*3.4,z,k%2?0xaddbe5:0x87bdcf);block(-22,z,4.8,16);}
      for(let k=0;k<7;k++)add(3,2+k%3,3,-48+k*7,-.5,-15-k%2*5,0xb7dfea);
    }else if(zone.theme==='canyon'){
      for(let k=0;k<6;k++){const z=k<3?2:11,h=7+(k%3)*4;add(2.3,h,2.8,-26+k%3*3.5,h/2+1,z,zone.rock);add(1.5,2,2,-26+k%3*3.5,h+2,z,0x7e96a4);block(-26+k%3*3.5,z,1.6,h+3);}
      add(1.2,.3,12,-22,1,6,0x253a4b);
    }else if(zone.theme==='wreck'){
      block(-22,6,4.6,12);add(5,2,13,-22,2,6,0x756454);add(3,1,10,-22,3.4,6,0x9c8664);
      add(.5,10,.5,-22,8,7,0x635f56,{rz:.15});add(.2,5,4,-21,8,7,0xb5afa0);
      for(let k=0;k<5;k++)for(const side of [-1,1]){add(.6,5,.7,-22+side*3,4,1+k*2.3,0xd4ccb0,{rz:side*.2});add(1.8,.65,.7,-22+side*2.5,6.7,1+k*2.3,0xe1dac1);}
      add(1.2,1.2,2,-22,3.4,-1,0xd6cdb6);
    }else if(zone.theme==='vents'){
      for(let k=0;k<5;k++){const x=-26+k*2,h=5+k%3*3;add(1.8,h,2,x,1+h/2,5+k%2*3,zone.rock);add(2.2,.4,2.4,x,h+1,5+k%2*3,0xb79a63);glow(.7,.2,.8,x,h+1.3,5+k%2*3,0xe7ad6e);block(x,5+k%2*3,1.3,h+2);for(let j=0;j<3;j++)add(1+j*.5,.6,1+j*.4,x,h+3+j*1.5,5+k%2*3,0x7e7986);}
    }else if(zone.theme==='celestial'){
      block(-22,6,4,18);add(7,2,7,-22,2,6,0x7b88b2);add(2,9,2,-22,7,6,0xa3afd0);
      for(let k=0;k<8;k++){const a=k*Math.PI/4;add(1.1,2,1.2,-22+Math.cos(a)*5,11+Math.sin(a)*5,6,0x9eb8d5,{rz:a});}
      for(let k=0;k<5;k++)glow(.8,.8,.8,-26+k*2,14+(k%3)*2,4,0xe5f1ee);
    }else if(zone.theme==='void'){
      for(const z of [2,10]){add(4,7,3,-22,4.5,z,0x303648);add(3.4,6,2.5,-22.5,13,z,0x44475e,{rz:.12});glow(.15,.5,3.1,-20,8.8,z,0xafa5e0);block(-22,z,3,17);}
      glow(.18,4,1,-22,8,6,0x777caf);
    }else if(zone.theme==='time'){
      block(-22,6,4.5,17);for(const y of [1.6,15])add(8,1.2,7,-22,y,6,0xb8ad89);
      for(const x of [-25.5,-18.5])for(const z of [3,9])add(.6,13,.6,x,8,z,0x817862);
      for(let k=0;k<4;k++){add(6-k*1.4,1.4,5-k*1.1,-22,13-k*1.5,6,0xc3c7bd);add(1.8+k*1.2,1.3,1.4+k,-22,6-k*1.2,6,0xd5c79b);}
      glow(.18,4,.18,-22,7.5,6,0xf1dd9e);
    }else if(zone.theme==='origin'){
      block(-22,6,4.6,12);for(let k=0;k<5;k++)add(10-k*1.7,1.6,10-k*1.7,-22,1.8+k*1.3,6,0xd6ded0);
      glow(2,3.5,2,-22,9,6,0xe6f2e5);add(4,.5,4,-22,7.2,6,0x7fc5b9);
      for(const side of [-1,1]){add(.55,6,.55,-22+side*5,4.1,6,0xd7ddc7);add(3.5,.7,2,-22+side*5,7,6,0x8db4a0);}
    }else{
      for(const x of [-25,-18]){add(2,8.5,2.4,x,5,6,0x6b678f);add(2.5,.4,2.8,x,8.7,6,0xc9c0e7);block(x,6,1.5,11.5);}
      add(9.4,1.6,2.4,-21.5,10,6,0xa59dcd);add(7.4,.5,2.7,-21.5,11.1,6,0xd5cbed);
      glow(.35,2,2,-21.5,6.7,6,0xd3e7f5);add(1.1,1.1,.45,-21.5,6.7,5.85,0xa6a1cc);
      for(let k=0;k<8;k++){const x=-27+(k%4)*3.5,z=k<4?0:12;add(.8,1.7+k%3,.8,x,1.7,z,0xb4a5e0);add(1.2,.45,1.2,x,2.4+k%3*.5,z,0xcbd5ef);}
    }
    // Arches face east toward the fishing pier, not edge-on to the player.
    if(zone.theme==='tropical'||zone.theme==='lunar'){
      for(const b of S.slice(landmarkStart)){
        const dx=b.x+21.5,dz=b.z-6;
        b.x=-21.5+dz;b.z=6-dx;[b.w,b.d]=[b.d,b.w];
      }
      for(const b of localColliders.slice(colliderStart)){
        const dx=b.x+21.5,dz=b.z-6;
        b.x=-21.5+dz;b.z=6-dx;
      }
    }
    // Landmarks and their water obstacles switch sides with the actual berth.
    // Reflect the canonical landmark, not its color alone.
    if(layout.landmarkMirror<0){
      for(const b of [...S.slice(landmarkStart),...glows.slice(glowStart)]){b.x=-b.x;if(b.rz)b.rz=-b.rz;if(b.ry)b.ry=-b.ry;}
      for(const b of localColliders.slice(colliderStart))b.x=-b.x;
      for(const child of group.children.slice(childStart)){child.position.x=-child.position.x;child.rotation.y=-child.rotation.y;}
    }
    // Twenty authored block-terrain silhouettes. The village remains level
    // and walkable; the island's back-country now reads as its own geology,
    // not a shared four-lump ridge recolored per destination.
    const tadd=(w,h,d,x,y,z,c,more={})=>add(w,h,d,x,y,z-8,c,more);
    const tglow=(w,h,d,x,y,z,c)=>glow(w,h,d,x,y,z-8,c);
    const mesa=(x,z,w,d,h,color=zone.rock)=>{
      z-=8; // pull each authored landform closer to the village/pier view
      // Submerged footings make offshore shelves read as solid land, not
      // floating voxel stacks at the waterline.
      add(w*1.08,1.8,d*1.08,x,-.1,z,zone.rock);
      const tiers=Math.max(2,Math.ceil(h/2.4)),th=h/tiers;
      for(let k=0;k<tiers;k++){
        const shrink=k===0?0:.12*k;
        add(w*(1-shrink),th+.04,d*(1-shrink),x,.8+k*th+th/2,z,k===tiers-1?zone.land:color);
      }
    };
    const pillar=(x,z,w,d,h,color=zone.rock)=>{
      z-=8;
      add(w*1.35,1.9,d*1.35,x,-.05,z,zone.rock);
      const tiers=Math.max(2,Math.ceil(h/2.6)),th=h/tiers;
      for(let k=0;k<tiers;k++)add(w*(1-k*.11),th+.03,d*(1-k*.1),x,.8+k*th+th/2,z,k===tiers-1?zone.accent:color);
    };
    const waterTile=(x,z,w,d,color=zone.water)=>add(w,.06,d,x,.92,z-8,color);
    if(zone.theme==='harbor'){
      // Reed beds, a low horseshoe bank and lily-pad shelves around a pool.
      mesa(-20,58,18,7,2.8,zone.rock);mesa(19,60,15,6,2.2,zone.rock);waterTile(0,61,16,8,0x3b9b9b);
      for(let k=0;k<9;k++){const x=-25+k*6;tadd(.22,1.3+(k%3)*.35,.22,x,1.45,52+(k%2)*3,0x718c4a);tadd(.35,.22,.35,x,2.2+(k%3)*.35,52+(k%2)*3,0xd3be68);}
    }else if(zone.theme==='forest'){
      // Two wooded knolls split by a stepped stream cut.
      mesa(-18,61,18,15,10);mesa(18,61,20,17,14);for(let k=0;k<5;k++)waterTile(-2+k,58+k*1.3,2.2,9,0x4c9ca1);
      for(const x of [-24,-17,17,24])pillar(x,56,1.4,1.4,7,0x466d54);
    }else if(zone.theme==='river'){
      // A blocky escarpment with three separated falls pouring into a basin.
      mesa(0,63,46,15,16);waterTile(-14,56,4,11,0x76c8d3);waterTile(0,56,4,13,0x8bd9de);waterTile(14,56,4,10,0x6db9c7);
      for(const x of [-14,0,14]){tadd(5,.35,4,x,.92,49,0xc5e0dd);pillar(x,68,6,4,5,zone.rock);}
    }else if(zone.theme==='swamp'){
      // Silt islands and cypress-root columns divide black-green pools.
      for(const x of [-22,-11,0,11,22]){mesa(x,62,8,9,2.2,0x596b4e);for(const dx of [-2,0,2])tadd(.4,4+(dx===0?2:0),.4,x+dx,2.8,58,0x5d6344);}
      waterTile(-12,62,7,13,0x465c4d);waterTile(12,62,7,13,0x465c4d);tadd(1,7,1,0,4.3,70,0x716c4b,{rz:.18});
    }else if(zone.theme==='tropical'){
      // A stepped coral-sand atoll encircles a luminous lagoon opening.
      for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*20,z=61+Math.sin(a)*10;mesa(x,z,9,7,2.3,zone.sand);}
      waterTile(0,61,19,13,0x39bdba);for(const x of [-27,27])pillar(x,62,3,3,8,0xd8c18f);
    }else if(zone.theme==='coral'){
      // Branching reef towers with arms, fans and a channel through the reef.
      for(let k=0;k<7;k++){const x=-25+k*8,h=6+(k%3)*3;pillar(x,61,1.5,1.5,h,[0xdd9cab,0xd9c292,0x8cc9be][k%3]);for(const side of [-1,1])tadd(.8,1.2,.9,x+side*1.5,h*.55+1,61,[0xe2b5a8,0x91c8ba,0xf1d6a4][k%3],{rz:side*.35});}
      waterTile(0,62,6,18,0x35bec2);for(let k=0;k<5;k++)tadd(2,1.1,2,-18+k*9,1.35,72,0xe5cbb6);
    }else if(zone.theme==='coast'){
      // Broken stepped sea cliffs, detached stacks and a squared natural arch.
      mesa(-19,62,14,12,15);mesa(19,62,14,12,11);pillar(-28,55,5,5,12);pillar(28,56,5,5,16);
      tadd(5,2.5,4,-19,15.5,62,zone.rock);tadd(5,2.5,4,19,11.5,62,zone.rock);tadd(42,3.2,4,0,19,62,zone.rock);
    }else if(zone.theme==='storm'){
      // Lightning-split basalt blades: alternating heights and broken tops.
      for(let k=0;k<9;k++){const x=-28+k*7,h=7+(k*7%5)*2.5;pillar(x,61+(k%2)*4,3.5,4,h,k%2?0x586b79:zone.rock);tadd(1.1,1.2,1.1,x+1,h+1,61+(k%2)*4,0xb7c5bf);}
      mesa(0,72,14,5,3,0x455b70);
    }else if(zone.theme==='jungle'){
      // Braided delta bars, with three ramps feeding a split-channel valley.
      for(let arm=0;arm<3;arm++){const x=-18+arm*18;for(let k=0;k<3;k++)mesa(x+(k-1)*2,54+k*7,11,7,3+k, k%2?0x567d57:0x71845c);}
      waterTile(-8,65,5,18,0x4ca99a);waterTile(9,65,5,18,0x3b9186);
      for(const x of [-25,0,25])pillar(x,72,2,2,11,0x486d4c);
    }else if(zone.theme==='volcanic'){
      // A broken caldera ring surrounds a sunken lava lake and basalt teeth.
      for(let k=0;k<10;k++){const a=k*Math.PI/5,x=Math.cos(a)*19,z=62+Math.sin(a)*13;mesa(x,z,9,7,7+(k%3)*2,0x4a4e5c);}
      waterTile(0,62,16,11,0xf07848);tglow(16,.18,11,0,1.08,62,0xffa15c);
      for(let k=0;k<5;k++)pillar(-22+k*11,75,1.5,1.5,11+(k%2)*4,0x51515e);
    }else if(zone.theme==='ice'){
      // Layered blue ice floes, fractured ridges and clear crevasse stripes.
      for(let k=0;k<7;k++){const x=-27+k*9;mesa(x,62,12,18,4+(k%3)*3,k%2?0x91bfca:0xaed8e0);tadd(1.2,7+k%3*2,1.1,x,4.3+k%3*1.3,67,0xc6edf0);}
      waterTile(0,62,3,22,0x3987a8);waterTile(-15,60,2,14,0x63b6d0);waterTile(15,60,2,14,0x63b6d0);
    }else if(zone.theme==='fjord'){
      // Opposing glacial walls climb in broad steps around a narrow inlet.
      for(let k=0;k<7;k++){const h=12+(k%3)*7;mesa(-25+k*1.2,64,12,25,h,0x729bad);mesa(25-k*1.2,64,12,25,h+4,0x85b4c6);}
      waterTile(0,64,10,28,0x2c91b2);for(let k=0;k<4;k++)pillar(-29+k*19,50,4,3,8+k%2*4,0xd2edf0);
    }else if(zone.theme==='canyon'){
      // Twin mesa walls drop into a visibly dark square-bottomed chasm.
      mesa(-21,64,12,25,19,0x586c7a);mesa(21,64,12,25,22,0x74838d);
      for(let k=0;k<6;k++)tadd(2.2,2.2,2.2,-20+k*8,1.1,64,0x263d50);waterTile(0,64,8,28,0x204b60);
      for(let k=0;k<5;k++)pillar(-24+k*12,50,3,3,9+(k%2)*5,0x647d8a);
    }else if(zone.theme==='wreck'){
      // A line of fossil ribs rises from a layered seabed and broken hull.
      mesa(0,68,45,15,6,0x76776d);for(let k=0;k<8;k++){const x=-24+k*7;tadd(.65,9+(k%3)*2,.8,x,5.5,62,0xd0c7aa,{rz:(k%2?1:-1)*.16});tadd(4,.75,.8,x,10,66,0xe1dbc5);}
      tadd(15,3,26,0,3.3,67,0x675f53,{rz:.12});for(const x of [-24,24])pillar(x,72,2,2,12,0xbeb8a5);
    }else if(zone.theme==='vents'){
      // Hydrothermal chimney field with tiered cones and suspended smoke caps.
      for(let k=0;k<9;k++){const x=-28+(k%3)*14,z=57+Math.floor(k/3)*9,h=7+(k*5%4)*2;mesa(x,z,5,5,h,0x4e5260);tadd(1.1,h+2,1.1,x,h+1.8,z,0x957e69);tglow(2,.18,2,x,h+2.5,z,0xf4ab6a);tadd(2.4,1.2,2.4,x,h+6,z,0x777684);}
      waterTile(0,66,18,10,0x6a6f83);
    }else if(zone.theme==='lunar'){
      // Concentric temple terraces step down to a moonlit square basin.
      mesa(0,65,40,28,5,0x6a688d);mesa(0,65,30,20,5,0x8884ad);mesa(0,65,20,12,4,0xa9a3c4);waterTile(0,65,8,5,0xb4c2e1);
      for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*22,z=65+Math.sin(a)*15;pillar(x,z,2.5,2.5,12,0x726e99);}
    }else if(zone.theme==='celestial'){
      // Meteor crater rim and scattered square impact ejecta.
      for(let k=0;k<12;k++){const a=k*Math.PI/6,x=Math.cos(a)*19,z=64+Math.sin(a)*15;mesa(x,z,8,7,4+(k%4)*2,0x667798);}
      waterTile(0,64,16,12,0x425f94);for(let k=0;k<8;k++)pillar(-27+k*8,76,1.7,1.7,5+(k%4)*2,0xa7bdd9);
      for(let k=0;k<5;k++)tglow(1.4,.3,1.4,-16+k*8,4,80,0xaadfff);
    }else if(zone.theme==='void'){
      // The trench is a cleft, not a plain: tall black walls face an empty rift.
      for(const x of [-22,22]){mesa(x,65,13,30,24,x<0?0x2d3245:0x393c50);for(let k=0;k<4;k++)pillar(x+(k-1.5)*3,58,1.5,2.5,18+(k%2)*7,0x474b60);}
      waterTile(0,65,8,32,0x151a2b);tglow(.2,18,.25,0,9,65,0x777caf);
    }else if(zone.theme==='time'){
      // Layered hourglass-shaped cliffs pinch inward, then fan into broad shelves.
      for(let k=0;k<7;k++){const w=42-k*4.2,z=52+k*5.2;tadd(w,2.2,5,-0,.8+1.1, z, k%2?0x897f70:0xb4aa95);tadd(w*.68,2.2,4,0,.8+3.3,z+2,0x777e88);}
      pillar(-24,68,3,3,16,0x817c70);pillar(24,68,3,3,16,0x817c70);tglow(.2,8,.2,0,10,62,0xf4dfa4);
    }else if(zone.theme==='origin'){
      // Broad concentric primordial terraces descend toward the first spring.
      mesa(0,65,46,34,3,0xcbd3c7);mesa(0,65,36,26,3,0xdce1d2);mesa(0,65,26,18,3,0xe9e4d1);mesa(0,65,14,9,2,0x9dc9c0);
      waterTile(0,65,8,5,0x76cfc2);for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*25,z=65+Math.sin(a)*18;pillar(x,z,2.4,2.4,4+k%3*2,0x9eb6aa);}
    }
    // Central home-base quest characters, built in the same blocky style as vendors.
    const npcSpecs=zone.id===0?[
      {id:'old-fisher',name:'Old Fisherman',x:-18,z:45,color:0x728e68},
      {id:'marine-biologist',name:'Marine Biologist',x:-9,z:45,color:0x5b9bab},
      {id:'boat-mechanic',name:'Boat Mechanic',x:0,z:45,color:0xc18455},
      {id:'fish-collector',name:'Fish Collector',x:9,z:45,color:0x688b91}
    ]:zone.id===2?[{id:'island-explorer',name:'Island Explorer',x:-12,z:20,color:0x9c7d54}]:zone.id===10?[{id:'mysterious-angler',name:'Mysterious Angler',x:10,z:22,color:0x716b91}]:[];
    for(const npc of npcSpecs){
      const {x,z}=npc;add(.78,1.2,.58,x,1.6,z,npc.color);add(.62,.62,.62,x,2.5,z,0xe3bb96);add(.72,.2,.7,x,2.83,z,0x514a45);
      add(.09,.09,.06,x-.14,2.53,z+.31,0x243b42);add(.09,.09,.06,x+.14,2.53,z+.31,0x243b42);
      group.add(label(npc.name.toUpperCase(),x,3.35,z,5.4,.56));
      questGivers.push({...npc,zone:zone.id,...islandToWorld(zone,x,z)});
    }
    // Stalls, merchandise and friendly cube vendors. Separate stock, no tabs of remote purchases.
    for(const st of stallLayout){
      const x=st.x,z=st.z,base=1;
      const color=zone.theme==='lunar'?0x9f95c0:zone.theme==='volcanic'?0xa88170:st.color;
      add(4.5,1.05,1.5,x,base+.525,z,0x846b50);add(4.8,.2,1.8,x,base+1.12,z,0xd1b58a);
      add(4.6,.13,1.8,x,base+.8,z,color);
      for(const dx of [-2,2]) for(const dz of [-.65,.65]) add(.18,3.3,.18,x+dx,base+1.65,z+dz,0x655a46);
      for(let i=0;i<7;i++) add(.8,.22,3.6,x-2.4+i*.8,base+3.3,z,i%2?0xf1e2c3:color);
      add(4.4,2.5,.15,x,base+1.3,z+1.25,0x9a7c56);
      // Separate cladding faces and raised trim: none share a coplanar
      // surface with the wall. 20 villages still use one main geometry each.
      for(let j=0;j<5;j++)add(4.4,.09,.12,x,base+.25+j*.38,z+1.39,0xb39b77);
      add(5.8,.18,4.1,x,base+3.55,z,zone.rock);add(5.25,.35,3.6,x,base+3.82,z,zone.accent);
      for(const dx of [-2.5,2.5]){add(.35,.4,.35,x+dx,base+2.7,z-1.2,0x465d60);glow(.2,.25,.2,x+dx,base+2.75,z-1.25,0xf2d5a3);}
      add(1,.65,.9,x-3,base+.325,z+.4,0xa48661);add(1.08,.1,.98,x-3,base+.7,z+.4,0xc8a97d);
      add(1.6,.13,.4,x-1,base+2.05,z+1.02,0xd7bd92);
      // Local building craft changes with the environment, while all of it
      // remains vertex-coloured cuboids in the island's existing batch.
      if(['forest','river','jungle','swamp'].includes(zone.theme)){
        for(let k=0;k<3;k++)add(5.5-k*.9,.24,3.8-k*.6,x,base+4.08+k*.24,z,zone.theme==='swamp'?0x9c9b67:0x716c51);
        if(zone.theme==='jungle'||zone.theme==='swamp')for(const dx of [-2.3,2.3])add(.12,1.5,.12,x+dx,base+2.6,z-1.9,0x729662);
        if(zone.theme==='river')for(const dx of [-2.5,2.5])add(.55,1.1,.55,x+dx,base+.55,z+.7,0x7c8f87);
      }else if(['ice','fjord'].includes(zone.theme)){
        add(5.6,.23,3.9,x,base+4.13,z,0xe8f2ed);
        for(let k=0;k<5;k++)add(.13,.36+k%2*.25,.16,x-2+k,base+3.83,z-1.98,0xa5dbe5);
      }else if(zone.theme==='coral'){
        for(const dx of [-2.7,2.7]){add(.25,1.2,.28,x+dx,base+.6,z,0xd79aa7);add(.9,.2,.3,x+dx,base+1.05,z,0xf0b7ae);add(.2,.65,.25,x+dx+.3,base+1.35,z,0xe6c18d);}
      }else if(['volcanic','vents'].includes(zone.theme)){
        add(.7,1.5,.8,x+1.8,base+4.25,z+.7,0x494f5b);add(.9,.2,1,x+1.8,base+5.1,z+.7,0x887464);
        glow(3,.08,.05,x,base+.8,z-.83,0xf5b678);
      }else if(['lunar','celestial','void','time','origin','canyon','wreck'].includes(zone.theme)){
        for(const dx of [-2.45,2.45]){add(.42,2.6,.42,x+dx,base+1.3,z-.9,zone.rock);add(.7,.2,.7,x+dx,base+2.65,z-.9,zone.accent);}
        add(2.7,.5,2,x,base+4.24,z,zone.rock);glow(.45,.65,.45,x,base+4.7,z,zone.accent);
        if(zone.theme==='wreck')for(const dx of [-1.5,1.5])add(.22,1.4,.22,x+dx,base+4.4,z,0xdcd2b6,{rz:dx*.16});
      }else if(zone.theme==='storm'||zone.theme==='coast'){
        add(6.3,.16,4.3,x,base+4.08,z,0x738489);add(.15,1.4,.15,x+2,base+4.7,z+.5,0xc7b995);
      }
      // vendor: torso, arms, head, hair and square eyes
      add(.75,1,.5,x+.8,base+1.45,z+.6,color);add(.61,.61,.58,x+.8,base+2.2,z+.6,0xe5ba91);
      add(.7,.22,.65,x+.8,base+2.55,z+.6,0x5b665f);add(.9,.13,.8,x+.8,base+2.43,z+.55,0x5b665f);
      for(const dx of [.65,.95]) add(.065,.08,.06,x+dx,base+2.22,z+.29,0x203d46);
      add(.27,.6,.3,x+.25,base+1.5,z+.35,0xe5ba91);
      if(st.kind==='rod') for(let j=0;j<3;j++)add(.09,2.5,.09,x-1.55+j*.45,base+1.65,z-.1,[0x73b7c4,0xe1ad68,0xc3acd6][j]);
      if(st.kind==='line') for(let j=0;j<3;j++){add(.5,.5,.5,x-1.4+j*.6,base+1.5,z-.2,0xbecfd3);add(.56,.12,.56,x-1.4+j*.6,base+1.3,z-.2,color);}
      if(st.kind==='bait') for(let j=0;j<3;j++){add(.5,.35,.6,x-1.4+j*.6,base+1.4,z-.2,[0xe0bb71,0xc9897b,0xa3bf75][j]);}
      if(st.kind==='market'){add(1.65,.1,.8,x-.8,base+1.26,z-.1,0xe6e5d3);add(.85,.24,.3,x-.8,base+1.4,z-.1,0x84aeb9);add(.25,.34,.16,x-1.3,base+1.4,z-.1,0x61919c);}
      if(st.kind==='port'){add(.55,.18,.95,x-1.1,base+1.35,z-.1,0x759b9e);add(.05,.6,.05,x-1.1,base+1.7,z-.1,0xe4d5ad);add(.3,.25,.08,x-.95,base+1.8,z-.1,0xe9c476);}
      group.add(label(st.banner,x,base+2.95,z-1.83,4.9,.65));
      blockRect(x,z,5.0,4.5,4.5);
      stalls.push({...st,zone:zone.id,...islandToWorld(zone,x,z),approach:islandToWorld(zone,x,z-3.8),yaw:layout.yaw});
    }
    add(.2,2,.2,d-4.1,2,11,0x62716a);
    group.add(label(zone.name.toUpperCase(),d-4.1,3.1,11,5,.65));
    if(zone.id===0){
      // Reedhaven expands into a true central home island with connected civic buildings.
      const civic=(id,name,x,z,color,kind)=>{
        add(19,.48,17,x,1.18,z,0x89775d); // raised stone-and-timber foundation
        add(.8,6,.8,x-9,4,z-8,color);add(.8,6,.8,x+9,4,z-8,color);add(.8,6,.8,x-9,4,z+8,color);add(.8,6,.8,x+9,4,z+8,color);
        add(.65,5,16,x-9,4,z,color);add(.65,5,16,x+9,4,z,color);
        add(7,5,.65,x-6,4,z-8,color);add(7,5,.65,x+6,4,z-8,color);add(19,5,.65,x,4,z+8,color);
        add(5,.42,.75,x,6.3,z-8,color); // lintel above open entrance
        add(20,.7,18,x,7.2,z,zone.rock);add(18,.4,16,x,7.72,z,zone.accent);
        for(const dx of [-7,-4,4,7]){add(2.7,2.8,.18,x+dx,4.6,z-8.42,0x65aeb7);add(.15,3.1,.22,x+dx-1.45,4.6,z-8.48,0xd6c397);add(.15,3.1,.22,x+dx+1.45,4.6,z-8.48,0xd6c397);}
        group.add(label(name.toUpperCase(),x,8.7,z-8,10,.7));
        if(id==='aquarium'){
          const glassMat=new THREE.MeshPhysicalMaterial({color:0x9de5e8,transparent:true,opacity:.22,roughness:.12,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
          for(const tx of [x-5,x+5]){
            group.add(label(tx<x?'COASTAL HABITAT':'PELAGIC HABITAT',tx,5.55,z-2.7,4.2,.42));
            add(5,.65,5,tx,1.75,z,0x775c45);add(4.4,.12,4.4,tx,2.14,z,0x3e9fad);add(5,.22,5,tx,4.98,z,0xd2c6a6);
            for(const [w,h,d,px,py,pz]of [[4.65,2.8,.08,tx,3.45,z-2.34],[4.65,2.8,.08,tx,3.45,z+2.34],[.08,2.8,4.65,tx-2.34,3.45,z],[.08,2.8,4.65,tx+2.34,3.45,z]]){const pane=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),glassMat);pane.position.set(px,py,pz);group.add(pane);}
            for(let row=0;row<2;row++)for(let depth=0;depth<2;depth++)for(let col=0;col<3;col++){const pos=islandToWorld(zone,tx-1.35+col*1.35,z-.95+depth*1.9);aquariumTankSlots.push({x:pos.x,y:2.95+row*1.25,z:pos.z});}
          }
        }
        const entrance=islandToWorld(zone,x,z-10);hubBuildings.push({id,name,zone:0,x:entrance.x,z:entrance.z,center:islandToWorld(zone,x,z)});
      };
      // Continuous raised paths lead out from the old village and harbor.
      for(const x of [-24,24,0])add(4,.16,22,x,1.02,54+(x===0?15:0),0xb3a17b);
      civic('aquarium','Reedhaven Aquarium',-24,72,0x816f58,'aquarium');
      civic('warehouse','Angler Warehouse',24,72,0x756f61,'warehouse');
      civic('guild','Anglers Guild',0,94,0x86704f,'guild');
      // Reedhaven-only shoreline polish: warm reeds, small flowers and flat lily pads.
      for(const side of [-1,1])for(let patch=0;patch<6;patch++){
        const x=side*(23.7+(patch%2)*1.5),z=18+patch*5.7;
        for(let blade=0;blade<4;blade++){const dx=(blade-1.5)*.25,h=1.25+(blade%3)*.34;add(.12,h,.12,x+dx,.96+h/2,z+(blade%2)*.2,blade%2?0x6f9a58:0x88ad62,{rz:(blade-1.5)*.08});if(blade===1||blade===3)add(.42,.09,.12,x+dx+.18,.96+h*.72,z+(blade%2)*.2,0xa5bd69,{rz:.28});}
        if(patch%2===0){add(.16,.16,.16,x+.45,2.15,z,0xf2d37a);add(.15,.15,.15,x-.4,1.9,z+.4,0xe7a8a0);}
      }
      for(let pad=0;pad<7;pad++){const x=(pad%2?1:-1)*(29.5+(pad%3)*1.1),z=22+pad*4.1;add(1.05,.09,.9,x,.13,z,0x588f72,{ry:pad*.61});add(.18,.16,.18,x,.2,z,0xe8cf80);}
      for(let i=0;i<12;i++){const x=-17+(i%6)*6.5,z=20+Math.floor(i/6)*24;add(.28,.1,.28,x,1.12,z,0xe6b2a1);add(.12,.2,.12,x,1.25,z,0xe9d18b);}
    }
    group.add(mergeBoxes(S));
    if(glows.length)group.add(mergeBoxes(glows,true));
    islands.push(group);
    colliders.push(...localColliders.map(b=>{
      const out={...b,...islandToWorld(zone,b.x,b.z)};
      if(b.rect){const a=islandToWorld(zone,b.rect.minX,b.rect.minZ),c=islandToWorld(zone,b.rect.maxX,b.rect.maxZ);out.rect={minX:Math.min(a.x,c.x),maxX:Math.max(a.x,c.x),minZ:Math.min(a.z,c.z),maxZ:Math.max(a.z,c.z)};out.r=Math.hypot(out.rect.maxX-out.rect.minX,out.rect.maxZ-out.rect.minZ)/2;}
      return out;
    }));
    // Distant islands retain their skyline without drawing every item in a stall.
    const distant=mergeBoxes(S.filter(b=>b.w>=7||(b.h>=2.5&&b.w>=1.2)));
    distant.position.copy(group.position);distant.rotation.copy(group.rotation);root.add(distant);distantIslands.push(distant);
  }

  // Clouds and birds stay around the camera, not the old origin.
  const clouds=new THREE.InstancedMesh(UNIT,new THREE.MeshBasicMaterial({color:0xf1f2eb}),36);
  for(let i=0;i<36;i++){
    const row=Math.floor(i/3),j=i%3;
    scratch.position.set(((row*73)%340)-170+(j-1)*7,42+(row%4)*9,-row*70+60);
    scratch.scale.set(12-j*2,j===1?5:3,9); scratch.rotation.set(0,0,0); scratch.updateMatrix();clouds.setMatrixAt(i,scratch.matrix);
  }
  root.add(clouds);
  const birds=[];
  for(let i=0;i<4;i++){
    const g=new THREE.Group(),body=cube(.5,.18,.25,0xf2efe2),left=cube(.8,.08,.3,0xe1e4d9,-.55,0,0),right=cube(.8,.08,.3,0xe1e4d9,.55,0,0);
    g.add(body,left,right); root.add(g); birds.push({g,left,right});
  }
  let boat=boatMesh(0),boatId=0;root.add(boat);
  const motes=new THREE.InstancedMesh(UNIT,new THREE.MeshBasicMaterial({color:0xe4f3ff}),44);
  motes.frustumCulled=false;root.add(motes);
  // Rain is made of short world-space drops near the player, never a screen-wide
  // diagonal CSS texture. Keeping it instanced adds one draw call only in rain.
  const rain=new THREE.InstancedMesh(new THREE.BoxGeometry(.026,.34,.026),new THREE.MeshBasicMaterial({color:0xc7efff,transparent:true,opacity:.38,depthWrite:false}),180);
  rain.frustumCulled=false;root.add(rain);
  function setBoat(id){
    if(id===boatId)return;
    root.remove(boat);
    boat.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    boat=boatMesh(id);boatId=id;root.add(boat);if(auroraEnabled)setAuroraPaint(true);
  }
  let auroraEnabled=false,auroraPaint=null;
  function setAuroraPaint(enabled){auroraEnabled=!!enabled;if(auroraPaint){boat.remove(auroraPaint);auroraPaint.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});auroraPaint=null;}if(!auroraEnabled)return;auroraPaint=new THREE.Group();const glow=new THREE.MeshStandardMaterial({color:0x8be8e1,emissive:0x49c9d1,emissiveIntensity:.8,roughness:.28}),plate=(w,h,d,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),glow);mesh.position.set(x,y,z);return mesh;};auroraPaint.add(plate(2.65,.1,3.7,0,1.12,-.1),plate(.08,.5,3.9,-1.38,.91,.1),plate(.08,.5,3.9,1.38,.91,.1));auroraPaint.scale.setScalar(BOATS[boatId].size);boat.add(auroraPaint);}
  function dockPoint(zone){const p=dockLocation(zone,BOATS[boatId].size);return new THREE.Vector3(p.x,.1,p.z);}
  function surfaceAt(x,z,onlyZone=null){
    for(const i of ISLANDS){
      if(onlyZone!==null&&onlyZone!==i.id)continue;
      const p=worldToIsland(i,x,z);
      if(Math.abs(p.x)>110||Math.abs(p.z)>110)continue;
      const matches=surfaces[i.id].filter(r=>p.x>=r.minX&&p.x<=r.maxX&&p.z>=r.minZ&&p.z<=r.maxZ);
      if(matches.length)return Math.max(...matches.map(r=>r.height));
    }
    return null;
  }
  function groundAt(x,z,zone){
    const y=surfaceAt(x,z,zone);
    if(y===null||y>1.2)return null;
    for(const b of colliders)if(b.zone===zone&&(b.rect?(x>=b.rect.minX-.28&&x<=b.rect.maxX+.28&&z>=b.rect.minZ-.28&&z<=b.rect.maxZ+.28):Math.hypot(x-b.x,z-b.z)<b.r))return null;
    return y;
  }
  function inWater(p){
    if(p.x<=SEA_BOUNDS.minX||p.x>=SEA_BOUNDS.maxX||p.z<=SEA_BOUNDS.minZ||p.z>=SEA_BOUNDS.maxZ)return false;
    const cave=worldToIsland(ISLANDS[2],p.x,p.z);
    if(Math.abs(cave.x+22)<1.65&&cave.z>3.65&&cave.z<7.45)return true;
    return surfaceAt(p.x,p.z)===null;
  }
  const tempColor=new THREE.Color();
  function update(time,dt,zone,camera,aboard,boatPosition=null,weather='clear'){
    const i=ISLANDS[zone];
    waterUniforms.uTime.value=time;
    sky.position.copy(camera.position);
    clouds.position.set(camera.position.x,0,camera.position.z+250);
    sun.position.set(camera.position.x+120,120,camera.position.z-250);
    const weatherWater={storm:0x64899a,rain:0x5d9eae,fog:0x86a9ad,wind:0x5e8a96,heat:0x45aaa1};
    const weatherSky={storm:0x83a7b4,rain:0x9bbdc7,fog:0xbccdc9,wind:0x9ab4bc,heat:0xd9c09e};
    tempColor.setHex(weatherWater[weather]??i.water);waterUniforms.uLight.value.lerp(tempColor,Math.min(1,dt*1.2));
    tempColor.multiplyScalar(.65);waterUniforms.uDeep.value.lerp(tempColor,Math.min(1,dt*1.2));
    tempColor.setHex(weatherSky[weather]??i.sky);waterUniforms.uFog.value.lerp(tempColor,Math.min(1,dt*1.2));
    scene.fog.color.lerp(tempColor,Math.min(1,dt*1.2));scene.background.copy(scene.fog.color);
    sky.material.uniforms.uBottom.value.lerp(tempColor,Math.min(1,dt*1.2));
    tempColor.multiplyScalar(.73);sky.material.uniforms.uTop.value.lerp(tempColor,Math.min(1,dt*1.2));
    islands.forEach((g,n)=>{
      const center=territoryCenter(ISLANDS[n]),distance=Math.hypot(camera.position.x-center.x,camera.position.z-center.z);
      g.visible=distance<160;distantIslands[n].visible=!g.visible&&distance<950;
      if(g.visible&&g.userData.wheel)g.userData.wheel.rotation.z=time*.22;
    });
    birds.forEach((b,n)=>{const a=time*.12+n*1.5;b.g.position.set(i.x+Math.cos(a)*25,13+n*2+Math.sin(time+n)*.5,i.z+Math.sin(a)*26);b.g.rotation.y=-a;b.left.rotation.z=Math.sin(time*6+n)*.35;b.right.rotation.z=-b.left.rotation.z;});
    if(!aboard){const p=boatPosition||dockPoint(zone);boat.position.set(p.x,.1+Math.sin(time*1.6)*.05,p.z);boat.rotation.set(0,p.yaw??ISLANDS[zone].layout.yaw,Math.sin(time)*.015);}
    motes.visible=['storm','ice','fjord','volcanic','vents','celestial','void','lunar','time','origin'].includes(i.theme);
    if(motes.visible){
      motes.material.color.setHex(['ice','fjord','storm'].includes(i.theme)?0xe9f7ff:['volcanic','vents'].includes(i.theme)?0xffbb7a:0xc9d8ff);
      for(let n=0;n<44;n++){
        const size=['ice','fjord','storm'].includes(i.theme)?.065:.045;
        const h=['ice','fjord','storm'].includes(i.theme)?13-((time*(i.theme==='storm'?5:.65)+n*.71)%13):1+(time*.35+n*.73)%10;
        scratch.position.set(i.x-28+(n*17%56)+Math.sin(time*.2+n)*.7,h,i.z-16+(n*19%58));
        scratch.scale.set(size,i.theme==='storm'?.7:size,size);scratch.rotation.set(0,0,i.theme==='storm'?.18:0);scratch.updateMatrix();motes.setMatrixAt(n,scratch.matrix);
      }
      motes.instanceMatrix.needsUpdate=true;
    }
    rain.visible=weather==='rain'||weather==='storm';
    if(rain.visible){rain.material.opacity=weather==='storm'?.48:.34;for(let n=0;n<rain.count;n++){const a=n*12.9898,b=n*78.233,drop=30-((time*17+n*1.618)%30),drift=weather==='storm'?time*2.6:time*.55;scratch.position.set(camera.position.x+Math.sin(a)*22+drift,camera.position.y-1+drop,camera.position.z+Math.cos(b)*20+drift*.35);scratch.rotation.set(.015,0,weather==='storm'?.09:.035);scratch.scale.set(1,1,1);scratch.updateMatrix();rain.setMatrixAt(n,scratch.matrix);}rain.instanceMatrix.needsUpdate=true;}
    tempColor.setHex(i.theme==='lunar'?0xe6deff:0xffefd0);sun.material.color.lerp(tempColor,Math.min(1,dt*1.2));
  }
  return { root,water,waterUniforms,stalls,questGivers,hubBuildings,aquariumTankSlots,islands,groundAt,surfaceAt,inWater,dockPoint,update,setBoat,setAuroraPaint,
    waterfallCave:islandToWorld(ISLANDS[2],-22,5.5),cameraBlockers:ISLANDS.map(i=>colliders.filter(b=>b.zone===i.id)),get boat(){return boat;} };
}
