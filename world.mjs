import * as THREE from 'three';
import { exposedCuboidFaces } from './voxel-geometry.mjs?v=44';
import { ISLANDS, BOATS } from './archipelago.mjs?v=44';
import { dockLocation, SEA_BOUNDS, territoryCenter } from './navigation.mjs?v=44';
import { islandToWorld, worldToIsland, islandSurfaces } from './island-layout.mjs?v=44';
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
function coloredMeshBuilder(){const positions=[],colors=[];const tri=(a,b,c,color)=>{const col=new THREE.Color(color);for(const p of [a,b,c]){positions.push(...p);colors.push(col.r,col.g,col.b);}};return {tri,quad:(a,b,c,d,color)=>{tri(a,b,c,color);tri(a,c,d,color);},mesh:(name,material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide}))=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.name=name;return m;}};}
function reedhavenHeight(x,z){
  // A deliberately built-up headland: broad, squared-off cliff benches rather
  // than Gaussian mounds. Narrow bevels keep the silhouette crisp, not rounded.
  const bevel=(d,edge)=>{const t=Math.max(0,Math.min(1,(d-edge)/1.35));return t*t*(3-2*t);};
  const headland=Math.max(bevel(1-Math.max(Math.abs((x+17)/12),Math.abs((z-48)/15)),.03)*5.8,bevel(1-Math.max(Math.abs((x-16)/11),Math.abs((z-50)/14)),.02)*6.6,bevel(1-Math.max(Math.abs(x/19),Math.abs((z-61)/6)),.02)*3.4);
  const lake=Math.exp(-(((x/10)**4)+(((z-49)/6)**4))),village=Math.max(0,Math.min(1,(Math.hypot(x,z-31)-14)/9));
  return .95+headland*(1-.98*lake)+village*(1-lake)*(.10*Math.sin(x*.28+z*.14)+.08*Math.cos(z*.23-x*.17));
}
function reedhavenTerrain(zone){const b=coloredMeshBuilder(),nx=36,nz=28,verts=[];for(let j=0;j<=nz;j++){verts[j]=[];const z=13+j*43/nz;for(let i=0;i<=nx;i++){const x=-27+i*54/nx,y=reedhavenHeight(x,z),c=new THREE.Color(zone.land);if(y>1.08)c.lerp(new THREE.Color(zone.accent),Math.min(.7,(y-1.08)*.6));if(y>1.3)c.lerp(new THREE.Color(zone.rock),Math.min(.7,(y-1.3)*.35));verts[j][i]=[x,y,z,c.getHex()];}}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=verts[j][i],bb=verts[j][i+1],c=verts[j+1][i],d=verts[j+1][i+1];if((i+j)%2){b.tri(a.slice(0,3),bb.slice(0,3),c.slice(0,3),a[3]);b.tri(bb.slice(0,3),d.slice(0,3),c.slice(0,3),bb[3]);}else{b.tri(a.slice(0,3),d.slice(0,3),c.slice(0,3),a[3]);b.tri(a.slice(0,3),bb.slice(0,3),d.slice(0,3),bb[3]);}}
  return b.mesh('reedhaven-triangulated-highland');}
function angularShop(st,zone,b){const x=st.x,z=st.z,y=1,front=z-2.05,back=z+2.05,accent=st.color,wall=0xd8c6a2,stone=0x867965,roof=0x516875,roofLight=0x718d98,glass=0x397d89;
  // A gabled, faceted timber-and-stone shop with a visible service window.
  b.quad([x-2.35,y,front],[x+2.35,y,front],[x+2.35,y+2.35,front],[x-2.35,y+2.35,front],wall);
  b.tri([x-2.35,y+2.35,front],[x+2.35,y+2.35,front],[x,y+3.65,front],accent);
  b.quad([x+2.35,y,back],[x-2.35,y,back],[x-2.35,y+2.35,back],[x+2.35,y+2.35,back],wall);
  b.tri([x+2.35,y+2.35,back],[x-2.35,y+2.35,back],[x,y+3.65,back],wall);
  b.quad([x-2.35,y,front],[x-2.35,y,back],[x-2.35,y+2.35,back],[x-2.35,y+2.35,front],stone);
  b.quad([x+2.35,y,back],[x+2.35,y,front],[x+2.35,y+2.35,front],[x+2.35,y+2.35,back],0x9c8970);
  b.quad([x-2.7,y+2.3,front-.2],[x,y+3.85,front-.2],[x,y+3.85,back+.2],[x-2.7,y+2.3,back+.2],roof);
  b.quad([x,y+3.85,front-.2],[x+2.7,y+2.3,front-.2],[x+2.7,y+2.3,back+.2],[x,y+3.85,back+.2],roofLight);
  // Recessed teal glazing, timber mullions, stone sill and a bright awning.
  b.quad([x-1.05,y+1.25,front-.035],[x+1.05,y+1.25,front-.035],[x+1.05,y+2.05,front-.035],[x-1.05,y+2.05,front-.035],glass);
  for(const dx of [-1.18,0,1.18])b.quad([x+dx-.07,y+1.18,front-.07],[x+dx+.07,y+1.18,front-.07],[x+dx+.07,y+2.12,front-.07],[x+dx-.07,y+2.12,front-.07],0x745b42);
  b.quad([x-1.22,y+1.1,front-.1],[x+1.22,y+1.1,front-.1],[x+1.22,y+1.24,front-.1],[x-1.22,y+1.24,front-.1],0xe0c58f);
  b.quad([x-1.35,y+2.12,front-.15],[x+1.35,y+2.12,front-.15],[x+1.15,y+2.48,front-.45],[x-1.15,y+2.48,front-.45],accent);
  b.quad([x-2.3,y+2.25,front-.12],[x+2.3,y+2.25,front-.12],[x+2.3,y+2.39,front-.12],[x-2.3,y+2.39,front-.12],0xe9d6ad);
  const z0=front-.72;b.quad([x-1.5,y+.18,z0],[x+1.5,y+.18,z0],[x+1.5,y+.65,z0],[x-1.5,y+.65,z0],0x86694a);b.quad([x-1.5,y+.65,z0],[x+1.5,y+.65,z0],[x+1.35,y+.82,z0+.14],[x-1.35,y+.82,z0+.14],0xd1b684);
  b.quad([x-.9,y+2.45,front-.09],[x+.9,y+2.45,front-.09],[x+.9,y+3.12,front-.09],[x-.9,y+3.12,front-.09],0x604a39);
  b.quad([x-.76,y+2.55,front-.12],[x+.76,y+2.55,front-.12],[x+.76,y+3.02,front-.12],[x-.76,y+3.02,front-.12],0xe1cfaa);
  b.quad([x-.58,y+2.63,front-.15],[x+.58,y+2.63,front-.15],[x+.58,y+2.94,front-.15],[x-.58,y+2.94,front-.15],accent);
  return {sign:null,vendor:{x:x+.72,y:y+1.55,z:front-.75,color:accent},goods:[-1,0,1].map((n)=>({x:x+n*.35,y:y+.95,z:z0-.25,color:[0xd3a467,0x76a9ac,0xc77d68][n+1]}))};}
function reedhavenLighthouse(){const b=coloredMeshBuilder(),cx=-22,cz=6,n=8,ring=(y,r)=>Array.from({length:n},(_,i)=>[cx+Math.cos(i*Math.PI*2/n+Math.PI/8)*r,y,cz+Math.sin(i*Math.PI*2/n+Math.PI/8)*r]),frustum=(y0,r0,y1,r1,color)=>{const lo=ring(y0,r0),hi=ring(y1,r1);for(let i=0;i<n;i++)b.quad(lo[i],lo[(i+1)%n],hi[(i+1)%n],hi[i],color);};
  frustum(.9,2.15,12.7,1.05,0xe7dcc4);for(const[y,r,h]of[[2.4,1.82,.42],[8.4,1.17,.45],[12.65,1.4,.32]])frustum(y-h/2,r*.88,y+h/2,r,0xc36d59);
  // Recessed narrow windows follow the eight sharp lighthouse facets.
  for(const y of[4.4,6.1,9.75]){const r=2.15-(y-.9)/11.8*1.1;for(let i=0;i<n;i++){const a=i*Math.PI*2/n+Math.PI/8,rad=r+.012,tx=-Math.sin(a)*.11,tz=Math.cos(a)*.11,x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad;b.quad([x-tx,y-.27,z-tz],[x+tx,y-.27,z+tz],[x+tx,y+.27,z+tz],[x-tx,y+.27,z-tz],0x34535d);}}
  frustum(12.72,1.48,13.08,1.72,0x47616b);frustum(13.08,.92,14.53,.92,0x76aeb2);const low=ring(14.53,.92),peak=[cx,15.55,cz];for(let i=0;i<n;i++)b.tri(low[i],low[(i+1)%n],peak,0xc36d59);
  const oct=[[0,.46,0],[0,-.46,0],...Array.from({length:4},(_,i)=>[Math.cos(i*Math.PI/2)*.32,0,Math.sin(i*Math.PI/2)*.32])];for(let i=0;i<4;i++){const p=oct[i+2],q=oct[(i+1)%4+2];b.tri([cx+oct[0][0],13.8+oct[0][1],cz+oct[0][2]],[cx+p[0],13.8+p[1],cz+p[2]],[cx+q[0],13.8+q[1],cz+q[2]],0xffdc91);b.tri([cx+oct[1][0],13.8+oct[1][1],cz+oct[1][2]],[cx+q[0],13.8+q[1],cz+q[2]],[cx+p[0],13.8+p[1],cz+p[2]],0xe9b85f);}
  const lighthouse=b.mesh('reedhaven-faceted-lighthouse');return lighthouse;}
function reedhavenRidges(zone,forms){const b=coloredMeshBuilder(),outline=[[-.5,-.5],[.3,-.5],[.52,-.18],[.44,.3],[.12,.52],[-.36,.45],[-.54,.08]];for(const f of forms){const rings=[{s:1,y:.8,c:zone.rock},{s:.78,y:.8+f.h*.45,c:zone.rock},{s:.42,y:.8+f.h*.78,c:zone.sand},{s:.13,y:.8+f.h,c:zone.accent}];for(let r=0;r<rings.length-1;r++)for(let i=0;i<outline.length;i++){const p=outline[i],q=outline[(i+1)%outline.length],A=[f.x+p[0]*f.w*rings[r].s,rings[r].y,f.z+p[1]*f.d*rings[r].s],B=[f.x+q[0]*f.w*rings[r].s,rings[r].y,f.z+q[1]*f.d*rings[r].s],C=[f.x+p[0]*f.w*rings[r+1].s,rings[r+1].y,f.z+p[1]*f.d*rings[r+1].s],D=[f.x+q[0]*f.w*rings[r+1].s,rings[r+1].y,f.z+q[1]*f.d*rings[r+1].s];b.quad(A,B,D,C,rings[r].c);}}return b.mesh('reedhaven-angular-rock-strata');}
function reedhavenPath(paving,zone){const b=coloredMeshBuilder(),stones=[0xd2c09b,0xb9aa8c,0xe0cda4,0xc7b48d];paving.forEach((p,i)=>{const j=((i*17)%7)*.035,x=p.x,z=p.z,s=.77,y=reedhavenHeight(x,z)+.075;const pts=[[x-s+j,y,z-s],[x+s,y,z-s+j],[x+s-j,y,z+s],[x-s,y,z+s-j]];b.quad(...pts,stones[i%stones.length]);});return b.mesh('reedhaven-cut-slate-causeway');}
function reedhavenPond(zone){const points=[],b=coloredMeshBuilder(),n=14;for(let i=0;i<n;i++){const a=i*Math.PI*2/n,r=1+Math.sin(i*7.1)*.07;points.push([Math.cos(a)*10.3*r,Math.sin(a)*5.8*r+49]);}for(let i=0;i<n;i++){const [x,z]=points[i],[nx,nz]=points[(i+1)%n],out=[x*1.12,1.02,49+(z-49)*1.12],outN=[nx*1.12,1.02,49+(nz-49)*1.12],inside=[x*.9,1.055,49+(z-49)*.9],insideN=[nx*.9,1.055,49+(nz-49)*.9];b.quad(out,outN,insideN,inside,i%3?zone.sand:0xb6a47f);b.tri([0,1.08,49],inside,insideN,i%2?0x3b9da5:0x347e93);}return b.mesh('reedhaven-lake-and-cut-stone-shore');}
function reedhavenPier(zone){const b=coloredMeshBuilder(),d=zone.layout.dockX,s=zone.layout.berthSide;for(let i=0;i<16;i++){const z=13-i,x=d,w=4.9,h=.28,y=.87;const c=i%2?0xb48b5d:0x9d754f;b.quad([x-w/2,y+h,z-.44],[x+w/2,y+h,z-.44],[x+w/2,y+h,z+.44],[x-w/2,y+h,z+.44],c);b.quad([x-w/2,y,z-.44],[x-w/2,y+h,z-.44],[x-w/2,y+h,z+.44],[x-w/2,y,z+.44],0x71583e);b.quad([x+w/2,y,z+.44],[x+w/2,y+h,z+.44],[x+w/2,y+h,z-.44],[x+w/2,y,z-.44],0x846547);}
  for(let i=0;i<13;i++){const x=d+s*9,z=13-i,w=3.4,c=i%2?0xb48b5d:0x9d754f;b.quad([x-w/2,1.15,z-.44],[x+w/2,1.15,z-.44],[x+w/2,1.15,z+.44],[x-w/2,1.15,z+.44],c);}
  b.quad([d-2.45,1.15,11.2],[d+s*6.2,1.15,11.2],[d+s*6.2,1.15,12],[d-2.45,1.15,12],0x9d754f);
  return b.mesh('reedhaven-timber-pier');}
function islandFoundation(zone){
  // Faceted, rounded shoreline strata replace the giant square base blocks.
  const outline=[[-23,-23],[23,-23],[27,-21],[29,-17],[29,17],[27,21],[23,23],[-23,23],[-27,21],[-29,17],[-29,-17],[-27,-21]],rings=[
    {scale:.78,y:-2.8,color:zone.rock},{scale:.88,y:-1.9,color:zone.rock},{scale:.99,y:-.55,color:zone.sand},{scale:1,y:.35,color:zone.sand},{scale:.94,y:.95,color:zone.land}
  ],positions=[],colors=[],indices=[],color=new THREE.Color();
  for(const ring of rings)for(const [x,z]of outline){positions.push(x*ring.scale,ring.y,z*ring.scale+34);color.setHex(ring.color);colors.push(color.r,color.g,color.b);}
  const n=outline.length;
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n,c=(r+1)*n+i,d=(r+1)*n+(i+1)%n;indices.push(a,c,b,b,c,d);}
  const center=positions.length/3;positions.push(0,.95,34);color.setHex(zone.land);colors.push(color.r,color.g,color.b);const top=(rings.length-1)*n;for(let i=0;i<n;i++)indices.push(center,top+(i+1)%n,top+i);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));mesh.name=`island-${zone.id}-rounded-shore`;return mesh;
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
function boatHull(b){
  const sections=[[-3.85,.12,.1],[-3.2,.72,-.28],[-2.25,1.18,-.48],[.1,1.42,-.56],[1.9,1.28,-.47],[2.8,.78,-.18]],pos=[],colors=[],indices=[],main=new THREE.Color(b.color),dark=main.clone().multiplyScalar(.58),trim=new THREE.Color(b.stripe),ring=[[0,1],[.82,.56],[1,0],[.82,.56],[0,1],[-.82,.56],[-1,0],[-.82,.56]];
  for(const[z,half,bottom]of sections)for(let j=0;j<ring.length;j++){const[xr,yr]=ring[j],top=.78;pos.push(xr*half,bottom+(top-bottom)*yr,z);const col=yr>.95?trim:yr>.5?main:dark;colors.push(col.r,col.g,col.b);}
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<ring.length;j++){const a=i*8+j,bv=i*8+(j+1)%8,c=(i+1)*8+j,d=(i+1)*8+(j+1)%8;indices.push(a,bv,c,bv,d,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const hull=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide}));hull.name='faceted-low-poly-hull';return hull;
}
function boatMesh(id){
  const b=BOATS[id], S=[];
  const add=(w,h,d,x,y,z,c)=>S.push({w,h,d,x,y,z,c});
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
  const g=new THREE.Group();g.name='player-boat';g.add(boatHull(b),mergeBoxes(S));g.scale.setScalar(b.size);return g;
}

export function createWorld(scene){
  const root=new THREE.Group(); scene.add(root);
  const colliders=[], islands=[], distantIslands=[], stalls=[];
  const surfaces=ISLANDS.map(islandSurfaces);
  const waterUniforms={uTime:{value:0},uDeep:{value:new THREE.Color(0x16748b)},uLight:{value:new THREE.Color(0x58bdc4)},uFog:{value:new THREE.Color(0x9bd9ed)}};
  const waterMat=new THREE.ShaderMaterial({
    uniforms:waterUniforms, transparent:true,
    vertexShader:`uniform float uTime; varying vec2 vGrid; varying float vWave; varying float vDepth;
      void main(){ vec3 p=position; float w=sin(p.x*.075+uTime*.42)*.16+cos(p.z*.092+uTime*.34)*.13+sin((p.x+p.z)*.035-uTime*.22)*.07;
      p.y+=w; vWave=w; vGrid=p.xz/7.;
      vec4 mv=modelViewMatrix*vec4(p,1.); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform float uTime; uniform vec3 uDeep; uniform vec3 uLight; uniform vec3 uFog;
      varying vec2 vGrid; varying float vWave; varying float vDepth;
      void main(){ float flow=sin(vGrid.x*.72+uTime*.16)*cos(vGrid.y*.61-uTime*.13);
      float q=smoothstep(-.22,.32,vWave+flow*.08); vec3 c=mix(uDeep,uLight,q);
      float caustic=pow(max(0.,sin(vGrid.x*.47+uTime*.22)*cos(vGrid.y*.39-uTime*.18)),12.);
      c+=vec3(.27,.38,.34)*caustic*.23*(1.-smoothstep(45.,180.,vDepth));
      float sheen=pow(max(0.,sin(vGrid.x*.22+vGrid.y*.19+uTime*.12)),18.);
      c=mix(c,uLight,sheen*.16*(1.-smoothstep(30.,150.,vDepth)));
      c=mix(c,uFog,smoothstep(100.,850.,vDepth)); gl_FragColor=vec4(c,.985); }`
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
  const sun=new THREE.Mesh(new THREE.SphereGeometry(11,16,10),new THREE.MeshBasicMaterial({color:0xfff0c8,fog:false}));sun.position.set(120,120,-250);sun.name='soft-sun-disc';root.add(sun);

  for(const zone of ISLANDS){
    const layout=zone.layout,d=layout.dockX,side=layout.berthSide;
    const stallLayout=layout.stalls.map(st=>({...STORE_DETAILS.find(meta=>meta.kind===st.kind),...st}));
    const localColliders=[];
    const group=new THREE.Group();group.name='island-'+zone.id;group.position.set(zone.x,0,zone.z);group.rotation.y=layout.yaw;root.add(group);
    const S=[],glows=[],smoothTrees=[],reedVillage=zone.id===0?coloredMeshBuilder():null,reedVendors=[],reedGoods=[];
    const glow=(w,h,d,x,y,z,c)=>glows.push({w,h,d,x,y,z,c});
    const add=(w,h,d,x,y,z,c,more={})=>S.push({w,h,d,x,y,z,c,...more});
    const block=(x,z,r,top)=>localColliders.push({zone:zone.id,x,z,r,top});
    const blockRect=(x,z,w,d,top)=>localColliders.push({zone:zone.id,x,z,top,rect:{minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}});
    // Rounded stratified foundations give every island a natural silhouette;
    // the original walkable footprint and collision height remain unchanged.
    if(zone.id===0)group.add(reedhavenRidges(zone,zone.landforms));
    else for(const f of zone.landforms){
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
    // Reedhaven gets individually cut, beveled pier planks; other islands keep their established dock layout.
    if(zone.id===0)group.add(reedhavenPier(zone));
    else for(let i=0;i<16;i++){
      add(4.9,.3,.94,d,1,13-i, i%2 ? 0xba9465 : 0xa68357);
      if(i<13) add(3.4,.3,.94,d+side*9,1,13-i,i%2 ? 0xba9465 : 0xa68357);
    }
    if(zone.id!==0)add(12,.3,2.6,d+side*4.5,1,11.6,0xb38e60);
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
    if(zone.id===0)group.add(reedhavenPath(paving,zone));else for(const {x,z}of paving)add(1.72,.08,1.72,x,1.005,z,zone.sand);
    // Signature plants, using only cuboids. Keep the central village clear.
    function tree(x,z,s=1){
      if(['harbor','forest','river'].includes(zone.theme)){smoothTrees.push({x,z,s});block(x,z,.65*s,(zone.id===0?reedhavenHeight(x,z):.95)+5.2*s);return;}
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
      if(zone.id===0)group.add(reedhavenLighthouse(zone));else{
        for(let j=0;j<5;j++) add(3.6-j*.35,2.2,3.6-j*.35,-22,2+j*2.1,6,j%2?0xc47765:0xf1e5ce);
        add(3.7,.3,3.7,-22,11.8,6,0x3e6874); glow(2.5,1.5,2.5,-22,12.7,6,0xffdb84); add(3.8,.5,3.8,-22,13.6,6,0x3e6874);
        add(.4,2,.4,-22,14.7,6,0x536875); add(2,.8,.12,-21,15.3,6,zone.accent);
      }
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
      // Waterfall sheets separated from the rock face by a visible gap.
      for(let k=0;k<3;k++){glow(1.2,7-k, .24,-24+k*2,6-k,1.05,0x84cdda);add(2.4,.18,1.2,-24+k*2,1.1,0,0xc2e4e4);}
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
    // Stalls, merchandise and friendly cube vendors. Separate stock, no tabs of remote purchases.
    for(const st of stallLayout){
      const x=st.x,z=st.z,base=1;
      const color=zone.theme==='lunar'?0x9f95c0:zone.theme==='volcanic'?0xa88170:st.color;
      if(zone.id===0){const detail=angularShop(st,zone,reedVillage);reedVendors.push(detail.vendor);reedGoods.push(...detail.goods);blockRect(x,z,5.0,4.5,4.5);stalls.push({...st,zone:zone.id,...islandToWorld(zone,x,z),approach:islandToWorld(zone,x,z-3.8),yaw:layout.yaw});continue;}
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
    if(reedVillage){
      group.add(reedVillage.mesh('reedhaven-angular-village'));
      const place=(geo,material,items,position,scale)=>{const inst=new THREE.InstancedMesh(geo,material,items.length),o=new THREE.Object3D();items.forEach((item,i)=>{o.position.set(item.x,item.y,item.z);o.scale.setScalar(scale);o.updateMatrix();inst.setMatrixAt(i,o.matrix);if(item.color)inst.setColorAt(i,new THREE.Color(item.color));});inst.instanceMatrix.needsUpdate=true;group.add(inst);};
      place(new THREE.CylinderGeometry(.26,.4,.9,5),new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,flatShading:true}),reedVendors,v=>v,1);
      const torso=group.children.at(-1);reedVendors.forEach((v,i)=>{const matrix=new THREE.Object3D();matrix.position.set(v.x,v.y,v.z);matrix.updateMatrix();torso.setMatrixAt(i,matrix.matrix);torso.setColorAt(i,new THREE.Color(v.color));});torso.instanceMatrix.needsUpdate=true;
      const heads=reedVendors.map(v=>({...v,y:v.y+.65})),hmat=new THREE.MeshLambertMaterial({color:0xd7a27c});place(new THREE.IcosahedronGeometry(.27,0),hmat,heads,v=>v,.98);
      const goods=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,flatShading:true}),reedGoods.length),o=new THREE.Object3D();reedGoods.forEach((item,i)=>{o.position.set(item.x,item.y,item.z);o.scale.set(.8,1.2,.8);o.updateMatrix();goods.setMatrixAt(i,o.matrix);goods.setColorAt(i,new THREE.Color(item.color));});goods.instanceMatrix.needsUpdate=true;group.add(goods);
    }
    // Keep the harbor marker subordinate to the actual storefronts; a large
    // floating nameplate in the landing sightline overwhelmed the village.
    if(zone.id!==0){add(.16,1.35,.16,d-4.1,1.7,11,0x62716a);group.add(label(zone.name.toUpperCase(),d-4.1,2.55,11,3.1,.42));}
    if(zone.id===0){
      // Reedhaven-only shoreline polish: warm reeds, small flowers and flat lily pads.
      for(const side of [-1,1])for(let patch=0;patch<6;patch++){
        const x=side*(23.7+(patch%2)*1.5),z=18+patch*5.7;
        for(let blade=0;blade<4;blade++){const dx=(blade-1.5)*.25,h=1.25+(blade%3)*.34;add(.12,h,.12,x+dx,.96+h/2,z+(blade%2)*.2,blade%2?0x6f9a58:0x88ad62,{rz:(blade-1.5)*.08});if(blade===1||blade===3)add(.42,.09,.12,x+dx+.18,.96+h*.72,z+(blade%2)*.2,0xa5bd69,{rz:.28});}
        if(patch%2===0){add(.16,.16,.16,x+.45,2.15,z,0xf2d37a);add(.15,.15,.15,x-.4,1.9,z+.4,0xe7a8a0);}
      }
      for(let pad=0;pad<7;pad++){const x=(pad%2?1:-1)*(29.5+(pad%3)*1.1),z=22+pad*4.1;add(1.05,.09,.9,x,.13,z,0x588f72,{ry:pad*.61});add(.18,.16,.18,x,.2,z,0xe8cf80);}
      for(let i=0;i<12;i++){const x=-17+(i%6)*6.5,z=20+Math.floor(i/6)*24;add(.28,.1,.28,x,1.12,z,0xe6b2a1);add(.12,.2,.12,x,1.25,z,0xe9d18b);}
    }
    group.add(islandFoundation(zone));if(zone.id===0){group.add(reedhavenTerrain(zone));group.add(reedhavenPond(zone));}
    group.add(mergeBoxes(S));
    if(smoothTrees.length){
      const trunkGeo=new THREE.BoxGeometry(.58,2.5,.58),trunkMat=new THREE.MeshLambertMaterial({color:0x76583c}),trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,smoothTrees.length),leafGeo=new THREE.BoxGeometry(2.8,2.5,2.8),leafMat=new THREE.MeshLambertMaterial({color:zone.theme==='river'?0x47845e:zone.theme==='forest'?0x397255:0x518b58,flatShading:true}),crowns=new THREE.InstancedMesh(leafGeo,leafMat,smoothTrees.length),dummy=new THREE.Object3D();
      smoothTrees.forEach((t,n)=>{const base=zone.id===0?reedhavenHeight(t.x,t.z):.95;dummy.position.set(t.x,base+1.25*t.s,t.z);dummy.scale.setScalar(t.s);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(n,dummy.matrix);dummy.position.set(t.x,base+(zone.theme==='forest'?3.1:3.25)*t.s,t.z);dummy.scale.set(zone.theme==='forest'?t.s:t.s*1.22,(zone.theme==='forest'?t.s:t.s*.82),zone.theme==='forest'?t.s:t.s*1.16);dummy.rotation.set(0,n*.73,0);dummy.updateMatrix();crowns.setMatrixAt(n,dummy.matrix);crowns.setColorAt(n,new THREE.Color(zone.theme==='forest'?[0x397255,0x447d56,0x32674f][n%3]:[0x4d8d57,0x65a65e,0x579963][n%3]));});trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;group.add(trunks,crowns);
    }
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
      if(matches.length){const y=Math.max(...matches.map(r=>r.height));if(i.id===0&&y===.95&&p.x>=-27&&p.x<=27&&p.z>=13&&p.z<=56)return Math.max(y,reedhavenHeight(p.x,p.z));return y;}
    }
    return null;
  }
  function groundAt(x,z,zone){
    const y=surfaceAt(x,z,zone);
    if(y===null||y>(zone===0?12:1.2))return null;
    for(const b of colliders)if(b.zone===zone&&(b.rect?(x>=b.rect.minX-.28&&x<=b.rect.maxX+.28&&z>=b.rect.minZ-.28&&z<=b.rect.maxZ+.28):Math.hypot(x-b.x,z-b.z)<b.r))return null;
    return y;
  }
  function inWater(p){ return p.x>SEA_BOUNDS.minX&&p.x<SEA_BOUNDS.maxX&&p.z>SEA_BOUNDS.minZ&&p.z<SEA_BOUNDS.maxZ&&surfaceAt(p.x,p.z)===null; }
  const tempColor=new THREE.Color();
  function update(time,dt,zone,camera,aboard,boatPosition=null,weather='clear'){
    const i=ISLANDS[zone];
    waterUniforms.uTime.value=time;
    sky.position.copy(camera.position);
    clouds.position.set(camera.position.x,0,camera.position.z+250);
    sun.position.set(camera.position.x+120,120,camera.position.z-250);
    const weatherWater={storm:0x456779,rain:0x4b8d99,fog:0x7d9a9d,wind:0x547f8a,heat:0x45aaa1};
    const weatherSky={storm:0x59677b,rain:0x6e8790,fog:0xb2c1bd,wind:0x819697,heat:0xd6b78e};
    tempColor.setHex(weatherWater[weather]??i.water);if(weather==='clear'){const vibrant=new THREE.Color(0x48b8e8);tempColor.lerp(vibrant,.24);}waterUniforms.uLight.value.lerp(tempColor,Math.min(1,dt*1.2));
    tempColor.lerp(new THREE.Color(0x17628e),.42);waterUniforms.uDeep.value.lerp(tempColor,Math.min(1,dt*1.2));
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
    tempColor.setHex(i.theme==='lunar'?0xe6deff:0xffefd0);sun.material.color.lerp(tempColor,Math.min(1,dt*1.2));
  }
  return { root,water,waterUniforms,stalls,islands,groundAt,surfaceAt,inWater,dockPoint,update,setBoat,setAuroraPaint,
    cameraBlockers:ISLANDS.map(i=>colliders.filter(b=>b.zone===i.id)),get boat(){return boat;} };
}
