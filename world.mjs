import * as THREE from 'three';
import { ISLANDS, BOATS } from './archipelago.mjs?v=47';
import { SEA_BOUNDS, dockLocation, territoryCenter } from './navigation.mjs?v=48';
import { islandToWorld, worldToIsland, islandSurfaces, islandSpawn } from './island-layout.mjs?v=47';
import { islandServices } from './island-data.mjs?v=46';

// NEW VISUAL DIRECTION: storybook archipelago — luminous water, sculpted
// crescent islands, soft silhouettes, rich colors and rounded silhouettes.
// Fish remain the original authored 3D catches; every environment/boat/NPC
// mesh below is newly generated and replaces the former block-built world.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const mat=(color,roughness=.75,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
const palettes={
  harbor:{grass:0x72c7a7,sand:0xf4dca4,cliff:0x589c9a,accent:0xffd76e,leaf:0x2b947b},
  forest:{grass:0x62bd86,sand:0xf1d7a0,cliff:0x497b6a,accent:0xb5dc83,leaf:0x28785c},
  river:{grass:0x68c6a6,sand:0xe7d3a1,cliff:0x4e8f9b,accent:0x9be8e3,leaf:0x3a9977},
  swamp:{grass:0x8aaf70,sand:0xd6c393,cliff:0x536c58,accent:0xd4d894,leaf:0x486f4f},
  tropical:{grass:0x8dd484,sand:0xffe1a2,cliff:0xc39e6c,accent:0xff9581,leaf:0x309b73},
  coral:{grass:0x72cbbb,sand:0xffe6c1,cliff:0xe89eaa,accent:0xffa4cb,leaf:0x35a899},
  coast:{grass:0x87bd9c,sand:0xe8d4ac,cliff:0x738d95,accent:0xffcb7d,leaf:0x3d8a76},
  storm:{grass:0x638e8e,sand:0xbcc9ba,cliff:0x435d70,accent:0xffd071,leaf:0x397579},
  jungle:{grass:0x56ad70,sand:0xe4d29d,cliff:0x506d54,accent:0xf3bb67,leaf:0x24774e},
  volcanic:{grass:0x8e7774,sand:0xc9a58c,cliff:0x505365,accent:0xff9861,leaf:0x796b55},
  ice:{grass:0xc3e4da,sand:0xe6e6ce,cliff:0x83b7c5,accent:0x93e8ff,leaf:0x76a8a8},
  fjord:{grass:0x9dd3d4,sand:0xd7e5d5,cliff:0x699caf,accent:0xa7efff,leaf:0x528e98},
  canyon:{grass:0xb4b18c,sand:0xe1c49c,cliff:0x7b7880,accent:0xe4a77d,leaf:0x6c916e},
  wreck:{grass:0x94a794,sand:0xd8d0b8,cliff:0x697d7a,accent:0xd8c497,leaf:0x528373},
  vents:{grass:0x827777,sand:0xb7a394,cliff:0x514d60,accent:0xffaa67,leaf:0x708b76},
  lunar:{grass:0xb6a6db,sand:0xe3d2e5,cliff:0x766d9d,accent:0xf1d8ff,leaf:0x7d77b2},
  celestial:{grass:0xa8c7df,sand:0xe3dfc8,cliff:0x687da4,accent:0xffed9d,leaf:0x748bb0},
  void:{grass:0x69728b,sand:0xa4a9b2,cliff:0x44485d,accent:0xb8acff,leaf:0x5b78a1},
  time:{grass:0xb6b69a,sand:0xe6d9b2,cliff:0x80867e,accent:0xffe093,leaf:0x7d997d},
  origin:{grass:0xb5d7bd,sand:0xf2e6be,cliff:0x8daea2,accent:0xffefac,leaf:0x69a88a}
};
const storeInfo={rod:['Tackle Atelier',0x59aee0],line:['Line Loom',0xd895df],bait:['Bait Garden',0xf0a361],market:['Catch Exchange',0x71c894],port:['Mariner’s Pier',0x7cc8d2]};
function roundedIslandShape(rx,rz,seed=1,scale=1){
  const shape=new THREE.Shape(),n=64;
  for(let k=0;k<=n;k++){
    const a=k/n*Math.PI*2,noise=1+.055*Math.sin(a*3+seed)+.035*Math.cos(a*5-seed*.7)+.018*Math.sin(a*9+seed*1.4);
    const x=Math.cos(a)*rx*noise*scale,z=Math.sin(a)*rz*noise*scale;
    if(!k)shape.moveTo(x,-z);else shape.lineTo(x,-z);
  }
  shape.closePath();return shape;
}
function islandRadii(id){return id===0?{x:132,z:108}:{x:34+(id%4)*4,z:30+(id%3)*4};}
function shapeMesh(shape,material,y,depth=0){
  let g;if(depth){g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.8,bevelThickness:.8,curveSegments:12});g.rotateX(-Math.PI/2);}
  else{g=new THREE.ShapeGeometry(shape,12);g.rotateX(-Math.PI/2);}
  const m=new THREE.Mesh(g,material);m.position.set(0,y,25);m.receiveShadow=true;return m;
}
function makeBoat(id){
  const b=BOATS[id],g=new THREE.Group();g.name='Sculpted sailing vessel';
  const hull=mat(b.color,.36),trim=mat(b.stripe,.38,{metalness:.12}),deck=mat(0xf1d8a7,.72),sail=mat(0xf5efdc,.9,{side:THREE.DoubleSide});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),hull);body.scale.set(1.25,.38,2.75);body.position.y=.2;g.add(body);
  const deckMesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),deck);deckMesh.scale.set(.92,.14,2.16);deckMesh.position.set(0,.5,-.05);g.add(deckMesh);
  for(const side of [-1,1]){const rail=new THREE.Mesh(new THREE.TorusGeometry(.72,.055,8,24,Math.PI),trim);rail.rotation.set(Math.PI/2,0,side<0?Math.PI:0);rail.scale.set(1,1.8,1);rail.position.set(side*.88,.65,.18);g.add(rail);}
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,3.8,10),trim);mast.position.set(0,2.1,-.1);g.add(mast);
  const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(0,2.6);sailShape.quadraticCurveTo(1.4,2.25,1.75,.1);sailShape.closePath();const sailMesh=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),sail);sailMesh.position.set(.08,1.3,-.1);sailMesh.rotation.y=.12;g.add(sailMesh);
  const bow=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),trim);bow.scale.set(.7,.45,1.5);bow.position.set(0,.37,-2.35);g.add(bow);
  const lantern=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),mat(0xffd878,.25,{emissive:0xf59b4b,emissiveIntensity:.55}));lantern.position.set(0,.9,1.15);g.add(lantern);
  g.scale.setScalar(b.size);return g;
}
function makeKiosk(kind){
  const [name,accent]=storeInfo[kind],g=new THREE.Group();g.name=name;
  const timber=mat(kind==='bait'?0x9b633a:0x865438,.88),plaster=mat(kind==='market'?0xf0dbb6:0xe7d3ad,.92),roofMat=mat(kind==='port'?0x426c7c:0x36566b,.8),trim=mat(0xf3e5c7,.86),glass=mat(0x8ed8d5,.22,{emissive:0x235c62,emissiveIntensity:.13});
  const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
  box(9.5,.6,8.5,mat(0x77746a),0,.3,0);box(8.4,5.1,7.2,plaster,0,3.05,0);
  // Timber corner posts, lintels and a chunky pitched roof.
  for(const x of [-4.15,4.15])for(const z of [-3.5,3.5])box(.42,5.3,.42,timber,x,3.05,z);
  box(9,.35,.42,timber,0,5.35,-3.7);
  const left=box(5.5,.72,9.2,roofMat,-2.15,6.0,0);left.rotation.z=-.48;
  const right=box(5.5,.72,9.2,roofMat,2.15,6.0,0);right.rotation.z=.48;
  // Front door, glowing windows and striped awning face the village path (-Z).
  box(1.45,2.8,.22,mat(0x65432f),0,1.75,-3.72);box(.18,2.65,.12,mat(0xd3a56d),-.72,1.75,-3.86);box(.18,2.65,.12,mat(0xd3a56d),.72,1.75,-3.86);
  for(const x of [-2.65,2.65]){box(1.65,1.55,.2,timber,x,3.45,-3.72);box(1.35,1.25,.1,glass,x,3.45,-3.84);box(.12,1.4,.1,trim,x,3.45,-3.91);box(1.45,.12,.1,trim,x,3.45,-3.91);}
  box(8,.3,2.3,mat(0x865438),0,4.55,-4.65);
  const awning=accent;for(let n=0;n<8;n++)box(1,.16,2.25,n%2?trim:mat(awning),-3.5+n,4.72,-4.65);
  box(4.8,1.25,.32,mat(0x4a3328),0,7.15,-3.8);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(4.35,.85,.12),new THREE.MeshBasicMaterial({color:accent}));sign.position.set(0,7.15,-3.9);g.add(sign);
  // Simple raised fish glyph on each shop sign, keeping text readable at game scale.
  const fish=new THREE.Mesh(new THREE.SphereGeometry(.38,8,6),mat(0xf8eccd));fish.scale.set(1.45,.52,.22);fish.position.set(0,7.15,-4.02);g.add(fish);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.28,.5,4),mat(0xf8eccd));tail.rotation.z=Math.PI/2;tail.position.set(-.68,7.15,-4.02);g.add(tail);
  for(const x of [-3.8,3.8]){const glow=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),mat(0xffd36c,.3,{emissive:0xffa52e,emissiveIntensity:.7}));glow.position.set(x,4.1,-4.1);g.add(glow);}
  return g;
}
function makePerson(color,role='angler'){
  const g=new THREE.Group(),skin=mat(0xf0c9a4),cloth=mat(color),dark=mat(0x314d54);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.85,4,8),cloth);body.position.y=1.05;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.3,14,12),skin);head.position.y=1.82;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.32,12,8,0,Math.PI*2,0,Math.PI/2),dark);hair.position.y=1.98;g.add(hair);
  if(role==='fisher'){const hat=new THREE.Mesh(new THREE.CylinderGeometry(.34,.31,.12,12),mat(0xe7bd71));hat.position.y=2.13;g.add(hat);}
  const feet=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),dark);feet.scale.set(1,.6,1.4);feet.position.set(0,.12,.1);g.add(feet);return g;
}
function makeCivic(id){
  const g=new THREE.Group(),wood=mat(id==='guild'?0x805039:0x986342,.88),wall=mat(id==='aquarium'?0xc5e5dd:0xf0dfbd,.86),roofMat=mat(id==='guild'?0x426276:0x765347,.84),glass=new THREE.MeshPhysicalMaterial({color:0x87d8d1,transparent:true,opacity:.48,roughness:.16,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
  const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
  box(19,.65,15,mat(0x77736b),0,.32,0);box(17,6.8,13,wall,0,4,0);
  for(const x of [-8.2,8.2])for(const z of [-6.2,6.2])box(.55,7,.55,wood,x,4,z);
  const a=box(10,.9,16,roofMat,-4.1,8.15,0);a.rotation.z=-.5;const b=box(10,.9,16,roofMat,4.1,8.15,0);b.rotation.z=.5;
  box(2,3.5,.3,wood,0,1.8,-6.72);box(1.4,2.9,.1,mat(0x5b3b2d),0,1.75,-6.9);
  for(const x of [-5.8,5.8]){box(2.2,2.1,.25,wood,x,4.4,-6.72);const pane=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.7,.08),id==='aquarium'?glass:mat(0x9bd9d7,.22,{emissive:0x377781,emissiveIntensity:.18}));pane.position.set(x,4.4,-6.9);g.add(pane);box(.14,1.85,.12,mat(0xf1d9ad),x,4.4,-6.99);box(1.9,.14,.12,mat(0xf1d9ad),x,4.4,-6.99);}
  box(6,1.3,.28,wood,0,7.4,-6.8);const sign=new THREE.Mesh(new THREE.BoxGeometry(5.5,.95,.1),new THREE.MeshBasicMaterial({color:id==='guild'?0xe3b766:0x5fb8bb}));sign.position.set(0,7.4,-6.98);g.add(sign);
  if(id==='aquarium'){
    for(const x of [-5,5]){const tank=new THREE.Mesh(new THREE.BoxGeometry(4.2,2.8,1.1),glass);tank.position.set(x,2.4,-7.2);g.add(tank);}
  }
  const porch=box(8,.3,3.2,mat(0xb68453),0,.75,-8.3);porch.receiveShadow=true;
  for(const x of [-3.2,3.2]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,2.4,6),wood);post.position.set(x,1.9,-9.5);g.add(post);}
  return g;
}

export function createWorld(scene){
  const root=new THREE.Group();root.name='New Storybook Archipelago';scene.add(root);
  const colliders=[],islands=[],distantIslands=[],stalls=[],questGivers=[],hubBuildings=[],aquariumTankSlots=[];
  const waterUniforms={uTime:{value:0},uDeep:{value:new THREE.Color(0x083b62)},uLight:{value:new THREE.Color(0x238da0)},uFog:{value:new THREE.Color(0xa8b8cd)}};
  const waterMat=new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,vertexShader:`uniform float uTime; varying vec2 vUv; varying float vWave; void main(){vec3 p=position;float w=sin(p.x*.018+uTime*.48)*1.1+cos(p.z*.021+uTime*.38)*.8;p.y+=w;vWave=w;vUv=p.xz*.012;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uDeep;uniform vec3 uLight;uniform vec3 uFog;uniform float uTime;varying vec2 vUv;varying float vWave;void main(){float tide=.5+.5*sin(vUv.x*7.+vUv.y*5.+uTime*.6+vWave*.18);float glint=smoothstep(.93,.995,sin(vUv.x*47.+vUv.y*29.+uTime*.4));vec3 c=mix(uDeep,uLight,.25+tide*.48)+glint*.16;c=mix(c,uFog,.08+smoothstep(1000.,4000.,length(vUv)*30.)*.2);gl_FragColor=vec4(c,.98);}`});
  const width=SEA_BOUNDS.maxX-SEA_BOUNDS.minX+500,depth=SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ+500,cx=(SEA_BOUNDS.minX+SEA_BOUNDS.maxX)/2,cz=(SEA_BOUNDS.minZ+SEA_BOUNDS.maxZ)/2;
  const water=new THREE.Mesh(new THREE.PlaneGeometry(width,depth,80,80),waterMat);water.rotation.x=-Math.PI/2;water.position.set(cx,-.25,cz);root.add(water);
  const seabed=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),mat(0x123d52));seabed.rotation.x=-Math.PI/2;seabed.position.set(cx,-8,cz);root.add(seabed);
  scene.background=new THREE.Color(0x97a9c8);scene.fog=new THREE.Fog(0x97a9c8,220,2600);
  scene.add(new THREE.HemisphereLight(0xd9fff7,0x41645f,1.65));
  const sun=new THREE.DirectionalLight(0xffd1a0,2.6);sun.position.set(-180,260,120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-230;sun.shadow.camera.right=230;sun.shadow.camera.top=230;sun.shadow.camera.bottom=-230;sun.shadow.bias=-.00025;sun.shadow.radius=4;root.add(sun);
  const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(22,24,16),new THREE.MeshBasicMaterial({color:0xffe9a8,fog:false}));root.add(sunDisc);
  const clouds=[];for(let i=0;i<24;i++){const c=new THREE.Group(),cloudMat=mat(i%4===0?0xf7fff4:0xe5f6f0,.95);for(let j=0;j<4;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),cloudMat);puff.scale.set(6-j*.7,2.3,3.2);puff.position.set((j-1.5)*3,Math.sin(j)*.8,Math.cos(j*2)*1.7);c.add(puff);}root.add(c);clouds.push(c);}
  const radii=ISLANDS.map(i=>islandRadii(i.id));
  const surfaces=ISLANDS.map(islandSurfaces);
  const islandGroups=[];let centralWaterfall=null;
  const nearest=(zone,x,z)=>{const p=worldToIsland(zone,x,z);return {x:p.x,z:p.z};};
  for(const zone of ISLANDS){
    const palette=palettes[zone.theme]||palettes.coast,r=radii[zone.id],group=new THREE.Group();group.name=`${zone.id===0?'Central Isle':zone.name} · rebuilt`;group.position.set(zone.x,0,zone.z);group.rotation.y=zone.layout.yaw;root.add(group);islandGroups.push(group);
    const outer=roundedIslandShape(r.x+7,r.z+7,zone.id+3,1),rock=roundedIslandShape(r.x,r.z,zone.id+3,1),sand=roundedIslandShape(r.x*.985,r.z*.985,zone.id+3,1),grass=roundedIslandShape(r.x*.91,r.z*.91,zone.id+3,1),inner=roundedIslandShape(r.x*.72,r.z*.72,zone.id+3,1);
    group.add(shapeMesh(outer,mat(0xe8f2d8,.9),-.15));group.add(shapeMesh(rock,mat(palette.cliff,.9),-7,7.4));group.add(shapeMesh(sand,mat(palette.sand,.92),.36));group.add(shapeMesh(grass,mat(palette.grass,.93),.67));group.add(shapeMesh(inner,mat(palette.grass,.93),.72));
    const beachRing=new THREE.Mesh(new THREE.TorusGeometry(1,.34,8,64),mat(0xf8eccb,.8));beachRing.scale.set(r.x*.985,1,r.z*.985);beachRing.rotation.x=Math.PI/2;beachRing.position.y=.2;group.add(beachRing);
    if(zone.id===0){const shallows=new THREE.Mesh(new THREE.TorusGeometry(1,2.4,8,64),new THREE.MeshStandardMaterial({color:0x42b9b9,roughness:.28,metalness:.12,transparent:true,opacity:.48,side:THREE.DoubleSide}));shallows.scale.set(r.x+5,1,r.z+5);shallows.rotation.x=Math.PI/2;shallows.position.set(0,-.12,25);group.add(shallows);}
    if(zone.id===0){
      // Central Isle becomes a compact, terraced volcanic/coastal hill rather
      // than a broad flat disc, following the supplied lighthouse-village ref.
      const hill=new THREE.Group();hill.position.set(0,0,57);group.add(hill);
      const tiers=[[40,28,.72,8.2],[32,23,8.45,8],[24,18,16.25,8],[16,13,24.05,8]];
      for(const [rx,rz,y,h] of tiers){
        const rockShape=roundedIslandShape(rx,rz,zone.id+17+y*.1),grassShape=roundedIslandShape(rx*.92,rz*.91,zone.id+27+y*.1);
        hill.add(shapeMesh(rockShape,mat(palette.cliff,.98),y,h));hill.add(shapeMesh(grassShape,mat(palette.grass,.95),y+h-.08));
      }
      const addFir=(x,z,y,s)=>{const tree=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35*s,.55*s,2.1*s,6),mat(0x74513c,.95));trunk.position.y=1*s;tree.add(trunk);for(let k=0;k<3;k++){const cone=new THREE.Mesh(new THREE.ConeGeometry((2.1-k*.38)*s,(3.2-k*.3)*s,7),mat(k===1?0x286b49:0x357b50,.92));cone.position.y=(2.2+k*1.45)*s;tree.add(cone);}tree.position.set(x,y,z);group.add(tree);};
      [[-26,69,9,1.1],[25,70,9,1.0],[-20,91,17,.9],[19,91,17,.95],[-11,75,25,.72],[12,78,25,.75],[-35,53,1,.9],[35,55,1,.9]].forEach(p=>addFir(...p));
      // Cascading turquoise fall and a small pool make the summit read as a
      // real landscape feature at game scale.
      const falls=new THREE.Mesh(new THREE.BoxGeometry(4.8,29,.55),new THREE.MeshStandardMaterial({color:0x5dcde0,roughness:.22,metalness:.08,emissive:0x147487,emissiveIntensity:.18,transparent:true,opacity:.88}));falls.position.set(-10,15.2,49);group.add(falls);centralWaterfall=falls;
      for(const dx of [-1.35,1.35]){const shine=new THREE.Mesh(new THREE.BoxGeometry(.28,25,.62),new THREE.MeshBasicMaterial({color:0xc4f6f4,transparent:true,opacity:.68}));shine.position.set(-10+dx,15.2,48.9);group.add(shine);}
      const pool=new THREE.Mesh(new THREE.CylinderGeometry(9,10,.22,32),new THREE.MeshStandardMaterial({color:0x38bcca,roughness:.24,metalness:.08,emissive:0x124f65,emissiveIntensity:.18}));pool.position.set(-10,.85,48);group.add(pool);
      // Red-and-ivory lighthouse, placed on the upper terrace.
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.7,2.6,12,12),mat(0xf0e3c6,.72));tower.position.set(0,38.2,82);group.add(tower);
      for(let n=0;n<4;n++){const band=new THREE.Mesh(new THREE.CylinderGeometry(2.05-n*.11,2.35-n*.11,1.35,12),mat(n%2?0xf5ebd6:0xb64c42,.68));band.position.set(0,34+n*2.45,82);group.add(band);}
      const lantern=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.05,2.7,12),mat(0xf9bf66,.28,{emissive:0xffaa42,emissiveIntensity:.75}));lantern.position.set(0,45.3,82);group.add(lantern);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(2.9,2.8,12),mat(0x7a4039,.72));roof.position.set(0,48,82);group.add(roof);
      const beacon=new THREE.PointLight(0xffc86b,24,115,2);beacon.position.set(0,45.3,82);group.add(beacon);
    }
    // New organic, theme-specific silhouettes instead of landmark cubes.
    const seed=zone.id*9187+73,random=()=>{let x=Math.sin(seed+random.n++*78.233)*43758.5453;return x-Math.floor(x);};random.n=0;
    const flora=zone.id===0?12:Math.max(5,Math.floor(r.x/5));
    for(let n=0;n<flora;n++){
      const a=random()*Math.PI*2,rad=.55+random()*.31,x=Math.cos(a)*r.x*rad,z=25+Math.sin(a)*r.z*rad;
      if(zone.id===0&&(Math.hypot(x,z-50)<34||((x/43)**2+((z-82)/31)**2<1.25)))continue;
      const plant=new THREE.Group();
      if(['tropical','jungle','forest','swamp','harbor','river'].includes(zone.theme)){
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.4,2.4+random()*1.4,8),mat(zone.theme==='swamp'?0x665749:0x87674e));trunk.position.y=1.2;plant.add(trunk);
        const crowns=zone.theme==='tropical'||zone.theme==='jungle'?4:2;for(let j=0;j<crowns;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),mat(j%2?palette.leaf:palette.accent));leaf.scale.set(1.1,random()*.7+.65,1);leaf.position.set((random()-.5)*1.2,2.5+j*.33,(random()-.5)*.8);plant.add(leaf);}
      }else if(zone.theme==='coral'){
        for(let j=0;j<3;j++){const branch=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.9+random(),5,6),mat(j%2?palette.accent:palette.leaf));branch.position.set((j-1)*.55,.7+j*.35,0);branch.rotation.z=(j-1)*.27;plant.add(branch);}
      }else if(['ice','fjord','celestial','lunar','void'].includes(zone.theme)){
        const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.8+random(),0),mat(palette.accent,.35,{metalness:.12,emissive:palette.accent,emissiveIntensity:.1}));crystal.scale.y=1.8;crystal.position.y=1.1;plant.add(crystal);
      }else{
        const spire=new THREE.Mesh(new THREE.ConeGeometry(.8+random(),2.5+random()*2,8),mat(zone.theme==='volcanic'||zone.theme==='vents'?palette.cliff:palette.accent));spire.position.y=1.4;plant.add(spire);
      }
      plant.position.set(x,.72,z);plant.rotation.y=random()*Math.PI*2;group.add(plant);
    }
    // Lagoon pools and small stylized accents vary by biome, not by the old landmarks.
    if(zone.id!==0){
      const accentGroup=new THREE.Group();
      if(zone.theme==='river'||zone.theme==='ice'||zone.theme==='fjord'){
        const pool=new THREE.Mesh(new THREE.CircleGeometry(r.x*.2,32),new THREE.MeshBasicMaterial({color:0x65d8d3}));pool.rotation.x=-Math.PI/2;pool.position.set(r.x*.35,.82,-r.z*.12);accentGroup.add(pool);
      }
      if(zone.theme==='volcanic'||zone.theme==='vents'){
        const glow=new THREE.Mesh(new THREE.TorusGeometry(r.x*.16,.8,8,40),new THREE.MeshBasicMaterial({color:0xffa36b,emissive:0xf06b36,emissiveIntensity:.8}));glow.position.set(-r.x*.32,.9,-r.z*.12);accentGroup.add(glow);
      }
      if(zone.theme==='lunar'||zone.theme==='celestial'||zone.theme==='void'){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(r.x*.2,.3,8,48),mat(palette.accent,.3,{metalness:.32,emissive:palette.accent,emissiveIntensity:.3}));ring.position.set(0,5,25);accentGroup.add(ring);
      }
      group.add(accentGroup);
    }
    // A continuous, curved boardwalk joins each island to its own berth.
    const dock=dockLocation(zone.id,1),localDock=worldToIsland(zone,dock.x,dock.z),shoreZ=zone.id===0?-81:-15;
    const startV=V(zone.layout.dockX,.78,shoreZ),endV=V(localDock.x,.2,localDock.z),mid=V((startV.x+endV.x)/2,.42,(startV.z+endV.z)/2);
    const path=new THREE.CatmullRomCurve3([startV,mid,endV]);
    if(zone.id===0){
      const timber=mat(0x805638,.88),darkTimber=mat(0x5c412f,.92);
      for(const x of [-2.9,2.9]){const beam=new THREE.Mesh(new THREE.BoxGeometry(.45,.7,28),darkTimber);beam.position.set(x,.05,(shoreZ+localDock.z)/2);group.add(beam);}
      for(let n=0;n<13;n++){const plank=new THREE.Mesh(new THREE.BoxGeometry(6.1,.28,2.02),timber);plank.position.set(0,.32,shoreZ-1.05-n*2.08);group.add(plank);}
      for(let n=0;n<7;n++)for(const x of [-3.25,3.25]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.32,.42,2.6,6),darkTimber);post.position.set(x,-.65,shoreZ-1-n*4.1);group.add(post);}
      const platform=new THREE.Mesh(new THREE.BoxGeometry(15,.42,16),timber);platform.position.set(localDock.x,.35,localDock.z);group.add(platform);
      for(let n=0;n<8;n++){const plank=new THREE.Mesh(new THREE.BoxGeometry(14,.12,1.8),mat(n%2?0x9b704b:0x896141,.9));plank.position.set(localDock.x,.62,localDock.z-6.3+n*1.8);group.add(plank);}
      for(const x of [-6.4,6.4])for(const z of [localDock.z-6.5,localDock.z+6.5]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.32,.45,2.5,6),darkTimber);post.position.set(x,.7,z);group.add(post);}
      for(const x of [-5.2,5.2]){const lampPost=new THREE.Mesh(new THREE.CylinderGeometry(.13,.2,3.8,6),darkTimber);lampPost.position.set(x,2.4,localDock.z);group.add(lampPost);const lamp=new THREE.Mesh(new THREE.BoxGeometry(.7,.85,.7),mat(0xffcb70,.25,{emissive:0xffa233,emissiveIntensity:.8}));lamp.position.set(x,4.55,localDock.z);group.add(lamp);}
    }else{
      const walkway=new THREE.Mesh(new THREE.TubeGeometry(path,20,1.6,8,false),mat(0xd0ad76));group.add(walkway);
      for(let n=0;n<7;n++){const p=path.getPoint(n/6),post=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,.8,8),mat(0x876d51));post.position.set(p.x,.55,p.z);group.add(post);}
    }
    const dockPlatform=zone.id===0?null:new THREE.Mesh(new THREE.CylinderGeometry(4.5,5,.55,32),mat(0x9a7656));if(dockPlatform){dockPlatform.position.set(localDock.x,.18,localDock.z);group.add(dockPlatform);}
    const dockGlow=new THREE.Mesh(new THREE.TorusGeometry(zone.id===0?5.8:3.1,.16,8,32),mat(palette.accent,.34,{emissive:palette.accent,emissiveIntensity:.25}));dockGlow.rotation.x=Math.PI/2;dockGlow.position.set(localDock.x,.58,localDock.z);group.add(dockGlow);
    // Build only services assigned to this territory. Every location uses the new rounded kiosk art.
    const serviceList=islandServices(zone.id),locations=zone.id===0?[
      {kind:'rod',x:-22,z:26},{kind:'line',x:0,z:20},{kind:'bait',x:22,z:26},{kind:'market',x:-22,z:38},{kind:'port',x:22,z:38},
    ]:zone.layout.stalls.filter(s=>serviceList.includes(s.kind)).map(s=>({kind:s.kind,x:s.x*.8,z:25+(s.z-25)*.8}));
    for(const st of locations){const pos=islandToWorld(zone,st.x,st.z),kiosk=makeKiosk(st.kind);kiosk.position.set(st.x,.72,st.z);group.add(kiosk);stalls.push({kind:st.kind,name:storeInfo[st.kind][0],zone:zone.id,x:pos.x,z:pos.z});colliders.push({zone:zone.id,x:pos.x,z:pos.z,r:2.6,top:4.6});}
    if(zone.id===0){
      // Compact village square: stone paving, central fountain, benches and
      // a clear stepped route from the plaza to the lighthouse terrace.
      const plaza=new THREE.Mesh(new THREE.CylinderGeometry(17,17,.28,32),mat(0xc8b88f,.92));plaza.position.set(0,.78,43);group.add(plaza);
      const plazaRing=new THREE.Mesh(new THREE.TorusGeometry(15,.28,8,48),mat(0xe5d7b7,.9));plazaRing.rotation.x=Math.PI/2;plazaRing.position.set(0,.98,43);group.add(plazaRing);
      const fountainBase=new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.8,.8,12),mat(0x777e7b,.85));fountainBase.position.set(-4,1.25,43);group.add(fountainBase);
      const basin=new THREE.Mesh(new THREE.CylinderGeometry(3.8,4.2,.42,16),mat(0x8c9990,.78));basin.position.set(-4,1.86,43);group.add(basin);
      const waterBowl=new THREE.Mesh(new THREE.CylinderGeometry(3.15,3.25,.12,16),new THREE.MeshStandardMaterial({color:0x50c7d6,roughness:.2,metalness:.08,emissive:0x164c56,emissiveIntensity:.2}));waterBowl.position.set(-4,2.12,43);group.add(waterBowl);
      const fountainSpire=new THREE.Mesh(new THREE.ConeGeometry(1.1,3.2,8),mat(0x9da8a0,.82));fountainSpire.position.set(-4,3.7,43);group.add(fountainSpire);
      for(const [x,z,yaw] of [[-12,43,0],[7,53,.15],[12,35,-.2]]){const bench=new THREE.Group();for(const yy of [1.15,1.55]){const plank=new THREE.Mesh(new THREE.BoxGeometry(4,.22,.65),mat(0x815639));plank.position.set(0,yy,0);bench.add(plank);}for(const dx of [-1.55,1.55]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.25,1,.55),mat(0x514234));leg.position.set(dx,.55,0);bench.add(leg);}bench.position.set(x,0,z);bench.rotation.y=yaw;group.add(bench);}
      for(const [x,z] of [[-16,30],[16,31],[-15,55],[15,55]]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,3.2,6),mat(0x69452f));post.position.set(x,2.3,z);group.add(post);const glow=new THREE.Mesh(new THREE.BoxGeometry(.75,.9,.75),mat(0xffc766,.28,{emissive:0xffa02f,emissiveIntensity:.8}));glow.position.set(x,4.15,z);group.add(glow);}
      const pathMat=mat(0xb5a17c,.95);for(let n=0;n<14;n++){const tile=new THREE.Mesh(new THREE.BoxGeometry(3.2,.14,2.4),pathMat);tile.position.set(n<9?-8:2+(n-9)*1.5,.88,-68+n*8.1);tile.rotation.y=n<9?-.08:.18;group.add(tile);}
      const stairMat=mat(0x747873,.94);for(let n=0;n<11;n++){const step=new THREE.Mesh(new THREE.BoxGeometry(4.6,.75,2.6),stairMat);step.position.set(31,1.35+n*1.35,55+n*2);group.add(step);}
      for(let n=0;n<8;n++){const step=new THREE.Mesh(new THREE.BoxGeometry(4.4,.75,2.5),stairMat);step.position.set(31-n*2.75,16.2+n*1.95,77+n*.65);group.add(step);}
      const homes=[{id:'aquarium',name:'Central Isle Aquarium',x:-52,z:78},{id:'warehouse',name:'Angler Warehouse',x:52,z:78},{id:'guild',name:'Anglers Guild',x:0,z:119}];
      for(const h of homes){const building=makeCivic(h.id);building.position.set(h.x,.72,h.z);group.add(building);const entry=islandToWorld(zone,h.x,h.z-13);hubBuildings.push({id:h.id,name:h.name,zone:0,x:entry.x,z:entry.z,center:islandToWorld(zone,h.x,h.z)});colliders.push({zone:0,...islandToWorld(zone,h.x,h.z),r:9.2,top:8.5});}
      for(const tx of [-60,-44,44,60])for(let row=0;row<2;row++)for(let depth=0;depth<2;depth++)for(let col=0;col<3;col++){const pos=islandToWorld(zone,tx+(col-1)*2.15,78+(depth-.5)*4.2);aquariumTankSlots.push({x:pos.x,y:3.5+row*2.1,z:pos.z});}
      const npcList=[
        {id:'old-fisher',name:'Old Fisherman',x:-14,z:43,c:0x71906d},{id:'marine-biologist',name:'Marine Biologist',x:-5,z:43,c:0x62a9b2},{id:'boat-mechanic',name:'Boat Mechanic',x:5,z:43,c:0xc58a5e},{id:'fish-collector',name:'Fish Collector',x:14,z:43,c:0x788baa},
      ];
      for(const n of npcList){const p=islandToWorld(zone,n.x,n.z),person=makePerson(n.c,'fisher');person.position.set(n.x,.72,n.z);group.add(person);questGivers.push({...n,zone:0,x:p.x,z:p.z});}
    }
    if(zone.id===2||zone.id===10){const n=zone.id===2?{id:'island-explorer',name:'Island Explorer',x:-10,z:27,c:0x9c8859}:{id:'mysterious-angler',name:'Mysterious Angler',x:10,z:30,c:0x7e719f};const p=islandToWorld(zone,n.x,n.z),person=makePerson(n.c,'fisher');person.position.set(n.x,.72,n.z);group.add(person);questGivers.push({...n,zone:zone.id,x:p.x,z:p.z});}
    group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  let boat=makeBoat(0),boatId=0;root.add(boat);
  const glints=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,6,5),new THREE.MeshBasicMaterial({color:0xfff0a8}),48);root.add(glints);
  const rain=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:0xd5f7ff,transparent:true,opacity:.48}),160);rain.frustumCulled=false;root.add(rain);
  function setBoat(id){if(id===boatId)return;root.remove(boat);boat.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});boat=makeBoat(id);boatId=id;root.add(boat);}
  function setAuroraPaint(on){if(boat.userData.trim){boat.remove(boat.userData.trim);boat.userData.trim.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}if(on){const glow=new THREE.Mesh(new THREE.TorusGeometry(1.1,.13,8,32),mat(0x9ffff1,.28,{emissive:0x51e8dc,emissiveIntensity:.85}));glow.rotation.x=Math.PI/2;glow.position.y=.7;boat.add(glow);boat.userData.trim=glow;}}
  function dockPoint(zone){const p=dockLocation(zone,BOATS[boatId].size);return new THREE.Vector3(p.x,.2,p.z);}
  function insideIsland(zone,x,z){const p=worldToIsland(zone,x,z),r=radii[zone.id],dz=p.z-25;return (p.x/r.x)**2+(dz/r.z)**2<=1;}
  function surfaceAt(x,z,onlyZone=null){for(const i of ISLANDS){if(onlyZone!==null&&onlyZone!==i.id)continue;if(!insideIsland(i,x,z))continue;if(i.id===0){const p=worldToIsland(i,x,z),q=(p.x/40)**2+((p.z-82)/28)**2;if(q<=.12)return 32;if(q<=.34)return 24.2;if(q<=.63)return 16.4;if(q<=1)return 8.9;}return .95;}return null;}
  const startSpawn=islandSpawn(ISLANDS[0]);
  function groundAt(x,z,zone){if(surfaceAt(x,z,zone)===null)return null;for(const b of colliders)if(b.zone===zone&&Math.hypot(x-b.x,z-b.z)<b.r)return null;if(zone===0&&Math.hypot(x-startSpawn.x,z-startSpawn.z)<24)return 16;return .95;}
  function inWater(p){return p.x>SEA_BOUNDS.minX&&p.x<SEA_BOUNDS.maxX&&p.z>SEA_BOUNDS.minZ&&p.z<SEA_BOUNDS.maxZ&&surfaceAt(p.x,p.z)===null;}
  const temp=new THREE.Color(),scratch=new THREE.Object3D();
  function update(time,dt,zone,camera,aboard,boatPosition=null,weather='clear'){
    waterUniforms.uTime.value=time;sunDisc.position.set(camera.position.x+120,135,camera.position.z-280);
    for(let i=0;i<clouds.length;i++){const c=clouds[i],a=time*.012+i*2.42;c.position.set(camera.position.x+Math.cos(a)*210,65+(i%5)*13,camera.position.z+Math.sin(a)*175);c.rotation.y=-a*.2;}
    const island=ISLANDS[zone],pal=palettes[island.theme]||palettes.coast,wx={storm:0x648e9b,rain:0x6ba3ae,fog:0xa0bbb8,wind:0x69a5ad,heat:0x5fc6b6}[weather]||0x66d3ca;temp.setHex(wx);waterUniforms.uLight.value.lerp(temp,dt*1.2);temp.setHex(island.sky);waterUniforms.uFog.value.lerp(temp,dt*.8);if(centralWaterfall)centralWaterfall.position.y=15.2+Math.sin(time*2.8)*.16;
    islandGroups.forEach((g,n)=>{const c=territoryCenter(ISLANDS[n]),dist=Math.hypot(camera.position.x-c.x,camera.position.z-c.z);g.visible=dist<540;distantIslands[n].visible=!g.visible&&dist<1700;});
    const wind=weather==='storm'?1.6:weather==='wind'?.9:.35;glints.visible=weather!=='fog';for(let i=0;i<glints.count;i++){const a=i*2.399+time*.025,r=55+(i*37%230);scratch.position.set(camera.position.x+Math.cos(a)*r,.2+Math.sin(time*1.5+i)*.18,camera.position.z+Math.sin(a)*r);scratch.scale.setScalar(.6+Math.sin(time+i)*.25);scratch.updateMatrix();glints.setMatrixAt(i,scratch.matrix);}glints.instanceMatrix.needsUpdate=true;
    rain.visible=weather==='rain'||weather==='storm';if(rain.visible)for(let i=0;i<rain.count;i++){scratch.position.set(camera.position.x+Math.sin(i*14)*28+time*wind,camera.position.y+10-(time*8+i*.73)%24,camera.position.z+Math.cos(i*31)*25);scratch.scale.setScalar(1);scratch.updateMatrix();rain.setMatrixAt(i,scratch.matrix);}if(rain.visible)rain.instanceMatrix.needsUpdate=true;
    if(!aboard){const p=boatPosition||dockPoint(zone);boat.position.set(p.x,.2+Math.sin(time*1.3)*.09,p.z);boat.rotation.set(0,p.yaw??ISLANDS[zone].layout.yaw,Math.sin(time)*.025);}
  }
  for(const i of ISLANDS){const g=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat(palettes[i.theme]?.grass||0x74b59f));const r=radii[i.id];g.scale.set(r.x*.86,5,r.z*.86);g.position.set(i.x,.2,i.z+25);root.add(g);distantIslands.push(g);}
  return {root,water,waterUniforms,stalls,questGivers,hubBuildings,aquariumTankSlots,islands:islandGroups,groundAt,surfaceAt,inWater,dockPoint,update,setBoat,setAuroraPaint,cameraBlockers:ISLANDS.map(i=>colliders.filter(b=>b.zone===i.id)),get boat(){return boat;}};
}
