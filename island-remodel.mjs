import * as THREE from 'three';
import { villagePathTiles } from './village-paths.mjs?v=44';

// Freshly authored island art layer. It intentionally owns no gameplay state:
// shops, shoreline queries, collision, travel, boats and fishing remain in world.mjs.
const palettes={forest:0x315b43,river:0x3d754d,swamp:0x536440,tropical:0x438d62,coral:0x4aa087,coast:0x617a70,storm:0x45636c,jungle:0x387448,volcanic:0x68554c,ice:0x7eaaad,fjord:0x6593a2,canyon:0x596a7b,wreck:0x797669,vents:0x625760,lunar:0x706a96,celestial:0x596f9a,void:0x464d66,time:0x817e70,origin:0x718c82,harbor:0x4c8a53};
const wood=0x78563a,trim=0xd4b47c,glass=0x83d5df;
export function terrainHeight(zone,x,z){
 let height=.95;
 for(const [cx,cz,rx,rz,peak] of [[-19,48,12,16,3.8],[19,50,11,15,4.2],[-25,27,5,13,1.8],[25,31,5,12,1.6],[0,58,15,5,2.3]]){
  const f=Math.max(0,1-Math.max(Math.abs((x-cx)/rx),Math.abs((z-cz)/rz)));
  height=Math.max(height,.95+Math.floor(f*6)*peak/6);
 }
 // Keep shop floors, plaza routes and the landing pier level and predictable.
 let plaza=0;for(const st of zone.layout.stalls){const d=Math.hypot(x-st.x,(z-st.z)*.9);plaza=Math.max(plaza,Math.max(0,1-d/9));}
 const path=Math.max(0,1-Math.abs(x-zone.layout.dockX)/5)*Math.max(0,1-(56-z)/15);
 const backland=Math.max(0,Math.min(1,(z-43)/8));return .95+(height-.95)*backland*(1-Math.max(plaza,path));
}
function terrainMesh(zone){const b=new THREE.BufferGeometry(),pos=[],cols=[],ids=[],land=new THREE.Color(zone.land),rock=new THREE.Color(zone.rock),sand=new THREE.Color(zone.sand),nx=38,nz=31;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=-27+54*i/nx,z=13+43*j/nz,y=terrainHeight(zone,x,z),edge=Math.max(Math.abs(x)/27,Math.abs((z-34)/22)),c=(edge>.91?sand:land).clone();if(y>1.35)c.lerp(rock,Math.min(.76,(y-1.35)/3.2));const patch=.035*Math.sin(x*.8+z*.3);c.offsetHSL(0,0,patch);pos.push(x,y+.015,z);cols.push(c.r,c.g,c.b);}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,d=a+nx+1;ids.push(a,a+1,d,a+1,d+1,d);}
 b.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));b.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));b.setIndex(ids);b.computeVertexNormals();const m=new THREE.Mesh(b,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide}));m.name='sculpted-stepped-island-terrain';return m;
}
function instanceBoxes(specs){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),specs.length),o=new THREE.Object3D();for(let i=0;i<specs.length;i++){const p=specs[i];o.position.set(p.x,p.y,p.z);o.rotation.set(p.rx||0,p.ry||0,p.rz||0);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(p.c));}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;return mesh;}
function feature(s,theme,box){const stone=s.rock,accent=s.accent,land=s.land;const tower=(x,z,h,color=stone)=>{box(7,h*.55,7,x,.95+h*.275,z,color);box(5.6,h*.35,5.6,x,.95+h*.72,z,land);box(3.8,1.8,3.8,x,.95+h+.9,z,accent);};
 switch(theme){
 case'harbor':tower(-22,6,11,stone);box(4,.6,4,-22,13,6,wood);box(2.6,2,2.6,-22,14.1,6,0x75bdca);box(3,1.4,3,-22,15.8,6,accent);break;
 case'forest':tower(-22,7,8,stone);box(8,.7,8,-22,9.4,7,0x456c50);box(1,.5,1,-18,5,5,trim);box(1,.5,1,-26,5,5,trim);break;
 case'river':tower(-22,6,10,stone);for(let k=0;k<3;k++){box(1.7,7-k,1,-25+k*2,5-k*.5,1,0x72c5d1);box(4,.4,2,-24+k*2,1,0,0xc8e3d5);}box(12,1,2,-18,11,6,trim);break;
 case'swamp':for(let k=0;k<5;k++){const x=-27+k*2.5,h=7+(k%3)*2;box(1.4,h,1.4,x,h/2+1,6,stone);box(2.5,.8,2.5,x,h+1.2,6,land);box(.22,3,.22,x+.8,h+2.8,5,accent);}box(10,1.2,7,-22,12,6,0x536440);break;
 case'tropical':box(3,8,3,-26,4.9,6,0xd4b783);box(3,8,3,-17,4.9,6,0xd4b783);box(12,2,4,-21.5,9.6,6,0xe5c990);box(10,.8,4,-21.5,11,6,accent);break;
 case'coral':for(let k=0;k<7;k++){const x=-27+k*1.7,h=4+k%3*2;box(1.4,h,1.5,x,h/2+1,6,[0xdc9eaa,0x7ec6b6,0xe8c58b][k%3]);box(2.3,.7,2,x+.35,h+1,6,[0xf0b8ad,0x89cfc1,0xf0d79f][k%3]);}break;
 case'coast':for(const z of [1,10]){box(4,10,4,-22,5.9,z,stone);box(3,3,3,-22,12.4,z,land);}box(4,2.5,13,-22,14,6,stone);break;
 case'storm':tower(-22,6,16,stone);for(const y of [9,13,17]){box(8,.6,1,-22,y,6,trim);box(.8,.8,.8,-18,y,6,0xc8f0fa);}break;
 case'jungle':for(let k=0;k<5;k++)box(12-k*1.7,1.8,10-k*1.2,-22,1.9+k*1.8,6,k%2?stone:land);box(4,4,4,-22,12,6,wood);box(13,.8,4,-22,15,6,accent);break;
 case'volcanic':for(let k=0;k<6;k++)box(11-k*1.5,2,10-k*1.3,-22,1.8+k*1.8,6,k%2?0x4e4d5c:stone);for(let k=0;k<5;k++)box(.6,2,.6,-24+k*1.1,2+k*1.2,1+k*.65,0xffa163);box(4,.6,4,-22,12,6,0xffbd72);break;
 case'ice':tower(-22,6,11,0x8dbec8);box(5,4,5,-22,13,6,0x719aa8);box(6,.8,6,-22,15,6,0xe5f8f4);break;
 case'fjord':for(const z of [1,11])for(let k=0;k<4;k++)box(10-k*1.8,3.2,4,-22,2.5+k*3.1,z,k%2?0x9bd1df:0x78afc2);break;
 case'canyon':for(let k=0;k<6;k++){const x=-28+(k%3)*5,z=k<3?2:11,h=9+k%3*3;box(3,h,3,x,h/2+1,z,stone);box(2,2,2,x,h+2,z,accent);}break;
 case'wreck':box(5,2,15,-22,2,6,wood);for(let k=0;k<5;k++)for(const side of [-1,1]){box(.7,6,.7,-22+side*3.2,5,1+k*2.3,0xd3cbb1);box(2.5,.7,.7,-22+side*2.4,8,1+k*2.3,0xe1d7bc);}box(.5,10,.5,-22,8,7,wood);break;
 case'vents':for(let k=0;k<5;k++){const x=-27+k*2.5,h=6+k%3*2;box(2,h,2,x,h/2+1,6,stone);box(2.6,.5,2.6,x,h+1,6,trim);box(.8,2,.8,x,h+2.2,6,0x77737b);}break;
 case'lunar':case'void':case'celestial':{const c=theme==='lunar'?0xaaa5d4:theme==='void'?0x777d9b:0xa9c6e6;for(const x of [-28,-16]){box(2,10,2,x,6,6,stone);box(2.8,.9,2.8,x,11,6,accent);}box(2,11,2,-22,6,6,c);box(14,1.2,1,-22,11,6,c);box(1.2,13,1,-15,6,6,c);break;}
 case'time':for(let k=0;k<5;k++)box(12-k*2,1.4,6,-22,1.7+k*2,6,k%2?stone:land);box(3,1,3,-22,13,6,accent);break;
 case'origin':for(let k=0;k<4;k++)box(16-k*3,1.2,12-k*2,-22,1.6+k*1.25,6,k===3?0x76c8b8:0xd8dfcf);box(5,.6,4,-22,7,6,0x74d8cf);break;
 }
}
export function remodelIsland(zone,layout,shops,group,label){
 const parts=[],distant=[];const box=(w,h,d,x,y,z,c,rotation=0,axis='y')=>{const q={w,h,d,x,y,z,c};if(rotation)q[`r${axis}`]=rotation;parts.push(q);};
 // A broad, cut-stone plinth with an alternating stepped sand/rock waterline.
 box(60,2.1,48,0,-.5,34,zone.rock);box(58,.7,46,0,.60,34,zone.sand);box(55,.9,43,0,.50,34,zone.land);
 for(let i=0;i<20;i++){const x=-27+i*2.85,z=11+(i%3)*.6,w=2.7;box(w,.16,1.1,x,.72,z,i%2?zone.sand:0xd9c49a);box(w,.14,1.1,x,.72,57-(i%3)*.55,i%2?zone.sand:0xd9c49a);}
 // Tall, broken-back terraces frame the village instead of leaving a flat horizon.
 for(let k=0;k<4;k++){const w=42-k*7,h=2.5+(k%2)*.7,z=61+k*2;box(w,h,9-k,0,.95+h/2+k*1.5,z,k%2?zone.rock:zone.land);box(w*.88,.5,8-k,0,.95+h+k*1.5,z,zone.land);}
 for(let k=0;k<3;k++){const x=-22+k*22,h=4+(k%2)*2;box(8+k*2,h,8,x,.95+h/2,58+k%2*3,zone.rock);box(7+k*2,.5,7,x,.95+h,58+k%2*3,zone.land);}
 // Open stone promenade from the dock into the shop square.
 const pathTiles=villagePathTiles(layout);for(const p of pathTiles)box(1.68,.11,1.68,p.x,1.06,p.z,((Math.round(p.x+p.z))%3===0)?0xd9c9a4:0xc3b697);
 // Custom boardwalk, with readable cross-planks, fenders and mooring posts.
 const {dockX:d,berthSide:s}=layout;for(let i=0;i<16;i++){const z=13-i;box(4.9,.24,.82,d,1.02,z,i%2?0xb78b58:0xa97c4d);if(i%2===0)box(5,.07,.09,d,1.17,z-.36,0xd2ae77);if(i<13){box(3.4,.24,.82,d+s*9,1.02,z,i%2?0xb78b58:0xa97c4d);}}
 for(const x of [d-2.25,d+2.25,d+s*7.5,d+s*10.5])for(let z=0;z<=12;z+=4){box(.28,1.65,.28,x,.45,z,wood);box(.48,.25,.48,x,1.32,z,trim);}
 // Rebuilt storefronts: timber-framed cube pavilions, inviting windows, awnings, stock.
 for(const st of shops){const x=st.x,z=st.z,c=st.color,front=z-2.25;
  box(6,.32,5.2,x,1.08,z,0x8a765d);
  // Open timber frame: the façade is built around real window and door gaps,
  // with side/rear infill panels instead of one opaque wall-cube.
  box(.2,2.65,4.8,x-2.72,2.45,z,0xd8c7a8);box(.2,2.65,4.8,x+2.72,2.45,z,0xd8c7a8);box(5.3,2.55,.18,x,2.4,z+2.33,0xd8c7a8);
  box(1.05,2.45,.16,x-2.05,2.38,front,0xe1d1b3);box(.72,2.45,.16,x+2.27,2.38,front,0xe1d1b3);box(2.6,.62,.16,x+.68,3.43,front,0xe1d1b3);
  box(5.95,.28,5.1,x,3.83,z,wood);
  box(3.45,.24,5.9,x-1.55,4.38,z,zone.rock,-.31,'z');box(3.45,.24,5.9,x+1.55,4.38,z,zone.rock,.31,'z');box(.28,.22,5.8,x,5.03,z,wood);
  box(5.4,.16,.24,x,3.98,front-.12,wood);
  // Front timber posts, display window, door, sill, and a deep striped canopy.
  for(const dx of [-2.55,2.55]){box(.2,3.1,.2,x+dx,2.55,front,wood);box(.35,.22,.35,x+dx,4.05,front,trim);box(.14,1.9,.15,x+dx*.68,2.15,front-.08,trim);}
  box(5.5,.48,.18,x,1.35,front-.09,zone.rock);box(5.5,.12,.2,x,1.62,front-.1,trim);box(5.5,.16,.2,x,3.92,front-.1,wood);
  box(2.4,1.2,.16,x-.4,2.72,front-.05,glass);box(.12,1.2,.2,x-.4,2.72,front-.15,wood);box(2.5,.2,.3,x-.4,2.05,front-.08,trim);
  box(1.05,2,.18,x+1.75,2.15,front-.04,0x76553b);box(.18,.18,.12,x+1.5,2.1,front-.16,0xe7c879);
  box(3.1,.36,1.1,x-.25,3.65,front-.42,c);for(let stripe=0;stripe<5;stripe++)box(.12,.38,1.12,x-1.7+stripe*.72,3.65,front-.43,stripe%2?0xf4e2bd:zone.accent);
  box(2.8,.16,.25,x-.2,1.35,front-.5,wood);box(.2,.8,.2,x-.2,1.75,front-.5,trim);
  // A compact framed sign on the fascia (not a giant billboard).
  box(2.6,.55,.18,x,3.3,front-.12,wood);
  box(2.3,.34,.06,x,3.3,front-.23,c);
  box(.6,.12,.08,x,3.3,front-.28,0xffedce);
  // Color-coded goods and an angular clerk silhouette.
  for(let j=0;j<3;j++){box(.42,.38,.42,x-1.1+j*.65,1.65,front-.7,[0xd7a667,0x83c7c7,0xd18c77][j]);box(.5,.1,.5,x-1.1+j*.65,1.44,front-.7,trim);}
  const vx=x+1.72,vz=front-.72,skin=[0xd8a77f,0x9c654a,0xe2ba91,0xb98262][Math.abs(Math.round(x+z))%4];
  box(.34,.72,.34,vx-.14,.62,vz,0x473b35);box(.34,.72,.34,vx+.2,.62,vz,0x473b35);
  box(.32,.5,.34,vx-.14,1.16,vz,c);box(.32,.5,.34,vx+.2,1.16,vz,c);
  box(.7,.92,.46,vx,1.9,vz,c);box(.55,.52,.48,vx,2.57,vz,skin);box(.2,.18,.14,vx-.14,2.62,vz-.25,0x28383b);box(.2,.18,.14,vx+.14,2.62,vz-.25,0x28383b);
  box(.64,.2,.56,vx,2.9,vz,wood);box(.76,.14,.65,vx,2.99,vz,c); // hair and shop cap
  box(.14,.68,.35,vx-.45,1.94,vz,c);box(.14,.68,.35,vx+.45,1.94,vz,c);box(.22,.2,.22,vx-.48,1.55,vz-.04,skin);box(.22,.2,.22,vx+.48,1.55,vz-.04,skin);
  box(.34,.4,.09,vx,1.94,vz-.28,trim);box(.12,.12,.1,vx,2.04,vz-.34,c);box(.12,.14,.12,vx,2.53,vz-.39,skin);box(.1,.1,.06,vx-.19,2.77,vz-.25,wood);box(.1,.1,.06,vx+.19,2.77,vz-.25,wood);box(.32,.1,.08,vx,2.36,vz-.26,0x754c42);box(.24,.16,.1,vx-.32,2.82,vz-.14,skin);box(.24,.16,.1,vx+.32,2.82,vz-.14,skin);box(.46,.58,.12,vx,1.68,vz-.27,zone.accent);
  group.add(label(st.banner,x,3.3,front-.34,2.22,.31,'#fff0d4'));
 }
 // Landmark signatures: recognizable silhouettes, rebuilt in the same cube vocabulary.
 feature(zone,zone.theme,box);
 // Cube-canopy groves, varied in size and color, with clear plaza sightlines.
 const treeList=[...layout.trees];for(let i=0;i<9;i++){const side=i%2?1:-1;treeList.push({x:side*(25+(i%3)*1.5),z:20+Math.floor(i/2)*7,size:.82+(i%4)*.12});}
 for(let i=0;i<treeList.length;i++){const t=treeList[i],x=t.x,z=t.z,sc=t.size,base=terrainHeight(zone,x,z);box(.62*sc,2.6*sc,.62*sc,x,base+1.3*sc,z,wood);box(3.15*sc,2.05*sc,3.15*sc,x,base+4.05*sc,z,[palettes[zone.theme]||0x4b8052,zone.land][i%2]);box(2.45*sc,1.8*sc,2.45*sc,x+.22*sc,base+5.72*sc,z-.12*sc,0x508a54);if(i%3===0)box(1.55*sc,1.5*sc,1.55*sc,x-.78*sc,base+5.05*sc,z+.65*sc,zone.land);}
 // Island-specific low plants and crystals mark margins without cluttering routes.
 let seed=0x451+zone.id*991;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<118;i++){const x=-25+rand()*50,z=16+rand()*40;if(shops.some(st=>Math.hypot(st.x-x,st.z-z)<5)||pathTiles.some(p=>Math.hypot(p.x-x,p.z-z)<2.1))continue;const base=terrainHeight(zone,x,z),h=.22+rand()*.62,color=zone.theme==='ice'?0xc9e8e9:zone.theme==='coral'?0xe2a5a8:zone.theme==='swamp'?0x8d9a65:zone.accent;if(i%4===0){const w=.48+rand()*.45;box(w,.34+rand()*.35,w*.8,x,base+.16+h*.4,z,zone.theme==='volcanic'?0x655964:zone.rock);if(i%8===0)box(w*.48,.22,w*.55,x+.28,base+.42+h*.4,z+.16,zone.accent);}else{box(.18,h,.18,x,base+h/2+.02,z,color);if(i%3===0){box(.45,.12,.45,x,base+h+.02,z,zone.theme==='volcanic'?0xf1a46a:zone.theme==='lunar'?0xd8c9ff:0xe7d28e);box(.14,.18,.14,x+.19,base+h+.11,z,0xfff0c1);}}}
 // Furnish the village square with benches and warm, sheltered lanterns.
 for(const p of layout.lamps){box(.2,2.8,.2,p.x,2.2,p.z,wood);box(.8,.75,.8,p.x,3.85,p.z,0x495e61);box(.48,.42,.48,p.x,3.86,p.z,0xffd98b);box(.7,.12,.7,p.x,4.3,p.z,trim);}
 const b=instanceBoxes(parts);b.name=`remodeled-island-${zone.id}`;group.add(b);group.add(terrainMesh(zone));
 // Distant LOD is a compact skyline of the rebuilt terrain and signature landmark.
 for(const p of parts)if(p.w>=8||p.h>=5)distant.push(p);
 return {distant:instanceBoxes(distant)};
}
