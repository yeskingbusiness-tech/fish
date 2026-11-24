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

  scene.background=new THREE.Color(0xb6e1d9);scene.fog=new THREE.Fog(0xb6e1d9,180,2200);
  scene.add(new THREE.HemisphereLight(0xd9fff7,0x41645f,1.65));
  const sun=new THREE.DirectionalLight(0xffe9bf,2.25);sun.position.set(-180,260,120);root.add(sun);
  const sunDisc=new THREE.Object3D();
  const clouds=[];for(let i=0;i<0;i++){const c=new THREE.Group(),cloudMat=mat(i%4===0?0xf7fff4:0xe5f6f0,.95);for(let j=0;j<4;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),cloudMat);puff.scale.set(6-j*.7,2.3,3.2);puff.position.set((j-1.5)*3,Math.sin(j)*.8,Math.cos(j*2)*1.7);c.add(puff);}root.add(c);clouds.push(c);}
  const radii=ISLANDS.map(i=>islandRadii(i.id));
  const surfaces=ISLANDS.map(islandSurfaces);
  const islandGroups=[];
  const nearest=(zone,x,z)=>{const p=worldToIsland(zone,x,z);return {x:p.x,z:p.z};};
  // Minimal island-only visuals: organic coast silhouettes without buildings,
  // vegetation, NPCs, piers or other structures.
  for(const zone of ISLANDS){
    const palette=palettes[zone.theme]||palettes.coast,r=radii[zone.id];
    const group=new THREE.Group();group.name=`${zone.name} · island`;group.position.set(zone.x,0,zone.z);group.rotation.y=zone.layout.yaw;root.add(group);islandGroups.push(group);
    group.add(shapeMesh(roundedIslandShape(r.x+7,r.z+7,zone.id+3),mat(palette.cliff,.95),-5,5.2));
    group.add(shapeMesh(roundedIslandShape(r.x,r.z,zone.id+5),mat(palette.sand,.92),.25));
    group.add(shapeMesh(roundedIslandShape(r.x*.88,r.z*.88,zone.id+7),mat(palette.grass,.93),.55));
    const far=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat(palette.grass,.95));far.scale.set(r.x*.82,4,r.z*.78);far.position.set(zone.x,.2,zone.z+25);root.add(far);distantIslands.push(far);
  }
  let boat=makeBoat(0),boatId=0;boat.visible=false;root.add(boat);
  const glints=new THREE.Group(),rain=new THREE.Group();root.add(glints,rain);
  function setBoat(id){if(id===boatId)return;root.remove(boat);boat.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});boat=makeBoat(id);boat.visible=false;boatId=id;root.add(boat);}
  function setAuroraPaint(on){if(boat.userData.trim){boat.remove(boat.userData.trim);boat.userData.trim.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}if(on){const glow=new THREE.Mesh(new THREE.TorusGeometry(1.1,.13,8,32),mat(0x9ffff1,.28,{emissive:0x51e8dc,emissiveIntensity:.85}));glow.rotation.x=Math.PI/2;glow.position.y=.7;boat.add(glow);boat.userData.trim=glow;}}
  function dockPoint(zone){const p=dockLocation(zone,BOATS[boatId].size);return new THREE.Vector3(p.x,.2,p.z);}
  function insideIsland(zone,x,z){const p=worldToIsland(zone,x,z),r=radii[zone.id],dz=p.z-25;return (p.x/r.x)**2+(dz/r.z)**2<=1;}
  function surfaceAt(x,z,onlyZone=null){for(const i of ISLANDS){if(onlyZone!==null&&onlyZone!==i.id)continue;if(insideIsland(i,x,z))return .95;}return null;}
  function groundAt(x,z,zone){if(x<=SEA_BOUNDS.minX||x>=SEA_BOUNDS.maxX||z<=SEA_BOUNDS.minZ||z>=SEA_BOUNDS.maxZ)return null;return surfaceAt(x,z,zone)??0;}
  function inWater(p){return p.x>SEA_BOUNDS.minX&&p.x<SEA_BOUNDS.maxX&&p.z>SEA_BOUNDS.minZ&&p.z<SEA_BOUNDS.maxZ&&surfaceAt(p.x,p.z)===null;}
  const temp=new THREE.Color();
  function update(time,dt,zone,camera,aboard,boatPosition=null,weather='clear'){
    waterUniforms.uTime.value=time;sunDisc.position.set(camera.position.x+120,135,camera.position.z-280);
    for(let i=0;i<clouds.length;i++){const c=clouds[i],a=time*.012+i*2.42;c.position.set(camera.position.x+Math.cos(a)*210,65+(i%5)*13,camera.position.z+Math.sin(a)*175);c.rotation.y=-a*.2;}
    const island=ISLANDS[zone],pal=palettes[island.theme]||palettes.coast,wx={storm:0x648e9b,rain:0x6ba3ae,fog:0xa0bbb8,wind:0x69a5ad,heat:0x5fc6b6}[weather]||0x66d3ca;temp.setHex(wx);waterUniforms.uLight.value.lerp(temp,dt*1.2);temp.setHex(island.sky);waterUniforms.uFog.value.lerp(temp,dt*.8);
    islandGroups.forEach((g,n)=>{const c=territoryCenter(ISLANDS[n]),dist=Math.hypot(camera.position.x-c.x,camera.position.z-c.z);g.visible=dist<540;distantIslands[n].visible=!g.visible&&dist<1700;});
    glints.visible=false;rain.visible=false;
    if(!aboard){const p=boatPosition||dockPoint(zone);boat.position.set(p.x,.2+Math.sin(time*1.3)*.09,p.z);boat.rotation.set(0,p.yaw??ISLANDS[zone].layout.yaw,Math.sin(time)*.025);}
  }

  return {root,water,waterUniforms,stalls,questGivers,hubBuildings,aquariumTankSlots,islands:islandGroups,groundAt,surfaceAt,inWater,dockPoint,update,setBoat,setAuroraPaint,cameraBlockers:ISLANDS.map(i=>colliders.filter(b=>b.zone===i.id)),get boat(){return boat;}};
}
