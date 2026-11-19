import { buildFishVisual, triangulate } from './fish-geometry.mjs?v=40';

// THREE is injected; the authored model/illustration can be audited in Node
// without a browser or external packages. At most six draw calls per fish,
// not one mesh/material per scale, tooth, fin ray or suction cup.
export function createFishModel(THREE,species,scale=1){
  const design=buildFishVisual(species),root=new THREE.Group();
  root.name='fish-'+species.id;
  const groups={},buckets=new Map(),geometries=new Set(),materials=new Set();
  const lit=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.63,metalness:.06,side:THREE.DoubleSide});
  materials.add(lit);
  let luminous=null;
  for(const [name,part] of Object.entries(design.parts)){
    const group=new THREE.Group();group.name='fish-'+name;group.position.set(...part.pivot);root.add(group);groups[name]=group;
  }
  for(const face of design.faces){
    const key=face.part+(face.glow?'-glow':'');
    if(!buckets.has(key))buckets.set(key,{part:face.part,glow:face.glow,positions:[],colors:[]});
    const bucket=buckets.get(key),color=new THREE.Color(face.c),pivot=design.parts[face.part].pivot;
    for(const triangle of triangulate(face.p))for(const i of triangle){
      bucket.positions.push(...face.p[i].map((v,k)=>v-pivot[k]));bucket.colors.push(color.r,color.g,color.b);
    }
  }
  let belly=null,triangles=0;
  for(const [name,bucket] of buckets){
    if(!bucket.positions.length)continue;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(bucket.colors,3));
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
    if(bucket.glow&&!luminous){luminous=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});materials.add(luminous);}
    const mesh=new THREE.Mesh(geometry,bucket.glow?luminous:lit);mesh.name='fish-surface-'+name;
    groups[bucket.part].add(mesh);if(bucket.part==='belly')belly=mesh;
    triangles+=bucket.positions.length/9;
  }
  root.userData={tail:groups.tail,belly,groups,designId:design.id,family:design.family,features:design.features,
    triangles,geometries,materials,gripX:design.gripX,displayRotation:design.displayRotation,disposed:false};
  root.scale.setScalar(scale*species.size);
  return root;
}

export function animateFishModel(model,time,intensity=.22){
  if(!model||model.userData.disposed)return;
  const {groups,family}=model.userData,amount=Math.max(0,Math.min(1,intensity));
  const wave=Math.sin(time*(amount>.5?15:3));
  groups.tail.rotation.set(0,0,0);
  if(family==='whale')groups.tail.rotation.z=wave*amount*.48;
  else groups.tail.rotation.y=wave*amount*(family==='squid'||family==='octopus'?.18:.54);
  for(const [name,side]of [['fin-left',-1],['fin-right',1]])if(groups[name]){
    groups[name].rotation.x=side*Math.sin(time*2.4)*amount*(family==='manta'||family==='ray'?.13:.08);
  }
}

export function disposeFishModel(model){
  if(!model||model.userData.disposed)return;
  // Every GPU resource here is private to this instance. CPU blueprints are
  // cached separately; disposing one catch cannot break another specimen.
  model.userData.geometries?.forEach(g=>g.dispose());
  model.userData.materials?.forEach(m=>m.dispose());
  model.userData.disposed=true;model.removeFromParent();
}
