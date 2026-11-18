import * as THREE from 'three';
import { ISLANDS, BOATS } from './archipelago.mjs?v=33';

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const scratch = new THREE.Object3D();
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a + (b-a)*t;
const STALL_LAYOUT = [
  { kind:'rod', name:'Rod Works', x:-17, z:29, color:0x6aafcc, banner:'ROD WORKS' },
  { kind:'line', name:'Line & Spool', x:0, z:42, color:0xba9bd2, banner:'LINE & SPOOL' },
  { kind:'bait', name:'Bait Shack', x:17, z:29, color:0xe4a568, banner:'BAIT SHACK' },
  { kind:'market', name:'Fish Market', x:-8.5, z:18, color:0x77b88b, banner:'FISH MARKET' },
  { kind:'port', name:'Boat Shop & Dock', x:9, z:16, color:0x6ea3b5, banner:'BOATS & VOYAGES' },
];

// One vertex-coloured draw call for hundreds of cuboids; no imported models.
function mergeBoxes(specs,unlit=false){
  const pos=[], normals=[], colors=[], indices=[];
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
  let offset=0;
  for(const s of specs){
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
function label(text, x,y,z,w=4.4,h=.65, color='#f4e5c5'){
  const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=128;
  const c=canvas.getContext('2d');
  c.fillStyle='#193d45'; c.fillRect(0,0,768,128);
  c.fillStyle=color; c.fillRect(12,12,744,4); c.fillRect(12,112,744,4);
  c.textAlign='center'; c.textBaseline='middle'; c.font='bold 52px monospace';
  c.fillText(text,384,67,720);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace; texture.magFilter=THREE.NearestFilter;
  const front=new THREE.MeshBasicMaterial({map:texture});
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
  const g=new THREE.Group(); g.add(mergeBoxes(S)); return g;
}

export function createWorld(scene){
  const root=new THREE.Group(); scene.add(root);
  const colliders=[], islands=[], distantIslands=[], stalls=[];
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
      c=mix(c,uFog,smoothstep(65.,350.,vDepth)); gl_FragColor=vec4(c,.97); }`
  });
  const water=new THREE.Mesh(new THREE.BoxGeometry(1900,.10,2100,64,1,64),waterMat);
  water.position.set(0,-.04,-400); root.add(water);
  root.add(cube(1900,1,2100,0x376f71,0,-4,-400));

  const sky=new THREE.Mesh(new THREE.BoxGeometry(2200,2200,2200),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{uTop:{value:new THREE.Color(0x559cbd)},uBottom:{value:new THREE.Color(0xd9edf0)}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 uTop;uniform vec3 uBottom;varying vec3 vP;void main(){float h=clamp(vP.y/800.,0.,1.);h=floor(h*8.)/8.;gl_FragColor=vec4(mix(uBottom,uTop,h),1.);}'
  }));
  sky.frustumCulled=false; scene.add(sky);
  const sun=cube(22,22,2,0xffefd0,120,120,-250); sun.material=new THREE.MeshBasicMaterial({color:0xffefd0,fog:false}); root.add(sun);

  for(const zone of ISLANDS){
    const group=new THREE.Group(); group.position.set(zone.x,0,zone.z); root.add(group);
    const S=[],glows=[];
    const glow=(w,h,d,x,y,z,c)=>glows.push({w,h,d,x,y,z,c});
    const add=(w,h,d,x,y,z,c,more={})=>S.push({w,h,d,x,y,z,c,...more});
    const block=(x,z,r)=>colliders.push({zone:zone.id,x:x+zone.x,z:z+zone.z,r});
    // Stepped, genuinely walkable island footprint. No invisible terrain walls.
    add(60,3.2,48,0,-1.2,34,zone.rock);
    add(60,.5,48,0,.25,34,zone.sand);
    add(54,.45,43,0,.725,34.5,zone.land);
    // A connected peninsula carries each island's signature landmark.
    add(12,2.9,20,-22,-1.05,8,zone.rock);
    add(12,.5,20,-22,.25,8,zone.sand);
    add(10,.45,16,-22,.725,9,zone.land);
    // Pier, crosswalk and a separate boat berth.
    for(let i=0;i<16;i++){
      add(4.9,.3,.94,0,1,13-i, i%2 ? 0xba9465 : 0xa68357);
      if(i<13) add(3.4,.3,.94,9,1,13-i,i%2 ? 0xba9465 : 0xa68357);
    }
    add(12,.3,2.6,4.5,1,11.6,0xb38e60);
    for(const x of [-2.2,2.2,7.6,10.4]) for(let z=0;z<14;z+=3){
      add(.23,2.2,.23,x,.25,z,0x68573e); add(.31,.22,.31,x,1.4,z,0xe7d6af);
    }
    // Low square foam/sand shelves read as a voxel shoreline.
    for(let i=0;i<14;i++){
      const x=-28+i*4.2;
      if(Math.abs(x)<3||Math.abs(x-9)<2) continue;
      add(3.5,.12,1.2,x,.12,9.4,0xd5eeea);
    }
    // Main paths and a little plaza, inlaid with square stepping stones.
    add(9,.06,10,0,1,24,zone.sand);
    for(const st of STALL_LAYOUT){
      const count=14;
      for(let n=0;n<count;n++){
        const t=n/(count-1);
        add(1.8,.07,1.8,mix(0,st.x,t),1,mix(13,st.z-3.4,t),n%3?zone.sand:0xc3b799);
      }
    }
    // Signature plants, using only cuboids. Keep the central village clear.
    function tree(x,z,s=1){
      add(.55*s,3.7*s,.55*s,x,.95+1.85*s,z,0x715a43);
      if(zone.theme==='tropical'){
        for(const dir of [-1,1]){
          add(5*s,.55*s,1.3*s,x+dir*1.2*s,4.7*s,z,0x68a56b);
          add(1.3*s,.55*s,4.6*s,x,4.55*s,z+dir*1.2*s,0x7eb96e);
        }
        add(.6*s,.6*s,.6*s,x+.6*s,4.25*s,z,0x96724c);
      }else{
        const leaf=zone.theme==='ice'?0xa5c5c2:zone.theme==='lunar'?0xb3a3d4:zone.theme==='volcanic'?0x846b70:zone.theme==='forest'?0x337969:0x529865;
        for(let j=0;j<4;j++){
          const w=(3.8-j*.7)*s;
          add(w,1.4*s,w,x,.95+(2.1+j*1.05)*s,z,leaf);
          if(zone.theme==='ice') add(w+.1,.25,w+.1,x,.95+(2.85+j*1.05)*s,z,0xf0f5ee);
        }
      }
      add(3.8*s,.03,3.8*s,x,.98,z,zone.theme==='ice'?0xc5dddf:zone.theme==='lunar'?0x6c6a91:0x628c63);
      block(x,z,.65*s);
    }
    [[-23,23,1.2],[-25,38,1.5],[-18,49,1.35],[-8,53,1.6],[10,52,1.6],[22,46,1.2],[25,35,1.1],[25,18,1]].forEach(v=>tree(...v));
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
    for(const [x,z] of [[-3.5,14],[4,26],[-12,34],[12,35],[6,45]]){
      add(.18,2.8,.18,x,2.3,z,0x4c6262); glow(.65,.65,.65,x,3.8,z,0xffdfa0); add(.85,.16,.85,x,4.2,z,0x3e5961);
      add(.6,.16,.6,x,1,z,0x657575);
    }
    for(const x of [-5,5]){ add(2.5,.25,.8,x,1.55,32,0xa58863); add(2.5,.75,.15,x,2,32.4,0xa58863); for(const dx of [-.85,.85]) add(.18,.65,.6,x+dx,1.25,32,0x5b665f); }
    // Dock props, all collidable where appropriate.
    add(.75,.6,.7,-1.4,1.45,8,0x6f9ca3); add(.8,.14,.75,-1.4,1.81,8,0xe4e7cd); block(-1.4,8,.6);
    add(.6,.5,.6,1.5,1.4,6.8,0xcc8d65); block(1.5,6.8,.55);

    // A distinct silhouette for every island, visible from its fishing pier.
    const landmarkStart=S.length,colliderStart=colliders.length;
    if(zone.theme==='harbor'){
      block(-22,6,2.8);
      for(let j=0;j<5;j++) add(3.6-j*.35,2.2,3.6-j*.35,-22,2+j*2.1,6,j%2?0xc47765:0xf1e5ce);
      add(3.7,.3,3.7,-22,11.8,6,0x3e6874); glow(2.5,1.5,2.5,-22,12.7,6,0xffdb84); add(3.8,.5,3.8,-22,13.6,6,0x3e6874);
      add(.4,2,.4,-22,14.7,6,0x536875); add(2,.8,.12,-21,15.3,6,zone.accent);
      for(let i=0;i<12;i++){add(.15,1.4,.15,-7-i*.65,.65,1+i%3,0x659c64);add(.3,.5,.3,-7-i*.65,1.4,1+i%3,0x9b7955);}
    }else if(zone.theme==='forest'){
      block(-22,7,3.3);
      add(5,5,6,-22,3.4,7,0x786b54); add(6,.6,7,-22,6.2,7,0x3c6f60); add(4.8,.5,7,-22,6.75,7,0x457e6a);
      add(2.6,1.7,.13,-22,4,3.95,0xc0dcce); add(.18,2,.2,-22,4,3.8,0x685842);
      const wheel=new THREE.Group();
      const bars=[]; for(let k=0;k<8;k++){const a=k*Math.PI/4;bars.push({w:.5,h:.65,d:2,x:Math.cos(a)*2,y:Math.sin(a)*2,z:0,c:0xb99461,rz:a});}
      bars.push({w:4.8,h:.24,d:.24,x:0,y:0,z:0,c:0xb99461},{w:.24,h:4.8,d:.24,x:0,y:0,z:0,c:0xb99461});
      wheel.add(mergeBoxes(bars)); wheel.position.set(-19,3.6,7);wheel.rotation.y=Math.PI/2; group.add(wheel); group.userData.wheel=wheel;
    }else if(zone.theme==='tropical'){
      for(const x of [-25,-18]){add(2.7,8,3.2,x,4.9,6,0xd3b582);add(3.1,.45,3.7,x,7.7,6,0xe8cc92);block(x,6,1.8);}
      add(10,2.1,3.7,-21.5,9.3,6,0xe1c28c);add(8.6,.6,3.3,-21.5,10.65,6,0xf0d6a2);
      for(let i=0;i<12;i++)add(.7,.8+(i%3)*.35,.7,-13+i,0,-9-(i%3),i%2?0xe0a09b:0x8dc8be);
    }else if(zone.theme==='ice'){
      block(-22,6,3.2);
      for(let k=0;k<5;k++)add(7-k,2.2,6-k*.7,-22,1+k*1.8,6,k%2?0xaadce7:0xc5e9ed);
      add(3.4,4,3.4,-22,11,6,0x6d8f9d);add(4.2,.6,4.2,-22,13,6,0xe4f4ef);glow(2,1.5,2,-22,14,6,0xc4efff);
      for(let i=0;i<6;i++)add(4-i*.35,2+i*.6,3,-20+i*6,0,-15-i%2*4,0xc5e9ed);
    }else if(zone.theme==='volcanic'){
      block(-22,6,4.8);
      for(let k=0;k<6;k++){
        add(10-k*1.4,2.3,9-k*1.2,-22,1.2+k*1.8,6,k%2?0x575869:0x4e4f61);
        glow(.65,2.35,.2,-21+k*.1,1.3+k*1.8,1.4+k*.6,0xee9b65);
        glow(.18,2.35,.7,-16.9-k*.7,1.3+k*1.8,6+k*.15,0xffae6d);
      }
      glow(2.2,.3,2.2,-22,11.6,6,0xffbd72);
      for(let k=0;k<4;k++)add(1.4+k*.5,.9,1.3+k*.4,-22+k*.3,13+k*1.6,6,0x9b949a);
    }else{
      for(const x of [-25,-18]){add(2,8.5,2.4,x,5,6,0x6b678f);add(2.5,.4,2.8,x,8.7,6,0xc9c0e7);block(x,6,1.5);}
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
      for(const b of colliders.slice(colliderStart)){
        const dx=b.x-zone.x+21.5,dz=b.z-zone.z-6;
        b.x=zone.x-21.5+dz;b.z=zone.z+6-dx;
      }
    }
    // Distinct ridge behind each village, stepped instead of polygonal terrain.
    for(let k=0;k<4;k++){
      const x=-22+k*14,h=5+(k%3)*2;
      add(13,h,11,x,.8+h/2,54,zone.rock);
      add(10,h*.65,8,x,.8+h*1.3,54,zone.land);
      add(6,h*.3,5,x,.8+h*1.72,54,zone.theme==='ice'?0xf2f6ef:zone.land);
      block(x,53,5.6);
    }
    // Stalls, merchandise and friendly cube vendors. Separate stock, no tabs of remote purchases.
    for(const st of STALL_LAYOUT){
      const x=st.x,z=st.z,base=1;
      const color=zone.theme==='lunar'?0x9f95c0:zone.theme==='volcanic'?0xa88170:st.color;
      add(4.5,1.05,1.5,x,base+.525,z,0x846b50);add(4.8,.2,1.8,x,base+1.12,z,0xd1b58a);
      add(4.6,.13,1.8,x,base+.8,z,color);
      for(const dx of [-2,2]) for(const dz of [-.65,.65]) add(.18,3.3,.18,x+dx,base+1.65,z+dz,0x655a46);
      for(let i=0;i<7;i++) add(.8,.22,3.6,x-2.4+i*.8,base+3.3,z,i%2?0xf1e2c3:color);
      add(4.4,2.5,.15,x,base+1.3,z+1.25,0x9a7c56);
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
      block(x,z,2.7);
      stalls.push({...st,zone:zone.id,x:x+zone.x,z:z+zone.z});
    }
    add(.2,2,.2,-4.1,2,11,0x62716a);
    group.add(label(zone.name.toUpperCase(),-4.1,3.1,11,5,.65));
    group.add(mergeBoxes(S));
    if(glows.length)group.add(mergeBoxes(glows,true));
    islands.push(group);
    // Distant islands retain their skyline without drawing every item in a stall.
    const distant=mergeBoxes(S.filter(b=>b.w>=7||(b.h>=2.5&&b.w>=1.2)));
    distant.position.copy(group.position);root.add(distant);distantIslands.push(distant);
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
  function setBoat(id){
    if(id===boatId)return;
    root.remove(boat);
    boat.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    boat=boatMesh(id);boatId=id;root.add(boat);
  }
  function dockPoint(zone){const i=ISLANDS[zone];return new THREE.Vector3(i.x+13.5,.1,i.z+4);}
  function surfaceAt(x,z,onlyZone=null){
    for(const i of ISLANDS){
      if(onlyZone!==null&&onlyZone!==i.id)continue;
      const lx=x-i.x,lz=z-i.z;
      if((Math.abs(lx)<=2.45&&lz>=-2.5&&lz<=13.6)||(Math.abs(lx-9)<=1.7&&lz>=.5&&lz<=13.6)||(lx>=-1.5&&lx<=10.5&&lz>=10.3&&lz<=12.9)) return 1.15;
      if(lx>=-27&&lx<=-17&&lz>=1&&lz<=17)return .95;
      if(lx>=-28&&lx<=-16&&lz>=-2&&lz<=18)return .5;
      if(Math.abs(lx)<=27&&lz>=13&&lz<=56)return .95;
      if(Math.abs(lx)<=30&&lz>=10&&lz<=58)return .5;
    }
    return null;
  }
  function groundAt(x,z,zone){
    const y=surfaceAt(x,z,zone);
    if(y===null)return null;
    for(const b of colliders)if(b.zone===zone&&Math.hypot(x-b.x,z-b.z)<b.r)return null;
    return y;
  }
  function inWater(p){ return Math.abs(p.x)<800&&p.z>-1400&&p.z<350&&surfaceAt(p.x,p.z)===null; }
  // A visibility graph around expanded island bounds keeps crossings out of
  // terrain, even on long return voyages. A straight/Catmull shortcut can cut
  // right through an intervening island, so routes are actually navigated.
  function route(fromZone,toZone){
    const from=dockPoint(fromZone),to=dockPoint(toZone);
    const start=from.clone().add(new THREE.Vector3(0,0,-32));
    const end=to.clone().add(new THREE.Vector3(0,0,-32));
    const obstacles=ISLANDS.map(i=>({minX:i.x-36,maxX:i.x+36,minZ:i.z-9,maxZ:i.z+65}));
    const nodes=[start,end];
    for(const r of obstacles)for(const [x,z] of [[r.minX-8,r.minZ-8],[r.maxX+8,r.minZ-8],[r.maxX+8,r.maxZ+8],[r.minX-8,r.maxZ+8]])nodes.push(new THREE.Vector3(x,.1,z));
    function intersects(a,b,r){
      let lo=0,hi=1;
      for(const [axis,min,max] of [['x',r.minX,r.maxX],['z',r.minZ,r.maxZ]]){
        const d=b[axis]-a[axis];
        if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return false;continue;}
        const t1=(min-a[axis])/d,t2=(max-a[axis])/d;
        lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
        if(lo>hi)return false;
      }
      return true;
    }
    const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();distance[0]=0;
    for(let count=0;count<nodes.length;count++){
      let u=-1;
      for(let n=0;n<nodes.length;n++)if(!done.has(n)&&(u<0||distance[n]<distance[u]))u=n;
      if(u<0||!Number.isFinite(distance[u]))break;
      if(u===1)break;done.add(u);
      for(let v=0;v<nodes.length;v++){
        if(v===u||done.has(v)||obstacles.some(r=>intersects(nodes[u],nodes[v],r)))continue;
        const d=distance[u]+nodes[u].distanceTo(nodes[v]);
        if(d<distance[v]){distance[v]=d;previous[v]=u;}
      }
    }
    if(!Number.isFinite(distance[1]))return null;
    const middle=[];for(let n=1;n>=0;n=previous[n]){middle.unshift(nodes[n]);if(n===0)break;}
    const points=[from,...middle,to],curve=new THREE.CurvePath();let cursor=from;
    for(let n=1;n<points.length-1;n++){
      const p=points[n],before=points[n-1],after=points[n+1];
      const radius=Math.min(6,p.distanceTo(before)*.25,p.distanceTo(after)*.25);
      const a=p.clone().addScaledVector(before.clone().sub(p).normalize(),radius);
      const b=p.clone().addScaledVector(after.clone().sub(p).normalize(),radius);
      curve.add(new THREE.LineCurve3(cursor,a));curve.add(new THREE.QuadraticBezierCurve3(a,p,b));cursor=b;
    }
    curve.add(new THREE.LineCurve3(cursor,to));
    return curve;
  }
  const tempColor=new THREE.Color();
  function update(time,dt,zone,camera,voyage){
    const i=ISLANDS[zone];
    waterUniforms.uTime.value=time;
    sky.position.copy(camera.position);
    sun.position.set(camera.position.x+120,120,camera.position.z-250);
    tempColor.setHex(i.water);waterUniforms.uLight.value.lerp(tempColor,dt*1.2);
    tempColor.multiplyScalar(.65);waterUniforms.uDeep.value.lerp(tempColor,dt*1.2);
    tempColor.setHex(i.sky);waterUniforms.uFog.value.lerp(tempColor,dt*1.2);
    scene.fog.color.lerp(tempColor,dt*1.2);scene.background.copy(scene.fog.color);
    sky.material.uniforms.uBottom.value.lerp(tempColor,dt*1.2);
    tempColor.multiplyScalar(.73);sky.material.uniforms.uTop.value.lerp(tempColor,dt*1.2);
    islands.forEach((g,n)=>{
      const distance=Math.hypot(camera.position.x-g.position.x,camera.position.z-g.position.z-20);
      g.visible=distance<145;distantIslands[n].visible=!g.visible&&distance<450;
      if(g.visible&&g.userData.wheel)g.userData.wheel.rotation.z=time*.22;
    });
    birds.forEach((b,n)=>{const a=time*.12+n*1.5;b.g.position.set(i.x+Math.cos(a)*25,13+n*2+Math.sin(time+n)*.5,i.z+Math.sin(a)*26);b.g.rotation.y=-a;b.left.rotation.z=Math.sin(time*6+n)*.35;b.right.rotation.z=-b.left.rotation.z;});
    if(!voyage){boat.position.copy(dockPoint(zone));boat.position.y+=Math.sin(time*1.6)*.05;boat.rotation.set(0,0,Math.sin(time)*.015);}
    motes.visible=zone>=3;
    if(motes.visible){
      motes.material.color.setHex(zone===3?0xe9f7ff:zone===4?0xffbb7a:0xc9d8ff);
      for(let n=0;n<44;n++){
        const size=zone===3?.065:.045;
        const h=zone===3?13-((time*.65+n*.71)%13):1+(time*.35+n*.73)%10;
        scratch.position.set(i.x-28+(n*17%56)+Math.sin(time*.2+n)*.7,h,i.z-16+(n*19%58));
        scratch.scale.set(size,size,size);scratch.rotation.set(0,0,0);scratch.updateMatrix();motes.setMatrixAt(n,scratch.matrix);
      }
      motes.instanceMatrix.needsUpdate=true;
    }
    tempColor.setHex(zone===5?0xe6deff:0xffefd0);sun.material.color.lerp(tempColor,dt*1.2);
  }
  return { root,water,waterUniforms,stalls,islands,groundAt,surfaceAt,inWater,dockPoint,route,update,setBoat,get boat(){return boat;} };
}
