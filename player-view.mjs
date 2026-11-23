// Presentation only: neither camera mode nor a displayed fish changes gameplay
// data. THREE is passed in so the camera/size helpers can be tested without WebGL.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// A low, forward-looking chase view. Look past the bow, not down at the hull.
// Larger canopies get enough clearance; this never changes the fishing camera.
export function boatViewPose({x,z,yaw,size=1,aspect=1.5}){
  const distance=6+size*(7.8+(aspect<1?1.2:0)),ahead=14+size*5;
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
  return {x:x-fx*distance,y:1.4+size*3.4,z:z-fz*distance,
    targetX:x+fx*ahead,targetY:1.7+size*1.2,targetZ:z+fz*ahead};
}

export function heldFishSpan(sp,weight){
  const w=Number.isFinite(Number(weight))?Math.max(0,Number(weight)):0;
  const template=sp.template||sp.id||'';
  const exponent=/eel|serpent|oarfish|needle|gar/.test(template)?.42:/whale|grouper|sunfish|pacu|discus/.test(template)?.28:.34;
  const span=Number.isFinite(sp.displaySpan)?sp.displaySpan:1;
  // Each species owns its maximum length. A tiny cosmic fry is still tiny;
  // a thirty-unit whale remains huge. Heavier specimens of either grow.
  return span*Math.pow(Math.max(.015,w/Math.max(.000001,sp.maxW)),exponent);
}

const dimension = n => Number.isFinite(n) ? Math.max(0, n) : 0;
export function heldFishLayout(size){
  const width=dimension(size.x),height=dimension(size.y),depth=dimension(size.z);
  // Reserve the tiny tail/holding sway as well as the static mesh bounds.
  const centerX=Number.isFinite(size.centerX)?size.centerX:0;
  const halfX=width*.525+Math.abs(centerX)+.02,halfY=height*.525+width*.01+.025,halfZ=depth*.54+.02;
  const lift=width>=1.85||height>=.95?1:0;
  // Use the actual belly contact, not padded fin bounds, to meet the hands.
  // Otherwise a broad-finned giant looks as if it is floating above the angler.
  const gripY=Number.isFinite(size.gripY)?size.gripY:-height/2;
  const gripZ=Number.isFinite(size.gripZ)?size.gripZ:-depth/2;
  return {
    halfX,halfY,halfZ,lift,
    y:lift?2.14-gripY:1.15,
    // Switch cleanly to a trophy hold before a fish obscures the face. Its
    // belly meets the raised hands; the angler remains a clear size reference.
    z:lift?.04-gripZ:-.62,
  };
}

function viewTangents(aspect, fov){
  const a=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const v=Math.tan(clamp(Number.isFinite(fov)?fov:60,10,120)*Math.PI/360);
  return {horizontal:v*a,vertical:v};
}

export function firstPersonFishPose(size,{aspect=1.5,fov=58}={}){
  const {halfX,halfY,halfZ}=heldFishLayout({...size,centerX:0}),tan=viewTangents(aspect,fov);
  // Keep the full-sized mesh: pull its presentation distance back instead of
  // scaling it down on phones. The eye/aim camera itself never moves or zooms.
  const y=-.12;
  const distance=Math.max(1.8,halfZ+Math.max(halfX/(tan.horizontal*.86),(halfY+Math.abs(y))/(tan.vertical*.72)));
  return {x:Number.isFinite(size.centerX)?-size.centerX:0,y,z:-distance,distance};
}

function trophyBounds(fish){
  const p=heldFishLayout(fish);
  return {
    minX:Math.min(-.65,-p.halfX),maxX:Math.max(.65,p.halfX),
    minY:Math.min(-.08,p.y-p.halfY-.02),maxY:Math.max(2.2,p.y+p.halfY+.02),
    minZ:Math.min(-.72,p.z-p.halfZ),maxZ:Math.max(.6,p.z+p.halfZ),
  };
}
function fitRadius(bounds,targetY,angle,tan,minimum){
  const c=Math.cos(angle),s=Math.sin(angle);
  let radius=minimum;
  // Fit all eight corners of the player + fish volume, including depth. Width
  // alone is insufficient for tall fish, flat rays, portrait and tilted views.
  for(const x of [bounds.minX,bounds.maxX])for(const y of [bounds.minY,bounds.maxY])for(const z of [bounds.minZ,bounds.maxZ]){
    const up=(y-targetY)*c+z*s,toward=(y-targetY)*s-z*c;
    radius=Math.max(radius,toward+.25,toward+Math.abs(x)/(tan.horizontal*.84),toward+Math.abs(up)/(tan.vertical*.72));
  }
  return radius;
}

export function frontViewPose({ x, z, ground, yaw, pitch = 0, aspect = 1.5, fov = aspect<1?60:52, fish = null }, blockers = []){
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const portrait = aspect < 1;
  let distance = portrait ? 4.6 : 4.1;
  if(fish){
    const bounds=trophyBounds(fish),tan=viewTangents(aspect,fov);
    const targetY=(bounds.minY+bounds.maxY)/2+(portrait?.12:0);
    const baseAngle=Math.atan(.16-clamp(pitch,-.62,.42)*.15);
    const minimum=distance/Math.cos(baseAngle);
    const fit=angle=>{
      const radius=fitRadius(bounds,targetY,angle,tan,minimum);
      return {distance:radius*Math.cos(angle),height:targetY+radius*Math.sin(angle),radius};
    };
    // A big fish must never force the boom inward through its own model. Where
    // a stall/tree blocks the fitted shot, lift the camera over it instead. Top
    // heights are presentation metadata, independent of movement collisions.
    const clear=p=>blockers.every(b=>{
      const dx=b.x-x,dz=b.z-z,r=b.r+.15;
      const along=dx*fx+dz*fz,side2=dx*dx+dz*dz-along*along;
      if(along+r<=0||side2>=r*r)return true;
      const entry=Math.max(.025,along-Math.sqrt(Math.max(0,r*r-side2)));
      if(entry>=p.distance)return true;
      const top=Number.isFinite(b.top)?b.top:ground+Math.max(3,b.r*3);
      return ground+p.height*entry/p.distance>top+.3;
    });
    let angle=baseAngle,p=fit(angle);
    if(!clear(p)){
      let low=angle,high=Math.PI/2-.0001;
      // Find the lowest unobstructed elevation, rather than jumping to a
      // top-down view or shrinking a giant just because a wall is nearby.
      for(let n=0;n<14;n++){
        const middle=(low+high)/2;
        if(clear(fit(middle)))high=middle;else low=middle;
      }
      angle=high;p=fit(angle);
    }
    return {x:x+fx*p.distance,y:ground+p.height,z:z+fz*p.distance,
      targetX:x,targetY:ground+targetY,targetZ:z,distance:p.distance,zoomDistance:p.radius,elevation:angle};
  }
  // Unchanged idle/fishing view: shorten the boom before nearby solid objects.
  for(const b of blockers){
    const dx = b.x - x, dz = b.z - z;
    const along = dx * fx + dz * fz, perpendicular2 = dx * dx + dz * dz - along * along;
    if(along <= 0 || perpendicular2 >= b.r * b.r) continue;
    const entry = along - Math.sqrt(Math.max(0, b.r * b.r - perpendicular2));
    if(entry >= 0) distance = Math.min(distance, Math.max(0.02, entry - 0.22));
  }
  return {
    x:x + fx * distance, z:z + fz * distance,
    y:ground + 1.85 - clamp(pitch, -0.62, 0.42) * 1.2 + (distance < 1.5 ? 0.65 : 0),
    targetX:x, targetY:ground + (portrait ? 1.2 : 1.02), targetZ:z, distance,
  };
}

export function createPlayerModel(THREE, sourceRod){
  const root=new THREE.Group();root.name='storybook-angler';root.visible=false;
  const palette={skin:0xe5ba91,shirt:0xf0e5cf,vest:0x388c80,seam:0x28675f,trousers:0x3d5668,boots:0x33444a,hat:0xe5bf77,band:0x6c7661,eyes:0x193d45};
  const materials=Object.fromEntries(Object.entries(palette).map(([k,c])=>[k,new THREE.MeshStandardMaterial({color:c,roughness:.82})]));
  const shapes={body:new THREE.CapsuleGeometry(.32,.52,5,10),limb:new THREE.CapsuleGeometry(.105,.28,4,8),head:new THREE.SphereGeometry(.23,16,12),small:new THREE.SphereGeometry(.08,10,8),hat:new THREE.SphereGeometry(.3,12,8,0,Math.PI*2,0,Math.PI/2)};
  function part(parent,name,geometry,color,position,scale=[1,1,1]){const m=new THREE.Mesh(geometry,materials[color]);m.name=name;m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;}
  part(root,'body',shapes.body,'shirt',[0,1.15,0],[1,1.08,.72]);
  part(root,'vest',shapes.body,'vest',[0,1.2,-.145],[1.02,.72,.24]);
  part(root,'vest-seam',new THREE.CylinderGeometry(.018,.018,.45,8),'seam',[0,1.18,-.25]);
  part(root,'waist',new THREE.CylinderGeometry(.21,.25,.16,12),'trousers',[0,.77,0]);
  part(root,'neck',shapes.small,'skin',[0,1.48,0],[1.15,1.1,1.1]);
  part(root,'head',shapes.head,'skin',[0,1.7,0],[1,1.06,.94]);
  part(root,'cap',shapes.hat,'hat',[0,1.94,0],[1.2,.6,1.08]);
  part(root,'cap-band',new THREE.TorusGeometry(.23,.035,6,18),'band',[0,1.88,0],[1,1,.92]);
  part(root,'cap-brim',new THREE.SphereGeometry(.2,12,8),'hat',[0,1.88,-.16],[1.5,.15,.9]);
  for(const side of [-1,1])part(root,'eye',shapes.small,'eyes',[side*.085,1.72,-.209],[.28,.38,.14]);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.name=side<0?'left-arm':'right-arm';arm.position.set(side*.37,1.37,0);root.add(arm);
    part(arm,'sleeve',shapes.limb,'shirt',[0,-.1,0],[1.35,1,.98]);part(arm,'forearm',shapes.limb,'skin',[0,-.37,-.015]);part(arm,side<0?'left-hand':'right-hand',shapes.small,'skin',[0,-.56,-.03],[1.25,1.1,1.2]);arms.push(arm);
    const leg=new THREE.Group();leg.name=side<0?'left-leg':'right-leg';leg.position.set(side*.15,.72,0);root.add(leg);
    part(leg,'trouser-leg',shapes.limb,'trousers',[0,-.25,0],[1.45,1.35,1.15]);part(leg,'boot',shapes.small,'boots',[0,-.59,-.04],[1.45,.7,1.9]);legs.push(leg);
  }
  const fishMount=new THREE.Group();fishMount.name='carried-fish-mount';fishMount.position.set(0,1.15,-.62);root.add(fishMount);
  const rod=sourceRod.clone(true);rod.name='third-person-rod';rod.position.set(.4,.96,-.34);root.add(rod);
  const rodTip=rod.getObjectByName('rod-tip'),rodBend=rod.getObjectByName('rod-bend');
  const pitchRotation=new THREE.Quaternion(),pitchEuler=new THREE.Euler();
  function pose({x,z,ground,yaw,pitch,time,stride,moving,holding,carry,rodRotation,bend}){
    root.position.set(x,ground,z);root.rotation.y=yaw;const walk=moving?Math.sin(stride)*.32:0;
    legs[0].rotation.x=walk;legs[1].rotation.x=-walk;const lift=holding&&carry?carry.lift:0,holdAngle=1.04+(Math.PI-1.04)*lift;
    arms[0].rotation.x=holding?holdAngle:-walk*.65;arms[1].rotation.x=holding?holdAngle:.65;
    for(const arm of arms)arm.position.y=1.37+lift*.09;
    fishMount.position.set(0,(holding&&carry?carry.y:1.15)+Math.sin(time*1.8)*.012,holding&&carry?carry.z:-.62);rod.visible=!holding;
    pitchRotation.setFromEuler(pitchEuler.set(pitch,0,0));rod.quaternion.copy(pitchRotation).multiply(rodRotation);rodBend.rotation.x=bend;
  }
  return {root,arms,legs,fishMount,rod,rodTip,pose};
}
