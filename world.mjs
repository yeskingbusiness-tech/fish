import * as THREE from 'three';
import { ISLANDS, BOATS } from './archipelago.mjs?v=47';
import { SEA_BOUNDS, dockLocation, territoryCenter } from './navigation.mjs?v=45';
import { islandToWorld, worldToIsland, islandSurfaces } from './island-layout.mjs?v=46';
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
function islandRadii(id){return id===0?{x:178,z:146}:{x:42+(id%4)*5,z:37+(id%3)*5};}
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
  const [name,color]=storeInfo[kind],g=new THREE.Group();g.name=name;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.45,.45,24),mat(0xe4d1a8));base.position.y=.35;g.add(base);
  const counter=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2,.28,24),mat(color));counter.position.y=.72;g.add(counter);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,2.4,8),mat(0x735b49));pole.position.set(Math.cos(a)*1.55,1.8,Math.sin(a)*1.55);g.add(pole);}
  const roof=new THREE.Mesh(new THREE.SphereGeometry(2.05,20,12,0,Math.PI*2,0,Math.PI/2),mat(color,.75,{side:THREE.DoubleSide}));roof.scale.y=.65;roof.position.y=3.05;g.add(roof);
  const sign=new THREE.Mesh(new THREE.TorusGeometry(.62,.09,8,20),mat(0xfff0cb));sign.position.set(0,2.05,-1.55);g.add(sign);
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
  const g=new THREE.Group(),stone=mat(0xf0dfbd),trim=mat(0x4a887d),glass=new THREE.MeshPhysicalMaterial({color:0x87d8d1,transparent:true,opacity:.27,roughness:.16,metalness:.08,depthWrite:false,side:THREE.DoubleSide});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(10.5,12,.55,32),stone);base.position.y=.28;g.add(base);
  const room=new THREE.Mesh(new THREE.CylinderGeometry(9.4,10,5.8,32,1,true),id==='aquarium'?glass:mat(0xe6d6b6));room.position.y=3.15;g.add(room);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(11.3,3.4,32),trim);roof.position.y=7.65;g.add(roof);
  const fin=new THREE.Mesh(new THREE.TorusGeometry(5,.22,8,32),mat(id==='aquarium'?0x80d9d0:0xffd075));fin.rotation.x=Math.PI/2;fin.position.y=5.4;g.add(fin);
  if(id==='aquarium'){
    for(const dx of [-8,8]){
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(5.4,5.4,6,24,1,true),glass);tank.position.set(dx,3.4,0);g.add(tank);
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.7,.32,24),mat(0x4aa8a4));foot.position.set(dx,.55,0);g.add(foot);
    }
  }
  const doorway=new THREE.Mesh(new THREE.TorusGeometry(1.55,.18,10,24),mat(id==='guild'?0xffce6f:0x6ebac0));doorway.position.set(0,2.1,9.35);g.add(doorway);
  return g;
}

export function createWorld(scene){
  const root=new THREE.Group();root.name='New Storybook Archipelago';scene.add(root);
  const colliders=[],islands=[],distantIslands=[],stalls=[],questGivers=[],hubBuildings=[],aquariumTankSlots=[];
  const waterUniforms={uTime:{value:0},uDeep:{value:new THREE.Color(0x176d83)},uLight:{value:new THREE.Color(0x66d3ca)},uFog:{value:new THREE.Color(0xb2ddd6)}};
  const waterMat=new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,vertexShader:`uniform float uTime; varying vec2 vUv; varying float vWave; void main(){vec3 p=position;float w=sin(p.x*.018+uTime*.48)*1.1+cos(p.z*.021+uTime*.38)*.8;p.y+=w;vWave=w;vUv=p.xz*.012;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uDeep;uniform vec3 uLight;uniform vec3 uFog;uniform float uTime;varying vec2 vUv;varying float vWave;void main(){float tide=.5+.5*sin(vUv.x*7.+vUv.y*5.+uTime*.6+vWave*.18);float glint=smoothstep(.93,.995,sin(vUv.x*47.+vUv.y*29.+uTime*.4));vec3 c=mix(uDeep,uLight,.25+tide*.48)+glint*.16;c=mix(c,uFog,.08+smoothstep(1000.,4000.,length(vUv)*30.)*.2);gl_FragColor=vec4(c,.98);}`});
  const width=SEA_BOUNDS.maxX-SEA_BOUNDS.minX+500,depth=SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ+500,cx=(SEA_BOUNDS.minX+SEA_BOUNDS.maxX)/2,cz=(SEA_BOUNDS.minZ+SEA_BOUNDS.maxZ)/2;
  const water=new THREE.Mesh(new THREE.PlaneGeometry(width,depth,80,80),waterMat);water.rotation.x=-Math.PI/2;water.position.set(cx,-.25,cz);root.add(water);
  const seabed=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),mat(0x123d52));seabed.rotation.x=-Math.PI/2;seabed.position.set(cx,-8,cz);root.add(seabed);
  scene.background=new THREE.Color(0xb6e1d9);scene.fog=new THREE.Fog(0xb6e1d9,180,2200);
  scene.add(new THREE.HemisphereLight(0xd9fff7,0x41645f,1.65));
  const sun=new THREE.DirectionalLight(0xffe9bf,2.25);sun.position.set(-180,260,120);root.add(sun);
  const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(22,24,16),new THREE.MeshBasicMaterial({color:0xffe9a8,fog:false}));root.add(sunDisc);
  const clouds=[];for(let i=0;i<24;i++){const c=new THREE.Group(),cloudMat=mat(i%4===0?0xf7fff4:0xe5f6f0,.95);for(let j=0;j<4;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),cloudMat);puff.scale.set(6-j*.7,2.3,3.2);puff.position.set((j-1.5)*3,Math.sin(j)*.8,Math.cos(j*2)*1.7);c.add(puff);}root.add(c);clouds.push(c);}
  const radii=ISLANDS.map(i=>islandRadii(i.id));
  const surfaces=ISLANDS.map(islandSurfaces);
  const islandGroups=[];
  const nearest=(zone,x,z)=>{const p=worldToIsland(zone,x,z);return {x:p.x,z:p.z};};
  // Keep the original game systems, but replace the archipelago with one small
  // isolated rock where the player begins.
  const spawn=islandToWorld(ISLANDS[0],ISLANDS[0].layout.dockX,4),rock=new THREE.Group();rock.name='Solitary spawn rock';rock.position.set(spawn.x,0,spawn.z);
  const rockMesh=new THREE.Mesh(new THREE.DodecahedronGeometry(1,2),mat(0x899493,.96,{side:THREE.DoubleSide}));rockMesh.scale.set(26,4.3,21);rockMesh.position.y=0;rockMesh.castShadow=true;rockMesh.receiveShadow=true;rock.add(rockMesh);const outcrop=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:0x778381,side:THREE.DoubleSide}));outcrop.scale.set(9,18,8);outcrop.position.set(0,9,-13);outcrop.castShadow=true;outcrop.receiveShadow=true;rock.add(outcrop);root.add(rock);
  for(const zone of []){
    const palette=palettes[zone.theme]||palettes.coast,r=radii[zone.id],group=new THREE.Group();group.name=`${zone.id===0?'Central Isle':zone.name} · rebuilt`;group.position.set(zone.x,0,zone.z);group.rotation.y=zone.layout.yaw;root.add(group);islandGroups.push(group);
    const outer=roundedIslandShape(r.x+7,r.z+7,zone.id+3,1),rock=roundedIslandShape(r.x,r.z,zone.id+3,1),sand=roundedIslandShape(r.x*.985,r.z*.985,zone.id+3,1),grass=roundedIslandShape(r.x*.91,r.z*.91,zone.id+3,1),inner=roundedIslandShape(r.x*.72,r.z*.72,zone.id+3,1);
    group.add(shapeMesh(outer,mat(0xe8f2d8,.9),-.15));group.add(shapeMesh(rock,mat(palette.cliff,.9),-7,7.4));group.add(shapeMesh(sand,mat(palette.sand,.92),.36));group.add(shapeMesh(grass,mat(palette.grass,.93),.67));group.add(shapeMesh(inner,mat(palette.grass,.93),.72));
    const beachRing=new THREE.Mesh(new THREE.TorusGeometry(1,.34,8,64),mat(0xf8eccb,.8));beachRing.scale.set(r.x*.985,1,r.z*.985);beachRing.rotation.x=Math.PI/2;beachRing.position.y=.2;group.add(beachRing);
    // New organic, theme-specific silhouettes instead of landmark cubes.
    const seed=zone.id*9187+73,random=()=>{let x=Math.sin(seed+random.n++*78.233)*43758.5453;return x-Math.floor(x);};random.n=0;
    const flora=zone.id===0?30:Math.max(8,Math.floor(r.x/3));
    for(let n=0;n<flora;n++){
      const a=random()*Math.PI*2,rad=.55+random()*.31,x=Math.cos(a)*r.x*rad,z=25+Math.sin(a)*r.z*rad;
      if(zone.id===0&&Math.hypot(x,z-50)<34)continue;
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
    const dock=dockLocation(zone.id,1),localDock=worldToIsland(zone,dock.x,dock.z),shoreZ=zone.id===0?-126:-15;
    const startV=V(zone.layout.dockX,.78,shoreZ),endV=V(localDock.x,.2,localDock.z),mid=V((startV.x+endV.x)/2,.42,(startV.z+endV.z)/2);
    const path=new THREE.CatmullRomCurve3([startV,mid,endV]);
    const walkway=new THREE.Mesh(new THREE.TubeGeometry(path,20,zone.id===0?3.2:1.6,8,false),mat(0xd0ad76));group.add(walkway);
    for(let n=0;n<7;n++){const p=path.getPoint(n/6),post=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,.8,8),mat(0x876d51));post.position.set(p.x,.55,p.z);group.add(post);}
    const dockPlatform=new THREE.Mesh(new THREE.CylinderGeometry(zone.id===0?8:4.5,zone.id===0?9:5,.55,32),mat(0x9a7656));dockPlatform.position.set(localDock.x,.18,localDock.z);group.add(dockPlatform);
    const dockGlow=new THREE.Mesh(new THREE.TorusGeometry(zone.id===0?5.8:3.1,.16,8,32),mat(palette.accent,.34,{emissive:palette.accent,emissiveIntensity:.25}));dockGlow.rotation.x=Math.PI/2;dockGlow.position.set(localDock.x,.58,localDock.z);group.add(dockGlow);
    // Build only services assigned to this territory. Every location uses the new rounded kiosk art.
    const serviceList=islandServices(zone.id),locations=zone.id===0?[
      {kind:'rod',x:-22,z:26},{kind:'line',x:0,z:20},{kind:'bait',x:22,z:26},{kind:'market',x:-22,z:51},{kind:'port',x:22,z:51},
    ]:zone.layout.stalls.filter(s=>serviceList.includes(s.kind)).map(s=>({kind:s.kind,x:s.x*.8,z:25+(s.z-25)*.8}));
    for(const st of locations){const pos=islandToWorld(zone,st.x,st.z),kiosk=makeKiosk(st.kind);kiosk.position.set(st.x,.72,st.z);group.add(kiosk);stalls.push({kind:st.kind,name:storeInfo[st.kind][0],zone:zone.id,x:pos.x,z:pos.z});colliders.push({zone:zone.id,x:pos.x,z:pos.z,r:2.6,top:4.6});}
    if(zone.id===0){
      const homes=[{id:'aquarium',name:'Central Isle Aquarium',x:-52,z:78},{id:'warehouse',name:'Angler Warehouse',x:52,z:78},{id:'guild',name:'Anglers Guild',x:0,z:119}];
      for(const h of homes){const building=makeCivic(h.id);building.position.set(h.x,.72,h.z);group.add(building);const entry=islandToWorld(zone,h.x,h.z-13);hubBuildings.push({id:h.id,name:h.name,zone:0,x:entry.x,z:entry.z,center:islandToWorld(zone,h.x,h.z)});colliders.push({zone:0,...islandToWorld(zone,h.x,h.z),r:9.2,top:8.5});}
      for(const tx of [-60,-44,44,60])for(let row=0;row<2;row++)for(let depth=0;depth<2;depth++)for(let col=0;col<3;col++){const pos=islandToWorld(zone,tx+(col-1)*2.15,78+(depth-.5)*4.2);aquariumTankSlots.push({x:pos.x,y:3.5+row*2.1,z:pos.z});}
      const npcList=[
        {id:'old-fisher',name:'Old Fisherman',x:-14,z:43,c:0x71906d},{id:'marine-biologist',name:'Marine Biologist',x:-5,z:43,c:0x62a9b2},{id:'boat-mechanic',name:'Boat Mechanic',x:5,z:43,c:0xc58a5e},{id:'fish-collector',name:'Fish Collector',x:14,z:43,c:0x788baa},
      ];
      for(const n of npcList){const p=islandToWorld(zone,n.x,n.z),person=makePerson(n.c,'fisher');person.position.set(n.x,.72,n.z);group.add(person);questGivers.push({...n,zone:0,x:p.x,z:p.z});}
    }
    if(zone.id===2||zone.id===10){const n=zone.id===2?{id:'island-explorer',name:'Island Explorer',x:-10,z:27,c:0x9c8859}:{id:'mysterious-angler',name:'Mysterious Angler',x:10,z:30,c:0x7e719f};const p=islandToWorld(zone,n.x,n.z),person=makePerson(n.c,'fisher');person.position.set(n.x,.72,n.z);group.add(person);questGivers.push({...n,zone:zone.id,x:p.x,z:p.z});}
  }
  let boat=makeBoat(0),boatId=0;root.add(boat);
  const glints=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,6,5),new THREE.MeshBasicMaterial({color:0xfff0a8}),48);root.add(glints);
  const rain=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:0xd5f7ff,transparent:true,opacity:.48}),160);rain.frustumCulled=false;root.add(rain);
  function setBoat(id){if(id===boatId)return;root.remove(boat);boat.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});boat=makeBoat(id);boatId=id;root.add(boat);}
  function setAuroraPaint(on){if(boat.userData.trim){boat.remove(boat.userData.trim);boat.userData.trim.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}if(on){const glow=new THREE.Mesh(new THREE.TorusGeometry(1.1,.13,8,32),mat(0x9ffff1,.28,{emissive:0x51e8dc,emissiveIntensity:.85}));glow.rotation.x=Math.PI/2;glow.position.y=.7;boat.add(glow);boat.userData.trim=glow;}}
  function dockPoint(zone){const p=dockLocation(zone,BOATS[boatId].size);return new THREE.Vector3(p.x,.2,p.z);}
  function surfaceAt(x,z,onlyZone=null){const dx=(x-spawn.x)/23,dz=(z-spawn.z)/18;return dx*dx+dz*dz<=1?4.3:null;}
  function groundAt(x,z,zone){if(surfaceAt(x,z,zone)===null)return null;for(const b of colliders)if(b.zone===zone&&Math.hypot(x-b.x,z-b.z)<b.r)return null;return .95;}
  function inWater(p){return p.x>SEA_BOUNDS.minX&&p.x<SEA_BOUNDS.maxX&&p.z>SEA_BOUNDS.minZ&&p.z<SEA_BOUNDS.maxZ&&surfaceAt(p.x,p.z)===null;}
  const temp=new THREE.Color();
  function update(time,dt,zone,camera,aboard,boatPosition=null,weather='clear'){
    waterUniforms.uTime.value=time;sunDisc.position.set(camera.position.x+120,135,camera.position.z-280);
    for(let i=0;i<clouds.length;i++){const c=clouds[i],a=time*.012+i*2.42;c.position.set(camera.position.x+Math.cos(a)*210,65+(i%5)*13,camera.position.z+Math.sin(a)*175);c.rotation.y=-a*.2;}
    const island=ISLANDS[zone],pal=palettes[island.theme]||palettes.coast,wx={storm:0x648e9b,rain:0x6ba3ae,fog:0xa0bbb8,wind:0x69a5ad,heat:0x5fc6b6}[weather]||0x66d3ca;temp.setHex(wx);waterUniforms.uLight.value.lerp(temp,dt*1.2);temp.setHex(island.sky);waterUniforms.uFog.value.lerp(temp,dt*.8);
    islandGroups.forEach((g,n)=>{const c=territoryCenter(ISLANDS[n]),dist=Math.hypot(camera.position.x-c.x,camera.position.z-c.z);g.visible=dist<540;distantIslands[n].visible=!g.visible&&dist<1700;});
    const wind=weather==='storm'?1.6:weather==='wind'?.9:.35;glints.visible=weather!=='fog';for(let i=0;i<glints.count;i++){const a=i*2.399+time*.025,r=55+(i*37%230);scratch.position.set(camera.position.x+Math.cos(a)*r,.2+Math.sin(time*1.5+i)*.18,camera.position.z+Math.sin(a)*r);scratch.scale.setScalar(.6+Math.sin(time+i)*.25);scratch.updateMatrix();glints.setMatrixAt(i,scratch.matrix);}glints.instanceMatrix.needsUpdate=true;
    rain.visible=weather==='rain'||weather==='storm';if(rain.visible)for(let i=0;i<rain.count;i++){scratch.position.set(camera.position.x+Math.sin(i*14)*28+time*wind,camera.position.y+10-(time*8+i*.73)%24,camera.position.z+Math.cos(i*31)*25);scratch.scale.setScalar(1);scratch.updateMatrix();rain.setMatrixAt(i,scratch.matrix);}if(rain.visible)rain.instanceMatrix.needsUpdate=true;
    if(!aboard){const p=boatPosition||dockPoint(zone);boat.position.set(p.x,.2+Math.sin(time*1.3)*.09,p.z);boat.rotation.set(0,p.yaw??ISLANDS[zone].layout.yaw,Math.sin(time)*.025);}
  }

  return {root,water,waterUniforms,stalls,questGivers,hubBuildings,aquariumTankSlots,islands:islandGroups,groundAt,surfaceAt,inWater,dockPoint,update,setBoat,setAuroraPaint,cameraBlockers:ISLANDS.map(i=>colliders.filter(b=>b.zone===i.id)),get boat(){return boat;}};
}
